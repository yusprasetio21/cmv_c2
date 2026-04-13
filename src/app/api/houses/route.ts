import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const blok = searchParams.get('blok')
    const organizationId = searchParams.get('organization_id')
    const distinctBlok = searchParams.get('distinct_blok')

    // Get distinct blok values
    if (distinctBlok === 'true') {
      let query = supabase
        .from('houses')
        .select('blok')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.order('blok', { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Get unique bloks
      const uniqueBloks = [...new Set((data || []).map((h: { blok: string }) => h.blok).filter(Boolean))]
      return NextResponse.json(uniqueBloks)
    }

    // Get houses with optional filters
    let query = supabase
      .from('houses')
      .select('id, nomor_rumah, blok, status_rumah, organization_id')
      .order('nomor_rumah', { ascending: true })

    if (blok) {
      query = query.eq('blok', blok)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: houses, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get residents for these houses
    // Build lookup keys: both house IDs (UUID) and nomor_rumah (for backward compat)
    const houseIds = houses.map((h: { id: string }) => h.id)
    const houseNumbers = houses.map((h: { nomor_rumah: string }) => h.nomor_rumah)
    const allLookupKeys = [...houseIds, ...houseNumbers]

    const { data: residents } = await supabase
      .from('users')
      .select('id, nama_lengkap, username, rumah_id')
      .in('rumah_id', allLookupKeys)

    // Map residents to houses - try both UUID id and nomor_rumah
    const residentMap = new Map<string, { id: string; nama_lengkap: string; username: string }>()
    if (residents) {
      for (const r of residents) {
        residentMap.set(r.rumah_id, { id: r.id, nama_lengkap: r.nama_lengkap, username: r.username })
      }
    }

    const result = houses.map((h: { id: string; nomor_rumah: string; blok: string; status_rumah: string; organization_id: string | null }) => ({
      id: h.id,
      nomorRumah: h.nomor_rumah,
      blok: h.blok,
      statusRumah: h.status_rumah,
      organizationId: h.organization_id,
      resident: residentMap.get(h.id) || residentMap.get(h.nomor_rumah) || null,
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nomorRumah, blok, statusRumah, organizationId } = body

    if (!nomorRumah || !blok) {
      return NextResponse.json({ error: 'Nomor rumah dan blok wajib diisi' }, { status: 400 })
    }

    // Check if house number already exists in this organization
    let checkQuery = supabase
      .from('houses')
      .select('id')
      .eq('nomor_rumah', nomorRumah)

    if (organizationId) {
      checkQuery = checkQuery.eq('organization_id', organizationId)
    }

    const { data: existing } = await checkQuery.single()

    if (existing) {
      return NextResponse.json({ error: 'Nomor rumah sudah ada' }, { status: 409 })
    }

    const insertData: Record<string, unknown> = {
      nomor_rumah: nomorRumah,
      blok,
      status_rumah: statusRumah || 'empty',
    }

    if (organizationId) {
      insertData.organization_id = organizationId
    }

    const { data, error } = await supabase
      .from('houses')
      .insert(insertData)
      .select('id, nomor_rumah, blok, status_rumah, organization_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      nomorRumah: data.nomor_rumah,
      blok: data.blok,
      statusRumah: data.status_rumah,
      organizationId: data.organization_id,
      resident: null,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nomorRumah, blok, statusRumah } = body

    if (!id) {
      return NextResponse.json({ error: 'ID rumah wajib diisi' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (nomorRumah !== undefined) updateData.nomor_rumah = nomorRumah
    if (blok !== undefined) updateData.blok = blok
    if (statusRumah !== undefined) updateData.status_rumah = statusRumah

    const { data, error } = await supabase
      .from('houses')
      .update(updateData)
      .eq('id', id)
      .select('id, nomor_rumah, blok, status_rumah, organization_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Rumah tidak ditemukan' }, { status: 404 })
    }

    // Get resident for this house (check both by UUID id and nomor_rumah for backward compat)
    let resident = null
    const { data: resData } = await supabase
      .from('users')
      .select('id, nama_lengkap, username')
      .or(`rumah_id.eq.${data.id},rumah_id.eq.${data.nomor_rumah}`)
      .limit(1)
      .single()

    if (resData) {
      resident = { id: resData.id, nama_lengkap: resData.nama_lengkap, username: resData.username }
    }

    return NextResponse.json({
      id: data.id,
      nomorRumah: data.nomor_rumah,
      blok: data.blok,
      statusRumah: data.status_rumah,
      organizationId: data.organization_id,
      resident,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID rumah wajib diisi' }, { status: 400 })
    }

    // Check if house has a resident assigned (check both by UUID id and nomor_rumah for backward compat)
    const { data: house } = await supabase
      .from('houses')
      .select('id, nomor_rumah')
      .eq('id', id)
      .single()

    if (!house) {
      return NextResponse.json({ error: 'Rumah tidak ditemukan' }, { status: 404 })
    }

    // Check for residents by either house id or nomor_rumah
    const { data: residents } = await supabase
      .from('users')
      .select('id, nama_lengkap, rumah_id')
      .or(`rumah_id.eq.${house.id},rumah_id.eq.${house.nomor_rumah}`)

    if (residents && residents.length > 0) {
      return NextResponse.json({ error: `Rumah masih ditempati oleh ${residents[0].nama_lengkap}. Hapus atau pindahkan warga terlebih dahulu.` }, { status: 400 })
    }

    const { error } = await supabase
      .from('houses')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Rumah berhasil dihapus' })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
