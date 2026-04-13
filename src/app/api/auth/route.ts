import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { username, password, organizationId } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    console.log(`🔍 Mencari user: "${username}"`)
    console.log(`🔑 Password dari input: "${password}"`)
    console.log(`📦 Length password input: ${password.length}`)

    // 🔥 PERUBAHAN: Cari user dulu TANPA filter organizationId
    let query = supabase
      .from('users')
      .select('id, username, nama_lengkap, role, rumah_id, organization_id, password')
      .eq('username', username)
      .eq('password', password)  // Coba dengan password dulu

    // HAPUS filter organizationId untuk debugging
    // if (organizationId) {
    //   query = query.eq('organization_id', organizationId)
    // }

    const { data: user, error } = await query.single()
    
    console.log('📊 User ditemukan?:', user ? 'YA' : 'TIDAK')
    console.log('Error:', error)
    
    if (user) {
      console.log(`✅ User found:`, user)
      console.log(`Organization ID di DB: ${user.organization_id}`)
      console.log(`Organization ID dari request: ${organizationId}`)
      console.log(`Cocok? ${user.organization_id === organizationId}`)
    }

    if (error || !user) {
      console.log('❌ User tidak ditemukan atau password salah')
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    // Optional: Validasi organizationId setelah user ditemukan
    if (organizationId && user.organization_id !== organizationId) {
      console.log('❌ Organization ID tidak cocok')
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    console.log('✅ Login sukses!')

    // Get house info
    let house: { nomorRumah: string } | null = null
    if (user.rumah_id) {
      const { data: houseData } = await supabase
        .from('houses')
        .select('nomor_rumah')
        .eq('nomor_rumah', user.rumah_id)
        .single()
      
      if (houseData) {
        house = { nomorRumah: houseData.nomor_rumah }
      }
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      namaLengkap: user.nama_lengkap,
      role: user.role,
      rumahId: user.rumah_id,
      house: house || (user.rumah_id ? { nomorRumah: user.rumah_id } : null),
      organizationId: user.organization_id,
    })
  } catch (error) {
    console.error('❌ Server error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}