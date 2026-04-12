import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const blok = searchParams.get('blok')

    let query = supabase
      .from('houses')
      .select('id, nomor_rumah, blok, status_rumah')
      .order('nomor_rumah', { ascending: true })

    if (blok) {
      query = query.eq('blok', blok)
    }

    const { data: houses, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get residents for these houses
    const houseNumbers = houses.map((h: { nomor_rumah: string }) => h.nomor_rumah)
    const { data: residents } = await supabase
      .from('users')
      .select('id, nama_lengkap, username, rumah_id')
      .in('rumah_id', houseNumbers)

    // Map residents to houses
    const residentMap = new Map<string, { id: string; nama_lengkap: string; username: string }>()
    if (residents) {
      for (const r of residents) {
        residentMap.set(r.rumah_id, { id: r.id, nama_lengkap: r.nama_lengkap, username: r.username })
      }
    }

    const result = houses.map((h: { id: string; nomor_rumah: string; blok: string; status_rumah: string }) => ({
      id: h.id,
      nomorRumah: h.nomor_rumah,
      blok: h.blok,
      statusRumah: h.status_rumah,
      resident: residentMap.get(h.nomor_rumah) || null,
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
