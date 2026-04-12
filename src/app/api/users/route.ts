import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const role = searchParams.get('role')

    let query = supabase
      .from('users')
      .select('id, username, nama_lengkap, role, rumah_id, created_at')
      .order('created_at', { ascending: false })

    if (role) {
      query = query.eq('role', role)
    }

    if (search) {
      query = query.or(`nama_lengkap.ilike.%${search}%,username.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get house info for users with rumah_id
    const rumahIds = users
      .filter((u: { rumah_id: string | null }) => u.rumah_id)
      .map((u: { rumah_id: string }) => u.rumah_id)

    let houseMap = new Map<string, { nomorRumah: string; blok: string; statusRumah: string }>()
    if (rumahIds.length > 0) {
      const { data: houses } = await supabase
        .from('houses')
        .select('nomor_rumah, blok, status_rumah')
        .in('nomor_rumah', rumahIds)

      if (houses) {
        for (const h of houses) {
          houseMap.set(h.nomor_rumah, {
            nomorRumah: h.nomor_rumah,
            blok: h.blok,
            statusRumah: h.status_rumah,
          })
        }
      }
    }

    const result = users.map((u: { id: string; username: string; nama_lengkap: string; role: string; rumah_id: string | null; created_at: string }) => ({
      id: u.id,
      username: u.username,
      namaLengkap: u.nama_lengkap,
      role: u.role,
      rumahId: u.rumah_id,
      house: u.rumah_id ? houseMap.get(u.rumah_id) || null : null,
      createdAt: u.created_at,
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, namaLengkap, role, rumahId } = body

    if (!username || !password || !namaLengkap || !role) {
      return NextResponse.json({ error: 'Username, password, nama lengkap, dan role wajib diisi' }, { status: 400 })
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

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
      .insert({
        username,
        password,
        nama_lengkap: namaLengkap,
        role,
        rumah_id: rumahId || null,
      })
      .select('id, username, nama_lengkap, role, rumah_id, created_at')
      .single()

    if (error) {
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
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
