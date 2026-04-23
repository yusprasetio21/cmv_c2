'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, getMonthName, getStatusBadgeClass, getStatusLabel } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, CheckCircle, Clock, XCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Payment {
  id: string
  userId: string
  tahun: number
  bulan: number
  nominal: number
  tanggalTransfer: string | null
  buktiName: string | null
  buktiUrl?: string | null
  status: string
  createdAt: string
}

export default function IuranPage() {
  const { user } = useAppStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [bulan, setBulan] = useState('')
  const [tanggalTransfer, setTanggalTransfer] = useState('')
  const [nominal, setNominal] = useState('80000')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
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
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    }
    loadPayments()
  }, [user])

  // Set default month
  useEffect(() => {
    const m = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    setBulan(m)
    setTanggalTransfer(new Date().toISOString().split('T')[0])
  }, [currentMonth, currentYear])

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Current month payment status
  const currentPayment = payments.find(
    (p) => p.tahun === currentYear && p.bulan === currentMonth
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validasi tipe file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Format file harus JPG, JPEG, PNG, atau WEBP')
        return
      }
      
      // Validasi ukuran file (max 2MB)
      if (selectedFile.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB')
        return
      }
      
      setFile(selectedFile)
      
      // Buat preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    } else {
      setFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Silakan login terlebih dahulu')
      return
    }
    if (!bulan) {
      toast.error('Pilih bulan iuran')
      return
    }
    if (!nominal) {
      toast.error('Masukkan nominal')
      return
    }
    if (!file) {
      toast.error('Upload bukti pembayaran')
      return
    }
    
    setSubmitting(true)
    setUploading(true)
    
    try {
      const [year, month] = bulan.split('-')
      
      const formData = new FormData()
      formData.append('userId', user.id)
      formData.append('tahun', year)
      formData.append('bulan', month)
      formData.append('nominal', nominal)
      formData.append('tanggalTransfer', tanggalTransfer)
      formData.append('buktiBayar', file)
      
      const res = await fetch('/api/payments', {
        method: 'POST',
        body: formData,
      })
      
      if (res.ok) {
        toast.success('Pembayaran berhasil dikirim! Menunggu persetujuan.')
        setFile(null)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl(null)
        }
        // Reset form
        const m = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
        setBulan(m)
        setTanggalTransfer(new Date().toISOString().split('T')[0])
        setNominal('80000')
        
        // Reload payments after submit
        const res2 = await fetch(`/api/payments?userId=${user.id}`)
        if (res2.ok) {
          const data = await res2.json()
          setPayments(data)
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Gagal mengirim pembayaran')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  // Generate month options - FIXED VERSION
  const monthOptions: { value: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const val = `${year}-${String(month).padStart(2, '0')}`
    const monthName = getMonthName(month)
    const label = `${monthName} ${year}`
    
    monthOptions.push({ 
      value: val, 
      label: label 
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-amber-500" />
    }
  }

  return (
    <div className="px-5 py-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-2">Iuran IPL</h2>
      <p className="text-sm text-slate-500 mb-6">Kelola pembayaran iuran bulanan</p>

      {/* Current Month Status */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-5 mb-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-teal-100 text-sm">Status Bulan Ini</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentPayment 
              ? currentPayment.status === 'approved' 
                ? 'bg-emerald-100 text-emerald-700'
                : currentPayment.status === 'rejected'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {currentPayment ? getStatusLabel(currentPayment.status) : 'Belum Bayar'}
          </span>
        </div>
        <p className="text-2xl font-bold mb-1">{getMonthName(currentMonth)} {currentYear}</p>
        <p className="text-teal-100 text-sm">Nominal: {formatCurrency(80000)}</p>
      </div>

      {/* Payment Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Form Pelaporan Pembayaran</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Bulan Iuran</Label>
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
              disabled={submitting}
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
              className="py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-teal-500"
              required
              disabled={submitting}
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Nominal (Rp)</Label>
            <Input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              className="py-3 bg-slate-50 border-slate-200 rounded-xl focus:ring-teal-500"
              placeholder="80000"
              required
              disabled={submitting}
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Upload Bukti Bayar</Label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                previewUrl 
                  ? 'border-teal-400 bg-teal-50/30' 
                  : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/30'
              } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !submitting && document.getElementById('proofUpload')?.click()}
            >
              <input
                type="file"
                id="proofUpload"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={submitting}
              />
              <Upload className={`w-10 h-10 mx-auto mb-2 ${previewUrl ? 'text-teal-500' : 'text-slate-400'}`} />
              <p className="text-sm text-slate-500">
                {previewUrl ? 'Klik untuk ganti gambar' : 'Klik upload bukti transfer'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Format: JPG, PNG, WEBP (Max 2MB)</p>
              
              {/* Preview Gambar */}
              {previewUrl && (
                <div className="mt-4">
                  <div className="relative inline-block">
                    <img 
                      src={previewUrl} 
                      alt="Preview bukti transfer" 
                      className="max-h-48 w-auto rounded-lg border-2 border-teal-400 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl)
                          setPreviewUrl(null)
                        }
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      disabled={submitting}
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-teal-600 mt-2">{file?.name}</p>
                </div>
              )}
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={submitting || !file || uploading}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploading ? 'Mengupload...' : 'Mengirim...'}
              </div>
            ) : (
              'Kirim Laporan'
            )}
          </Button>
        </form>
      </div>

      {/* Payment History */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Riwayat Pembayaran</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {payments.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
              <p className="text-slate-500 text-sm">Belum ada riwayat pembayaran</p>
            </div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800">
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
                
                {/* Tombol Lihat Bukti */}
                {p.buktiName && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => window.open(p.buktiName!, '_blank')}
                      className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Lihat Bukti Transfer
                    </button>
                  </div>
                )}
                
                {p.status === 'rejected' && (
                  <p className="text-xs text-red-500 mt-2">Catatan: Bukti transfer tidak valid</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}