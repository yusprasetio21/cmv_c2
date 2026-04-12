import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, nama_lengkap, role, rumah_id, created_at')
      .eq('id', id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // Get house info if rumah_id exists
    let house = null
    if (user.rumah_id) {
      const { data: houseData } = await supabase
        .from('houses')
        .select('nomor_rumah, blok, status_rumah')
        .eq('nomor_rumah', user.rumah_id)
        .single()
      if (houseData) {
        house = {
          nomorRumah: houseData.nomor_rumah,
          blok: houseData.blok,
          statusRumah: houseData.status_rumah,
        }
      }
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      namaLengkap: user.nama_lengkap,
      role: user.role,
      rumahId: user.rumah_id,
      house,
      createdAt: user.created_at,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { namaLengkap, password, role, rumahId } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (namaLengkap !== undefined) updateData.nama_lengkap = namaLengkap
    if (password !== undefined) updateData.password = password
    if (role !== undefined) updateData.role = role
    if (rumahId !== undefined) updateData.rumah_id = rumahId || null

    // If rumahId provided, verify the house exists
    if (rumahId) {
      const { data: house } = await supabase
        .from('houses')
        .select('nomor_rumah')
        .eq('nomor_rumah', rumahId)
        .single()

      if (!house) {
        return NextResponse.json({ error: 'Nomor rumah tidak ditemukan' }, { status: 404 })
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, nama_lengkap, role, rumah_id, created_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get house info if rumah_id exists
    let house = null
    if (data.rumah_id) {
      const { data: houseData } = await supabase
        .from('houses')
        .select('nomor_rumah, blok, status_rumah')
        .eq('nomor_rumah', data.rumah_id)
        .single()
      if (houseData) {
        house = {
          nomorRumah: houseData.nomor_rumah,
          blok: houseData.blok,
          statusRumah: houseData.status_rumah,
        }
      }
    }

    return NextResponse.json({
      id: data.id,
      username: data.username,
      namaLengkap: data.nama_lengkap,
      role: data.role,
      rumahId: data.rumah_id,
      house,
      createdAt: data.created_at,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'User berhasil dihapus' })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
