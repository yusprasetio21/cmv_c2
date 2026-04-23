import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const id = searchParams.get('id')

    if (slug) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Organisasi tidak ditemukan' }, { status: 404 })
      }

      return NextResponse.json(mapOrg(data))
    }

    if (id) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Organisasi tidak ditemukan' }, { status: 404 })
      }

      return NextResponse.json(mapOrg(data))
    }

    // List all organizations
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data.map(mapOrg))
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, description, province, kabupaten, kecamatan, kelurahan, rtNumber, rwNumber, addressFull, ketuaRtName, logoUrl, stampUrl, signatureUrl, iuranNominal, adminUsername, adminPassword, adminName } = body

    if (!name || !slug || !province || !kabupaten || !kecamatan || !kelurahan || !rtNumber || !rwNumber || !ketuaRtName || !adminUsername || !adminPassword || !adminName) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug/URL sudah digunakan' }, { status: 400 })
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        description: description || null,
        province,
        kabupaten,
        kecamatan,
        kelurahan,
        rt_number: rtNumber,
        rw_number: rwNumber,
        address_full: addressFull || `${name} RT ${rtNumber} RW ${rwNumber} Desa ${kelurahan} Kecamatan ${kecamatan} ${kabupaten} ${province}`,
        ketua_rt_name: ketuaRtName,
        logo_url: logoUrl || null,
        stamp_url: stampUrl || null,
        signature_url: signatureUrl || null,
        iuran_nominal: iuranNominal || 80000,
      })
      .select()
      .single()

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    // Create admin user for the organization
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        username: adminUsername,
        password: adminPassword,
        nama_lengkap: adminName,
        role: 'admin',
        organization_id: org.id,
      })
      .select('id, username, nama_lengkap, role, rumah_id, organization_id')
      .single()

    if (userError) {
      // Rollback: delete the organization
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    return NextResponse.json({
      organization: mapOrg(org),
      user: {
        id: user.id,
        username: user.username,
        namaLengkap: user.nama_lengkap,
        role: user.role,
        rumahId: user.rumah_id,
        house: null,
        organizationId: user.organization_id,
      },
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, province, kabupaten, kecamatan, kelurahan, rtNumber, rwNumber, addressFull, ketuaRtName, logoUrl, stampUrl, signatureUrl, iuranNominal } = body

    if (!id) {
      return NextResponse.json({ error: 'ID organisasi diperlukan' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (province !== undefined) updateData.province = province
    if (kabupaten !== undefined) updateData.kabupaten = kabupaten
    if (kecamatan !== undefined) updateData.kecamatan = kecamatan
    if (kelurahan !== undefined) updateData.kelurahan = kelurahan
    if (rtNumber !== undefined) updateData.rt_number = rtNumber
    if (rwNumber !== undefined) updateData.rw_number = rwNumber
    if (addressFull !== undefined) updateData.address_full = addressFull
    if (ketuaRtName !== undefined) updateData.ketua_rt_name = ketuaRtName
    if (logoUrl !== undefined) updateData.logo_url = logoUrl
    if (stampUrl !== undefined) updateData.stamp_url = stampUrl
    if (signatureUrl !== undefined) updateData.signature_url = signatureUrl
    if (iuranNominal !== undefined) updateData.iuran_nominal = iuranNominal

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(mapOrg(data))
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

function mapOrg(data: Record<string, unknown>) {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    province: data.province,
    kabupaten: data.kabupaten,
    kecamatan: data.kecamatan,
    kelurahan: data.kelurahan,
    rtNumber: data.rt_number,
    rwNumber: data.rw_number,
    addressFull: data.address_full,
    ketuaRtName: data.ketua_rt_name,
    logoUrl: data.logo_url || null,
    stampUrl: data.stamp_url || null,
    signatureUrl: data.signature_url || null,
    iuranNominal: data.iuran_nominal || 80000,
    createdAt: data.created_at,
  }
}
