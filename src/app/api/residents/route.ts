import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/residents
 * 
 * Endpoint untuk mendapatkan daftar warga berdasarkan organisasi
 * 
 * Query Parameters:
 * - organization_id: ID organisasi (wajib)
 * - rt_number: nomor RT (optional)
 * - rw_number: nomor RW (optional)
 * - search: pencarian nama (optional)
 * - role: filter berdasarkan role (optional) - "warga", "ketua_rt"
 * - currentUserRole: role user yang request (untuk validasi)
 * - currentUserRt: RT user yang request (untuk validasi)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rtNumber = searchParams.get('rt_number')
    const rwNumber = searchParams.get('rw_number')
    let organizationId = searchParams.get('organization_id')
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    
    // Untuk validasi akses
    const currentUserRole = searchParams.get('currentUserRole')
    const currentUserRt = searchParams.get('currentUserRt')

    // 🔥 PERUBAHAN 1: Validasi organization_id WAJIB
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Parameter organization_id wajib diisi' },
        { status: 400 }
      )
    }

    // 🔥 PERUBAHAN 2: Jika tidak ada rt_number, ambil semua warga di organisasi
    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        nama_lengkap,
        role,
        rt_number,
        rw_number,
        rumah_id,
        created_at,
        families!left(
          id,
          user_id,
          nama_kk,
          jenis_kelamin,
          agama,
          pekerjaan,
          members
        )
      `)
      .eq('organization_id', organizationId)
      .in('role', ['warga', 'ketua_rt'])
      .order('nama_lengkap', { ascending: true })

    // 🔥 PERUBAHAN 3: Filter RT hanya jika ada
    if (rtNumber) {
      // Validasi akses untuk ketua RT
      if (currentUserRole === 'ketua_rt' && currentUserRt !== rtNumber) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses untuk melihat warga RT lain' },
          { status: 403 }
        )
      }
      query = query.eq('rt_number', rtNumber)
    }

    // Filter RW jika diberikan
    if (rwNumber) {
      query = query.eq('rw_number', rwNumber)
    }

    // Filter role jika diberikan
    if (role) {
      query = query.eq('role', role)
    }

    // Search nama atau username
    if (search) {
      query = query.or(
        `nama_lengkap.ilike.%${search}%,username.ilike.%${search}%`
      )
    }

    const { data: residents, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil data warga: ' + error.message },
        { status: 500 }
      )
    }

    // Format response
    const formattedData = residents.map((resident: any) => ({
      id: resident.id,
      username: resident.username,
      namaLengkap: resident.nama_lengkap,
      role: resident.role,
      rtNumber: resident.rt_number,
      rwNumber: resident.rw_number,
      rumahId: resident.rumah_id,
      familyData: resident.families?.[0] || null,
      createdAt: resident.created_at,
    }))

    return NextResponse.json({
      success: true,
      count: formattedData.length,
      data: formattedData,
      filter: {
        organizationId,
        rtNumber: rtNumber || 'semua RT',
        rwNumber: rwNumber || null,
        search: search || null,
        role: role || null,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server yang tidak terduga' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/residents
 * 
 * Endpoint untuk menambah warga baru
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      username,
      password,
      namaLengkap,
      role,
      rtNumber,
      rwNumber,
      rumahId,
      organizationId,
    } = body

    // Validasi input
    if (!username || !password || !namaLengkap) {
      return NextResponse.json(
        { error: 'Username, password, dan nama lengkap wajib diisi' },
        { status: 400 }
      )
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Role wajib diisi' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi role tertentu
    if ((role === 'ketua_rt' || role === 'warga') && !rtNumber) {
      return NextResponse.json(
        { error: `${role === 'ketua_rt' ? 'Ketua RT' : 'Warga'} harus memiliki nomor RT` },
        { status: 400 }
      )
    }

    // Cek username duplikat
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('organization_id', organizationId)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username sudah digunakan di organisasi ini' },
        { status: 409 }
      )
    }

    // Cek rumah jika ada
    let houseId = null
    if (rumahId) {
      const { data: houseExists } = await supabase
        .from('houses')
        .select('id')
        .eq('organization_id', organizationId)
        .or(`id.eq.${rumahId},nomor_rumah.eq.${rumahId}`)
        .single()

      if (!houseExists) {
        return NextResponse.json(
          { error: 'Rumah tidak ditemukan' },
          { status: 404 }
        )
      }
      houseId = houseExists.id
    }

    // Cek ketua RT duplikat dalam RT yang sama
    if (role === 'ketua_rt') {
      const { data: existingKetuaRt } = await supabase
        .from('users')
        .select('id')
        .eq('rt_number', rtNumber)
        .eq('organization_id', organizationId)
        .eq('role', 'ketua_rt')
        .single()

      if (existingKetuaRt) {
        return NextResponse.json(
          { error: `Ketua RT untuk RT ${rtNumber} sudah ada` },
          { status: 409 }
        )
      }
    }

    // Insert user baru
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password,
        nama_lengkap: namaLengkap,
        role,
        rt_number: rtNumber || null,
        rw_number: rwNumber || null,
        rumah_id: houseId || null,
        organization_id: organizationId,
      })
      .select('id, username, nama_lengkap, role, rt_number, rw_number, rumah_id, created_at')
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Gagal membuat user baru: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: `User ${role} berhasil ditambahkan`,
        data: {
          id: newUser.id,
          username: newUser.username,
          namaLengkap: newUser.nama_lengkap,
          role: newUser.role,
          rtNumber: newUser.rt_number,
          rwNumber: newUser.rw_number,
          rumahId: newUser.rumah_id,
          createdAt: newUser.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server yang tidak terduga' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/residents
 * 
 * Endpoint untuk update data warga
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      namaLengkap,
      rtNumber,
      rwNumber,
      rumahId,
      currentUserRole,
      currentUserRt,
      organizationId,
    } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi akses
    if (currentUserRole === 'ketua_rt') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('rt_number, organization_id')
        .eq('id', userId)
        .single()

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User tidak ditemukan' },
          { status: 404 }
        )
      }

      if (targetUser.rt_number !== currentUserRt) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses untuk mengubah warga RT lain' },
          { status: 403 }
        )
      }

      // Ketua RT tidak boleh mengubah RT anggota
      if (rtNumber && rtNumber !== currentUserRt) {
        return NextResponse.json(
          { error: 'Anda tidak dapat memindahkan warga ke RT lain. Hubungi admin.' },
          { status: 403 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (namaLengkap) updateData.nama_lengkap = namaLengkap
    if (rtNumber !== undefined) updateData.rt_number = rtNumber || null
    if (rwNumber !== undefined) updateData.rw_number = rwNumber || null
    if (rumahId !== undefined) updateData.rumah_id = rumahId || null
    updateData.updated_at = new Date().toISOString()

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, nama_lengkap, role, rt_number, rw_number, rumah_id')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Gagal mengupdate user: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Data warga berhasil diupdate',
      data: updatedUser,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/residents
 * 
 * Endpoint untuk menghapus warga
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, currentUserRole, currentUserRt } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi akses
    if (currentUserRole === 'ketua_rt') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('rt_number')
        .eq('id', userId)
        .single()

      if (targetUser?.rt_number !== currentUserRt) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses untuk menghapus warga RT lain' },
          { status: 403 }
        )
      }
    }

    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      return NextResponse.json(
        { error: 'Gagal menghapus user: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Warga berhasil dihapus',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}