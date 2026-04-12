import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabase
      .from('letters')
      .select('id, user_id, jenis_surat, data_surat, keperluan, status, nomor_surat, created_at')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user info for admin view
    let userMap = new Map<string, { namaLengkap: string; username: string }>()
    if (!userId && data.length > 0) {
      const userIds = [...new Set(data.map((l: { user_id: string }) => l.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, nama_lengkap, username')
        .in('id', userIds)
      if (users) {
        for (const u of users) {
          userMap.set(u.id, { namaLengkap: u.nama_lengkap, username: u.username })
        }
      }
    }

    const letters = data.map((l: { id: string; user_id: string; jenis_surat: string; data_surat: unknown; keperluan: string; status: string; nomor_surat: string | null; created_at: string }) => ({
      id: l.id,
      userId: l.user_id,
      jenisSurat: l.jenis_surat,
      dataSurat: l.data_surat,
      keperluan: l.keperluan,
      status: l.status,
      nomorSurat: l.nomor_surat,
      createdAt: l.created_at,
      user: userMap.get(l.user_id) || null,
    }))

    return NextResponse.json(letters)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, jenisSurat, dataSurat, keperluan } = body

    if (!userId || !jenisSurat) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('letters')
      .insert({
        user_id: userId,
        jenis_surat: jenisSurat,
        data_surat: dataSurat,
        keperluan: keperluan || '',
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
