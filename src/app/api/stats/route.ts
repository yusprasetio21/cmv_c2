import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    // Total warga
    let userQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'warga')
    if (organizationId) userQuery = userQuery.eq('organization_id', organizationId)
    const { count: totalWarga } = await userQuery

    // Total approved payments sum
    let payQuery = supabase
      .from('payments')
      .select('nominal')
      .eq('status', 'approved')
    if (organizationId) payQuery = payQuery.eq('organization_id', organizationId)
    const { data: paymentData } = await payQuery
    const totalKas = paymentData?.reduce((sum: number, p: { nominal: number }) => sum + p.nominal, 0) || 0

    // Total letters
    let letAppQuery = supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
    if (organizationId) letAppQuery = letAppQuery.eq('organization_id', organizationId)
    const { count: totalSuratMasuk } = await letAppQuery

    let letAllQuery = supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
    if (organizationId) letAllQuery = letAllQuery.eq('organization_id', organizationId)
    const { count: totalSuratKeluar } = await letAllQuery

    // Pending items for admin
    let pendPayQuery = supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (organizationId) pendPayQuery = pendPayQuery.eq('organization_id', organizationId)
    const { count: pendingPayments } = await pendPayQuery

    let pendLetQuery = supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (organizationId) pendLetQuery = pendLetQuery.eq('organization_id', organizationId)
    const { count: pendingLetters } = await pendLetQuery

    return NextResponse.json({
      totalWarga: totalWarga || 0,
      totalKas,
      totalSuratMasuk: totalSuratMasuk || 0,
      totalSuratKeluar: totalSuratKeluar || 0,
      pendingPayments: pendingPayments || 0,
      pendingLetters: pendingLetters || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
