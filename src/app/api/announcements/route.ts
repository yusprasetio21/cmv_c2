import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const announcements = data.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      judul: a.judul as string,
      isi: a.isi as string,
      tipe: a.tipe as string,
      gambarUrl: (a.gambar_url as string) || null,
      organizationId: (a.organization_id as string) || null,
      createdAt: a.created_at as string,
    }))

    return NextResponse.json(announcements)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { judul, isi, tipe, gambarUrl, organizationId } = body

    if (!judul || !isi || !tipe) {
      return NextResponse.json({ error: 'Judul, isi, dan tipe wajib diisi' }, { status: 400 })
    }

    const insertData: Record<string, unknown> = { judul, isi, tipe }
    if (gambarUrl) insertData.gambar_url = gambarUrl
    if (organizationId) insertData.organization_id = organizationId

    let { data, error } = await supabase
      .from('announcements')
      .insert(insertData)
      .select('*')
      .single()

    // If gambar_url column doesn't exist, retry without it
    if (error && gambarUrl && error.message?.includes('column')) {
      delete insertData.gambar_url
      const retryResult = await supabase
        .from('announcements')
        .insert(insertData)
        .select('*')
        .single()
      data = retryResult.data
      error = retryResult.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      judul: data.judul,
      isi: data.isi,
      tipe: data.tipe,
      gambarUrl: data.gambar_url || null,
      organizationId: data.organization_id || null,
      createdAt: data.created_at,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
