import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'Slug diperlukan' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Organisasi tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    province: data.province,
    kabupaten: data.kabupaten,
    kecamatan: data.kecamatan,
    kelurahan: data.kelurahan,
    rtNumber: data.rt_number,
    rwNumber: data.rw_number,
    addressFull: data.address_full,
    ketuaRtName: data.ketua_rt_name,
    logoUrl: data.logo_url,
    stampUrl: data.stamp_url,
    signatureUrl: data.signature_url,
    iuranNominal: data.iuran_nominal,
    createdAt: data.created_at,
  })
}
