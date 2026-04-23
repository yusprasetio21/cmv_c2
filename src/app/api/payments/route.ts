// app/api/payments/route.ts
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
    if (!userId && data && data.length > 0) {
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

    const payments = (data || []).map((p: { 
      id: string; 
      user_id: string; 
      tahun: number; 
      bulan: number; 
      nominal: number; 
      tanggal_transfer: string | null; 
      bukti_name: string | null; 
      status: string; 
      created_at: string 
    }) => ({
      id: p.id,
      userId: p.user_id,
      tahun: p.tahun,
      bulan: p.bulan,
      nominal: p.nominal,
      tanggalTransfer: p.tanggal_transfer,
      buktiName: p.bukti_name,
      buktiUrl: p.bukti_name || null,
      status: p.status,
      createdAt: p.created_at,
      user: userMap.get(p.user_id) || null,
    }))

    return NextResponse.json(payments)
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/payments START ===')
    
    // Cek apakah request multipart/form-data (dengan file)
    const contentType = request.headers.get('content-type') || ''
    console.log('Content-Type:', contentType)
    
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data...')
      
      // Handle upload file ke Supabase Storage dulu
      const formData = await request.formData()
      
      const userId = formData.get('userId') as string
      const tahun = parseInt(formData.get('tahun') as string)
      const bulan = parseInt(formData.get('bulan') as string)
      const nominal = parseInt(formData.get('nominal') as string)
      const tanggalTransfer = formData.get('tanggalTransfer') as string
      const file = formData.get('buktiBayar') as File | null

      console.log('Parsed data:', { userId, tahun, bulan, nominal, tanggalTransfer, hasFile: !!file })

      // Validasi data
      if (!userId || !tahun || !bulan || !nominal) {
        console.log('Validation failed: missing data')
        return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
      }

      if (!file) {
        console.log('Validation failed: no file')
        return NextResponse.json({ error: 'File bukti bayar wajib diupload' }, { status: 400 })
      }

      // Upload file ke Supabase Storage melalui endpoint upload
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('bucket', 'payment-proofs')
      
      // Dapatkan username untuk folder
      console.log('Fetching user data for userId:', userId)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single()
      
      if (userError) {
        console.error('Error fetching user:', userError)
        // Lanjutkan dengan username default
      }
      
      const orgSlug = userData?.username || 'user'
      console.log('orgSlug:', orgSlug)
      uploadFormData.append('orgSlug', orgSlug)

      // Panggil API upload
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      console.log('Calling upload API at:', `${baseUrl}/api/upload`)
      
      const uploadRes = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: uploadFormData,
      })

      console.log('Upload response status:', uploadRes.status)

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error('Upload failed:', errorText)
        return NextResponse.json({ error: 'Gagal upload file: ' + errorText }, { status: 500 })
      }

      const uploadData = await uploadRes.json()
      console.log('Upload success, URL:', uploadData.url)
      const buktiUrl = uploadData.url

      // Cek apakah sudah ada pembayaran untuk bulan dan tahun tersebut
      console.log('Checking existing payment...')
      const { data: existingPayment, error: checkError } = await supabase
        .from('payments')
        .select('id, status')
        .eq('user_id', userId)
        .eq('tahun', tahun)
        .eq('bulan', bulan)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Check error:', checkError)
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }
      
      if (existingPayment) {
        console.log('Existing payment found:', existingPayment)
        // Jika sudah ada pembayaran untuk bulan ini
        if (existingPayment.status === 'approved') {
          return NextResponse.json({ error: 'Pembayaran untuk bulan ini sudah disetujui' }, { status: 400 })
        }
        
        // Update payment yang sudah ada
        console.log('Updating existing payment...')
        const { data, error } = await supabase
          .from('payments')
          .update({
            nominal,
            tanggal_transfer: tanggalTransfer || null,
            bukti_name: buktiUrl,
            status: 'pending',
          })
          .eq('id', existingPayment.id)
          .select()
          .single()
        
        if (error) {
          console.error('Update error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        console.log('Update success')
        return NextResponse.json(data, { status: 200 })
      }
      
      // Insert payment baru
      console.log('Inserting new payment...')
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          tahun,
          bulan,
          nominal,
          tanggal_transfer: tanggalTransfer || null,
          bukti_name: buktiUrl,
          status: 'pending',
        })
        .select()
        .single()
      
      if (error) {
        console.error('Insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      console.log('Insert success')
      return NextResponse.json(data, { status: 201 })
    } else {
      console.log('Processing JSON request...')
      // Handle JSON request (untuk backward compatibility atau update tanpa file)
      const body = await request.json()
      const { userId, tahun, bulan, nominal, tanggalTransfer, buktiUrl } = body

      console.log('JSON data:', { userId, tahun, bulan, nominal, tanggalTransfer, buktiUrl })

      if (!userId || !tahun || !bulan || !nominal) {
        return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
      }

      // Cek apakah sudah ada pembayaran untuk bulan dan tahun tersebut
      const { data: existingPayment, error: checkError } = await supabase
        .from('payments')
        .select('id, status')
        .eq('user_id', userId)
        .eq('tahun', tahun)
        .eq('bulan', bulan)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Check error:', checkError)
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }
      
      if (existingPayment) {
        // Jika sudah ada pembayaran untuk bulan ini
        if (existingPayment.status === 'approved') {
          return NextResponse.json({ error: 'Pembayaran untuk bulan ini sudah disetujui' }, { status: 400 })
        }
        
        // Update payment yang sudah ada
        const { data, error } = await supabase
          .from('payments')
          .update({
            nominal,
            tanggal_transfer: tanggalTransfer || null,
            bukti_name: buktiUrl || null,
            status: 'pending',
          })
          .eq('id', existingPayment.id)
          .select()
          .single()
        
        if (error) {
          console.error('Update error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        return NextResponse.json(data, { status: 200 })
      }
      
      // Insert payment baru
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          tahun,
          bulan,
          nominal,
          tanggal_transfer: tanggalTransfer || null,
          bukti_name: buktiUrl || null,
          status: 'pending',
        })
        .select()
        .single()
      
      if (error) {
        console.error('Insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json(data, { status: 201 })
    }
  } catch (error) {
    console.error('=== POST ERROR ===')
    console.error('Error details:', error)
    return NextResponse.json({ 
      error: 'Terjadi kesalahan server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}