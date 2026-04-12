import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, nama_lengkap, role, rumah_id')
      .eq('username', username)
      .eq('password', password)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    // Get house info separately if rumah_id exists
    let house = null
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
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
