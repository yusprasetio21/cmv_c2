import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { judul, isi, tipe, gambarUrl } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (judul !== undefined) updateData.judul = judul
    if (isi !== undefined) updateData.isi = isi
    if (tipe !== undefined) updateData.tipe = tipe
    if (gambarUrl !== undefined) updateData.gambar_url = gambarUrl

    let { data, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    // If gambar_url column doesn't exist, retry without it
    if (error && gambarUrl !== undefined && error.message?.includes('column')) {
      delete updateData.gambar_url
      const retryResult = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()
      data = retryResult.data
      error = retryResult.error
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      judul: data.judul,
      isi: data.isi,
      tipe: data.tipe,
      gambarUrl: data.gambar_url || null,
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

    // Check if announcement exists
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingAnnouncement) {
      return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Pengumuman berhasil dihapus' })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
