import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
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

    // Recent payments count (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    let recentPayQuery = supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())
    if (organizationId) recentPayQuery = recentPayQuery.eq('organization_id', organizationId)
    const { count: recentPayments } = await recentPayQuery

    // Total announcements
    let annQuery = supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
    if (organizationId) annQuery = annQuery.eq('organization_id', organizationId)
    const { count: totalAnnouncements } = await annQuery

    return NextResponse.json({
      totalWarga: totalWarga || 0,
      totalKas,
      recentPayments: recentPayments || 0,
      totalAnnouncements: totalAnnouncements || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
