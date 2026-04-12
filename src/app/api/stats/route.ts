import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Total warga
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

    // Total letters
    const { count: totalSuratMasuk } = await supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    const { count: totalSuratKeluar } = await supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })

    // Pending items for admin
    const { count: pendingPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: pendingLetters } = await supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

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
