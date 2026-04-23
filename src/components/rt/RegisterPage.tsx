'use client'

import { useState } from 'react'
import { useAppStore, Organization } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mountain, ArrowLeft, Upload, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RegisterPageProps {
  onBack: () => void
  onSuccess: (org: Organization, user: { id: string; username: string; namaLengkap: string; role: string; organizationId: string }) => void
}

export default function RegisterPage({ onBack, onSuccess }: RegisterPageProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: RT Info
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [province, setProvince] = useState('')
  const [kabupaten, setKabupaten] = useState('')
  const [kecamatan, setKecamatan] = useState('')
  const [kelurahan, setKelurahan] = useState('')
  const [rtNumber, setRtNumber] = useState('')
  const [rwNumber, setRwNumber] = useState('')
  const [ketuaRtName, setKetuaRtName] = useState('')
  const [iuranNominal, setIuranNominal] = useState('80000')

  // Step 2: Uploads
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stampPreview, setStampPreview] = useState<string | null>(null)
  const [stampUrl, setStampUrl] = useState<string | null>(null)
  const [sigPreview, setSigPreview] = useState<string | null>(null)
  const [sigUrl, setSigUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingStamp, setUploadingStamp] = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)

  // Step 3: Admin Account
  const [adminName, setAdminName] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('')

  const handleSlugFromName = (val: string) => {
    setName(val)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(val))
    }
  }

  const generateSlug = (text: string) => {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 20)
  }

  const handleFileUpload = async (file: File, bucket: string, setPreview: (url: string | null) => void, setUrl: (url: string | null) => void, setUploading: (v: boolean) => void) => {
    setUploading(true)
    setPreview(URL.createObjectURL(file))
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)
      formData.append('orgSlug', slug)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setUrl(data.url)
        toast.success('File berhasil diupload')
      } else {
        toast.error('Gagal upload file')
        setPreview(null)
      }
    } catch {
      toast.error('Gagal upload file')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const validateStep1 = () => {
    if (!name || !slug || !province || !kabupaten || !kecamatan || !kelurahan || !rtNumber || !rwNumber || !ketuaRtName) {
      toast.error('Lengkapi semua data wilayah')
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!adminName || !adminUsername || !adminPassword) {
      toast.error('Lengkapi data akun admin')
      return false
    }
    if (adminPassword.length < 6) {
      toast.error('Password minimal 6 karakter')
      return false
    }
    if (adminPassword !== adminPasswordConfirm) {
      toast.error('Konfirmasi password tidak cocok')
      return false
    }
    return true
  }

  const handleRegister = async () => {
    if (!validateStep3()) return
    setLoading(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          province,
          kabupaten,
          kecamatan,
          kelurahan,
          rtNumber,
          rwNumber,
          addressFull: `${name} RT ${rtNumber} RW ${rwNumber} Desa ${kelurahan} Kecamatan ${kecamatan} ${kabupaten} ${province}`,
          ketuaRtName,
          logoUrl,
          stampUrl,
          signatureUrl: sigUrl,
          iuranNominal: parseInt(iuranNominal) || 80000,
          adminUsername,
          adminPassword,
          adminName,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Gagal mendaftar')
        return
      }
      toast.success('Pendaftaran berhasil!')
      onSuccess(data.organization, data.user)
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const FileUploadArea = ({ label, bucket, preview, setPreview, setUrl, setUploading, uploading, accept = 'image/*' }: {
    label: string; bucket: string; preview: string | null; setPreview: (v: string | null) => void;
    setUrl: (v: string | null) => void; setUploading: (v: boolean) => void; uploading: boolean; accept?: string
  }) => (
    <div>
      <Label className="text-sm font-medium text-slate-700 mb-1.5">{label}</Label>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={preview} alt={label} className="w-full h-32 object-contain" />
          <button
            onClick={() => { setPreview(null); setUrl(null) }}
            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = accept
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) handleFileUpload(file, bucket, setPreview, setUrl, setUploading)
            }
            input.click()
          }}
        >
          {uploading ? (
            <div className="py-4">
              <Loader2 className="w-8 h-8 text-teal-600 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-slate-500">Mengupload...</p>
            </div>
          ) : (
            <div className="py-4">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Klik untuk upload</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG max 2MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 px-6 pt-8 pb-12 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors mb-4">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl mx-auto mb-3 flex items-center justify-center">
              <Mountain className="w-10 h-10 text-teal-600" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Daftar RT Baru</h1>
            <p className="text-teal-100 text-sm">Buat akun RT Digital untuk wilayah Anda</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-6 relative z-10 pb-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { n: 1, label: 'Data Wilayah' },
            { n: 2, label: 'Upload' },
            { n: 3, label: 'Akun' },
          ].map((s) => (
            <button key={s.n} onClick={() => { if (s.n < step) setStep(s.n) }} className="flex items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s.n ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
              } ${step > s.n ? 'bg-emerald-500' : ''}`}>
                {step > s.n ? <CheckCircle className="w-5 h-5" /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step >= s.n ? 'text-teal-700' : 'text-slate-400'}`}>
                {s.label}
              </span>
              {s.n < 3 && <div className={`w-8 h-0.5 ${step > s.n ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          {/* Step 1: Data Wilayah */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 text-lg">Data Wilayah RT</h3>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Nama RT / Perumahan *</Label>
                <Input value={name} onChange={(e) => handleSlugFromName(e.target.value)} placeholder="Contoh: RT Ciapus Mountain View" className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">URL Slug * <span className="text-xs text-slate-400">(rtdigital.vercel.app/<strong>{slug || 'slug-anda'}</strong>)</span></Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="contoh: cmv atau pasireurihkaum" className="py-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5">Provinsi *</Label>
                  <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Jawa Barat" className="py-2.5" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5">Kabupaten/Kota *</Label>
                  <Input value={kabupaten} onChange={(e) => setKabupaten(e.target.value)} placeholder="Kab. Bogor" className="py-2.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5">Kecamatan *</Label>
                  <Input value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} placeholder="Tamansari" className="py-2.5" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5">Kelurahan/Desa *</Label>
                  <Input value={kelurahan} onChange={(e) => setKelurahan(e.target.value)} placeholder="Pasireurih" className="py-2.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5">Nomor RT *</Label>
                  <Input value={rtNumber} onChange={(e) => setRtNumber(e.target.value)} placeholder="002" className="py-2.5" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5">Nomor RW *</Label>
                  <Input value={rwNumber} onChange={(e) => setRwNumber(e.target.value)} placeholder="013" className="py-2.5" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Nama Ketua RT *</Label>
                <Input value={ketuaRtName} onChange={(e) => setKetuaRtName(e.target.value)} placeholder="Nama lengkap ketua RT" className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Nominal Iuran IPL (Rp)</Label>
                <Input type="number" value={iuranNominal} onChange={(e) => setIuranNominal(e.target.value)} placeholder="80000" className="py-2.5" />
              </div>
              <Button onClick={() => { if (validateStep1()) setStep(2) }} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl">
                Lanjut Upload →
              </Button>
            </div>
          )}

          {/* Step 2: Uploads */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 text-lg">Upload Logo & Stempel</h3>
              <p className="text-sm text-slate-500">Upload logo, stempel, dan tanda tangan digital untuk surat resmi RT. Bisa diubah nanti di pengaturan.</p>
              <FileUploadArea
                label="Logo Daerah / RT (untuk header surat)"
                bucket="logos"
                preview={logoPreview}
                setPreview={setLogoPreview}
                setUrl={setLogoUrl}
                setUploading={setUploadingLogo}
                uploading={uploadingLogo}
              />
              <FileUploadArea
                label="Stempel RT (untuk surat resmi)"
                bucket="stamps"
                preview={stampPreview}
                setPreview={setStampPreview}
                setUrl={setStampUrl}
                setUploading={setUploadingStamp}
                uploading={uploadingStamp}
              />
              <FileUploadArea
                label="Tanda Tangan Digital Ketua RT"
                bucket="signatures"
                preview={sigPreview}
                setPreview={setSigPreview}
                setUrl={setSigUrl}
                setUploading={setUploadingSig}
                uploading={uploadingSig}
              />
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 py-3 rounded-xl">
                  ← Kembali
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl">
                  Lanjut Akun →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 text-lg">Buat Akun Admin</h3>
              <p className="text-sm text-slate-500">Akun admin digunakan untuk mengelola data RT, menyetujui surat, dan mengatur warga.</p>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap Admin *</Label>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder={ketuaRtName || 'Nama lengkap'} className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Username *</Label>
                <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} placeholder="admin" className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Password * <span className="text-xs text-slate-400">(min 6 karakter)</span></Label>
                <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Minimal 6 karakter" className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password *</Label>
                <Input type="password" value={adminPasswordConfirm} onChange={(e) => setAdminPasswordConfirm(e.target.value)} placeholder="Ulangi password" className="py-2.5" />
              </div>

              {/* Summary */}
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                <h4 className="text-sm font-semibold text-teal-700 mb-2">Ringkasan Pendaftaran</h4>
                <div className="text-xs text-teal-600 space-y-1">
                  <p><strong>Nama:</strong> {name || '-'}</p>
                  <p><strong>URL:</strong> rtdigital.vercel.app/{slug || '-'}</p>
                  <p><strong>Wilayah:</strong> RT {rtNumber || '-'} RW {rwNumber || '-'} {kelurahan || '-'}, {kecamatan || '-'}, {kabupaten || '-'}</p>
                  <p><strong>Ketua RT:</strong> {ketuaRtName || '-'}</p>
                  <p><strong>Admin:</strong> {adminUsername || '-'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 py-3 rounded-xl">
                  ← Kembali
                </Button>
                <Button onClick={handleRegister} disabled={loading} className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mendaftar...</>
                  ) : (
                    'Daftar Sekarang ✓'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
