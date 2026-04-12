'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, getMonthName, getStatusBadgeClass, getStatusLabel } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, CheckCircle, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Payment {
  id: string
  userId: string
  tahun: number
  bulan: number
  nominal: number
  tanggalTransfer: string | null
  buktiName: string | null
  status: string
  createdAt: string
}

export default function IuranPage() {
  const { user } = useAppStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [bulan, setBulan] = useState('')
  const [tanggalTransfer, setTanggalTransfer] = useState('')
  const [nominal, setNominal] = useState('150000')
  const [fileName, setFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const hasLoaded = useRef(false)
  useEffect(() => {
    if (hasLoaded.current || !user) return
    hasLoaded.current = true
    const loadPayments = async () => {
      const res = await fetch(`/api/payments?userId=${user.id}`)
      if (res.ok) setPayments(await res.json())
    }
    loadPayments()
  }, [user])

  // Set default month
  useEffect(() => {
    const m = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    setBulan(m)
    setTanggalTransfer(new Date().toISOString().split('T')[0])
  }, [currentMonth, currentYear])

  // Current month payment status
  const currentPayment = payments.find(
    (p) => p.tahun === currentYear && p.bulan === currentMonth
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !bulan || !nominal) return
    setSubmitting(true)
    try {
      const [year, month] = bulan.split('-')
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tahun: parseInt(year),
          bulan: parseInt(month),
          nominal: parseInt(nominal),
          tanggalTransfer,
          buktiName: fileName || null,
        }),
      })
      if (res.ok) {
        toast.success('Pembayaran berhasil dikirim! Menunggu persetujuan.')
        setFileName('')
        // Reload payments after submit
        const res2 = await fetch(`/api/payments?userId=${user.id}`)
        if (res2.ok) setPayments(await res2.json())
      } else {
        toast.error('Gagal mengirim pembayaran')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  // Generate month options
  const monthOptions = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthOptions.push({ value: val, label: `${getMonthName(d.getMonth() + 1)} ${d.getFullYear()}` })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-amber-500" />
    }
  }

  return (
    <div className="px-5 py-6">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Iuran IPL</h2>
      <p className="text-sm text-slate-500 mb-6">Kelola pembayaran iuran bulanan</p>

      {/* Current Month Status */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-teal-100 text-sm">Status Bulan Ini</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${currentPayment ? getStatusBadgeClass(currentPayment.status).replace('text-', 'text-') : 'bg-amber-100 text-amber-700'}`}>
            {currentPayment ? getStatusLabel(currentPayment.status) : 'Belum Bayar'}
          </span>
        </div>
        <p className="text-2xl font-bold mb-1">{getMonthName(currentMonth)} {currentYear}</p>
        <p className="text-teal-100 text-sm">Nominal: {formatCurrency(150000)}</p>
      </div>

      {/* Payment Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Form Pelaporan Pembayaran</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Bulan Iuran</Label>
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Transfer</Label>
            <Input
              type="date"
              value={tanggalTransfer}
              onChange={(e) => setTanggalTransfer(e.target.value)}
              className="py-3 bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Nominal (Rp)</Label>
            <Input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className="py-3 bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Upload Bukti Bayar</Label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
              onClick={() => document.getElementById('proofUpload')?.click()}
            >
              <input
                type="file"
                id="proofUpload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFileName(e.target.files[0].name)
                }}
              />
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Klik upload bukti transfer</p>
              {fileName && <p className="text-xs text-teal-600 mt-1">{fileName}</p>}
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
          >
            {submitting ? 'Mengirim...' : 'Kirim Laporan'}
          </Button>
        </form>
      </div>

      {/* Payment History */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Riwayat Pembayaran</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {payments.length === 0 ? (
            <p className="text-center text-slate-500 py-4 text-sm">Belum ada riwayat</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800 text-sm">
                    {getMonthName(p.bulan)} {p.tahun}
                  </span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(p.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{formatDate(p.tanggalTransfer || p.createdAt)}</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(p.nominal)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
