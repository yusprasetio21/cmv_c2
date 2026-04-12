import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabase
      .from('payments')
      .select('id, user_id, tahun, bulan, nominal, tanggal_transfer, bukti_name, status, created_at')
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
      const userIds = [...new Set(data.map((p: { user_id: string }) => p.user_id))]
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

    const payments = data.map((p: { id: string; user_id: string; tahun: number; bulan: number; nominal: number; tanggal_transfer: string | null; bukti_name: string | null; status: string; created_at: string }) => ({
      id: p.id,
      userId: p.user_id,
      tahun: p.tahun,
      bulan: p.bulan,
      nominal: p.nominal,
      tanggalTransfer: p.tanggal_transfer,
      buktiName: p.bukti_name,
      status: p.status,
      createdAt: p.created_at,
      user: userMap.get(p.user_id) || null,
    }))

    return NextResponse.json(payments)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, tahun, bulan, nominal, tanggalTransfer, buktiName } = body

    if (!userId || !tahun || !bulan || !nominal) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        tahun,
        bulan,
        nominal,
        tanggal_transfer: tanggalTransfer || null,
        bukti_name: buktiName || null,
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
