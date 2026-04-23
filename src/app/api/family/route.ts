import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(null)
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      namaKk: data.nama_kk,
      nik: data.nik,                           // TAMBAHKAN
      nikAnggota: data.nik_anggota,            // TAMBAHKAN
      tempatLahir: data.tempat_lahir,
      tanggalLahir: data.tanggal_lahir,
      jenisKelamin: data.jenis_kelamin,
      agama: data.agama,
      pekerjaan: data.pekerjaan,
      noHp: data.no_hp,
      members: data.members,
      createdAt: data.updated_at,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      namaKk, 
      nik,                      // TAMBAHKAN
      nikAnggota,               // TAMBAHKAN
      tempatLahir, 
      tanggalLahir, 
      jenisKelamin, 
      agama, 
      pekerjaan, 
      noHp, 
      members 
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('families')
      .insert({
        user_id: userId,
        nama_kk: namaKk || '',
        nik: nik || null,                      // TAMBAHKAN
        nik_anggota: nikAnggota || [],         // TAMBAHKAN
        tempat_lahir: tempatLahir || '',
        tanggal_lahir: tanggalLahir || null,
        jenis_kelamin: jenisKelamin || '',
        agama: agama || '',
        pekerjaan: pekerjaan || '',
        no_hp: noHp || '',
        members: members || [],
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      namaKk, 
      nik,                      // TAMBAHKAN
      nikAnggota,               // TAMBAHKAN
      tempatLahir, 
      tanggalLahir, 
      jenisKelamin, 
      agama, 
      pekerjaan, 
      noHp, 
      members 
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('families')
      .update({
        nama_kk: namaKk || '',
        nik: nik || null,                      // TAMBAHKAN
        nik_anggota: nikAnggota || [],         // TAMBAHKAN
        tempat_lahir: tempatLahir || '',
        tanggal_lahir: tanggalLahir || null,
        jenis_kelamin: jenisKelamin || '',
        agama: agama || '',
        pekerjaan: pekerjaan || '',
        no_hp: noHp || '',
        members: members || [],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}