import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Try to check if gambar_url column exists by selecting it
    const { error: checkError } = await supabase
      .from('announcements')
      .select('gambar_url')
      .limit(1)

    if (checkError && checkError.message?.includes('column')) {
      // Column doesn't exist - we can't add it via REST API
      // User needs to add it manually in Supabase SQL editor
      return NextResponse.json({
        status: 'needs_manual_setup',
        message: 'Kolom gambar_url belum ada di tabel announcements',
        sql: 'ALTER TABLE announcements ADD COLUMN IF NOT EXISTS gambar_url TEXT;',
        instruction: 'Jalankan SQL berikut di Supabase SQL Editor: ALTER TABLE announcements ADD COLUMN IF NOT EXISTS gambar_url TEXT;'
      })
    }

    return NextResponse.json({
      status: 'ready',
      message: 'Kolom gambar_url sudah tersedia di tabel announcements'
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { error: checkError } = await supabase
      .from('announcements')
      .select('gambar_url')
      .limit(1)

    return NextResponse.json({
      hasGambarUrl: !checkError,
      message: checkError
        ? 'Kolom gambar_url belum ada. Jalankan SQL di Supabase: ALTER TABLE announcements ADD COLUMN IF NOT EXISTS gambar_url TEXT;'
        : 'Kolom gambar_url sudah tersedia'
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
