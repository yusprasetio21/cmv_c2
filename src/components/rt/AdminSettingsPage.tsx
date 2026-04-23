'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Upload, Save, Loader2, Mountain, Stamp, PenTool, Settings } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const { organization, setOrganization, setPage } = useAppStore()
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [province, setProvince] = useState('')
  const [kabupaten, setKabupaten] = useState('')
  const [kecamatan, setKecamatan] = useState('')
  const [kelurahan, setKelurahan] = useState('')
  const [rtNumber, setRtNumber] = useState('')
  const [rwNumber, setRwNumber] = useState('')
  const [ketuaRtName, setKetuaRtName] = useState('')
  const [iuranNominal, setIuranNominal] = useState('')
  const [addressFull, setAddressFull] = useState('')

  // Upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [stampUrl, setStampUrl] = useState<string | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  const hasLoaded = useRef(false)

  useEffect(() => {
    if (hasLoaded.current || !organization) return
    hasLoaded.current = true
    setName(organization.name)
    setProvince(organization.province)
    setKabupaten(organization.kabupaten)
    setKecamatan(organization.kecamatan)
    setKelurahan(organization.kelurahan)
    setRtNumber(organization.rtNumber)
    setRwNumber(organization.rwNumber)
    setKetuaRtName(organization.ketuaRtName)
    setIuranNominal(String(organization.iuranNominal))
    setAddressFull(organization.addressFull)
    setLogoUrl(organization.logoUrl)
    setStampUrl(organization.stampUrl)
    setSignatureUrl(organization.signatureUrl)
  }, [organization])

  const handleFileUpload = async (file: File, bucket: string, setUrl: (url: string | null) => void) => {
    setUploading(bucket)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)
      formData.append('orgSlug', organization?.slug || 'default')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setUrl(data.url)
        toast.success('File berhasil diupload')
      } else {
        toast.error('Gagal upload file')
      }
    } catch {
      toast.error('Gagal upload file')
    } finally {
      setUploading(null)
    }
  }

  const handleSave = async () => {
    if (!organization) return
    setSaving(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: organization.id,
          name,
          province,
          kabupaten,
          kecamatan,
          kelurahan,
          rtNumber,
          rwNumber,
          ketuaRtName,
          iuranNominal: parseInt(iuranNominal) || 80000,
          addressFull: addressFull || `${name} RT ${rtNumber} RW ${rwNumber} Desa ${kelurahan} Kecamatan ${kecamatan} ${kabupaten} ${province}`,
          logoUrl,
          stampUrl,
          signatureUrl,
        }),
      })
      if (res.ok) {
        const updatedOrg = await res.json()
        setOrganization(updatedOrg)
        toast.success('Pengaturan berhasil disimpan')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menyimpan')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const UploadArea = ({ label, bucket, url, setUrl, icon }: {
    label: string; bucket: string; url: string | null; setUrl: (v: string | null) => void; icon: React.ReactNode
  }) => (
    <div>
      <Label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </Label>
      {url ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={url} alt={label} className="w-full h-28 object-contain p-2" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) handleFileUpload(file, bucket, setUrl)
                }
                input.click()
              }}
              className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center text-xs hover:bg-blue-600"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setUrl(null)}
              className="w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center text-xs hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) handleFileUpload(file, bucket, setUrl)
            }
            input.click()
          }}
        >
          {uploading === bucket ? (
            <div className="py-2">
              <Loader2 className="w-6 h-6 text-teal-600 mx-auto mb-1 animate-spin" />
              <p className="text-xs text-slate-500">Mengupload...</p>
            </div>
          ) : (
            <div className="py-2">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Klik untuk upload</p>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="px-5 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setPage('account')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">Pengaturan RT</h2>
          <p className="text-sm text-slate-500">Kelola data & tampilan RT</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Data Wilayah */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" />
            Data Wilayah
          </h3>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Nama RT / Perumahan</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="py-2.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Provinsi</Label>
                <Input value={province} onChange={(e) => setProvince(e.target.value)} className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Kabupaten/Kota</Label>
                <Input value={kabupaten} onChange={(e) => setKabupaten(e.target.value)} className="py-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Kecamatan</Label>
                <Input value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Kelurahan/Desa</Label>
                <Input value={kelurahan} onChange={(e) => setKelurahan(e.target.value)} className="py-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Nomor RT</Label>
                <Input value={rtNumber} onChange={(e) => setRtNumber(e.target.value)} className="py-2.5" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Nomor RW</Label>
                <Input value={rwNumber} onChange={(e) => setRwNumber(e.target.value)} className="py-2.5" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Nama Ketua RT</Label>
              <Input value={ketuaRtName} onChange={(e) => setKetuaRtName(e.target.value)} className="py-2.5" />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Alamat Lengkap (untuk surat)</Label>
              <Textarea
                value={addressFull}
                onChange={(e) => setAddressFull(e.target.value)}
                rows={2}
                className="bg-slate-50 border-slate-200 rounded-xl resize-none"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Nominal Iuran IPL (Rp)</Label>
              <Input type="number" value={iuranNominal} onChange={(e) => setIuranNominal(e.target.value)} className="py-2.5" />
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Logo, Stempel & TTD</h3>
          <div className="space-y-4">
            <UploadArea
              label="Logo Daerah / RT"
              bucket="logos"
              url={logoUrl}
              setUrl={setLogoUrl}
              icon={<Mountain className="w-4 h-4 text-teal-600" />}
            />
            <UploadArea
              label="Stempel RT"
              bucket="stamps"
              url={stampUrl}
              setUrl={setStampUrl}
              icon={<Stamp className="w-4 h-4 text-amber-600" />}
            />
            <UploadArea
              label="Tanda Tangan Digital Ketua RT"
              bucket="signatures"
              url={signatureUrl}
              setUrl={setSignatureUrl}
              icon={<PenTool className="w-4 h-4 text-purple-600" />}
            />
          </div>
        </div>

        {/* Preview Surat */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Preview Header Surat</h3>
          <div className="bg-white p-6 border border-slate-200 rounded-xl">
            <div className="text-center border-b-2 border-black pb-3">
              <div className="flex items-center justify-center gap-3 mb-2">
                {logoUrl && <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain" />}
                <div>
                  <p className="text-xs font-bold tracking-wide uppercase">{name || 'Nama RT'}</p>
                  <p className="text-xs font-bold tracking-wide">KETUA RT {rtNumber || '...'} RW {rwNumber || '...'} {kelurahan ? `DESA ${kelurahan.toUpperCase()}` : ''}</p>
                  <p className="text-xs font-bold tracking-wide">{kecamatan ? `KECAMATAN ${kecamatan.toUpperCase()}` : ''} - {(kabupaten || '').toUpperCase()}</p>
                </div>
                {stampUrl && <img src={stampUrl} alt="Stempel" className="w-12 h-12 object-contain opacity-50" />}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Simpan Pengaturan</>
          )}
        </Button>
      </div>
    </div>
  )
}
