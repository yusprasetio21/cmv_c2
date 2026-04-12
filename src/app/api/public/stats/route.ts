import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Total warga (residents)
    const { count: totalWarga } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'warga')

    // Total approved payments sum
    const { data: paymentData } = await supabase
      .from('payments')
      .select('nominal')
      .eq('status', 'approved')

    const totalKas = paymentData?.reduce((sum: number, p: { nominal: number }) => sum + p.nominal, 0) || 0

    // Recent payments count (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { count: recentPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Total announcements
    const { count: totalAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })

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
