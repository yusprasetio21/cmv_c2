'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Pencil, Trash2, ArrowLeft, AlertTriangle, Clock, Info, Megaphone, Eye, ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, truncateText } from '@/lib/helpers'

interface Announcement {
  id: string
  judul: string
  isi: string
  tipe: string
  gambarUrl: string | null
  createdAt: string
}

export default function AdminEdaranPage() {
  const { setPage } = useAppStore()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Announcement | null>(null)
  const [deletingItem, setDeletingItem] = useState<Announcement | null>(null)
  const [previewItem, setPreviewItem] = useState<Announcement | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formJudul, setFormJudul] = useState('')
  const [formIsi, setFormIsi] = useState('')
  const [formTipe, setFormTipe] = useState('info')
  const [formGambarUrl, setFormGambarUrl] = useState('')

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) setAnnouncements(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  // Always load fresh data when page mounts
  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const openCreateForm = () => {
    setEditingItem(null)
    setFormJudul('')
    setFormIsi('')
    setFormTipe('info')
    setFormGambarUrl('')
    setFormOpen(true)
  }

  const openEditForm = (item: Announcement) => {
    setEditingItem(item)
    setFormJudul(item.judul)
    setFormIsi(item.isi)
    setFormTipe(item.tipe)
    setFormGambarUrl(item.gambarUrl || '')
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formJudul || !formIsi) {
      toast.error('Judul dan isi pengumuman wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      if (editingItem) {
        const res = await fetch(`/api/announcements/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ judul: formJudul, isi: formIsi, tipe: formTipe, gambarUrl: formGambarUrl || null }),
        })
        if (res.ok) {
          toast.success('Pengumuman berhasil diperbarui')
          setFormOpen(false)
          fetchAnnouncements()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal memperbarui pengumuman')
        }
      } else {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ judul: formJudul, isi: formIsi, tipe: formTipe, gambarUrl: formGambarUrl || null }),
        })
        if (res.ok) {
          toast.success('Pengumuman baru berhasil ditambahkan')
          setFormOpen(false)
          fetchAnnouncements()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal menambahkan pengumuman')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/announcements/${deletingItem.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Pengumuman berhasil dihapus')
        setDeleteOpen(false)
        setDeletingItem(null)
        fetchAnnouncements()
      } else {
        toast.error('Gagal menghapus pengumuman')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const getTypeIcon = (tipe: string) => {
    switch (tipe) {
      case 'important': return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'reminder': return <Clock className="w-5 h-5 text-amber-600" />
      default: return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getTypeBg = (tipe: string) => {
    switch (tipe) {
      case 'important': return 'bg-red-100'
      case 'reminder': return 'bg-amber-100'
      default: return 'bg-blue-100'
    }
  }

  const getTypeLabel = (tipe: string) => {
    switch (tipe) {
      case 'important': return 'Penting'
      case 'reminder': return 'Reminder'
      default: return 'Info'
    }
  }

  const getBannerGradient = (tipe: string) => {
    switch (tipe) {
      case 'important': return 'from-red-600 to-red-700'
      case 'reminder': return 'from-amber-500 to-orange-600'
      default: return 'from-teal-600 to-teal-700'
    }
  }

  return (
    <div className="px-5 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setPage('account')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">Kelola Edaran</h2>
          <p className="text-sm text-slate-500">{announcements.length} pengumuman</p>
        </div>
        <Button onClick={openCreateForm} size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">
          <Plus className="w-4 h-4 mr-1" /> Buat Baru
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-4 mb-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="w-6 h-6" />
          <h3 className="font-semibold">Edaran & Banner RT</h3>
        </div>
        <p className="text-teal-100 text-sm">Kelola pengumuman dan informasi yang tampil di banner halaman utama. Pengumuman terbaru akan otomatis tampil sebagai banner slider di Dashboard dan halaman publik. Mendukung gambar untuk tampilan lebih menarik.</p>
      </div>

      {/* Announcement List */}
      <ScrollArea className="max-h-[calc(100vh-340px)]">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Memuat data...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Belum ada pengumuman</p>
              <p className="text-slate-400 text-xs mt-1">Klik &quot;Buat Baru&quot; untuk menambahkan</p>
            </div>
          ) : (
            announcements.map((a, idx) => (
              <div key={a.id} className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-start gap-3">
                  {a.gambarUrl ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={a.gambarUrl} alt={a.judul} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 ${getTypeBg(a.tipe)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {getTypeIcon(a.tipe)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 text-sm">{a.judul}</span>
                      {idx < 5 && (
                        <Badge className="bg-teal-100 text-teal-700 text-[10px]">Banner #{idx + 1}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-1">{a.isi}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${
                        a.tipe === 'important' ? 'bg-red-100 text-red-700' :
                        a.tipe === 'reminder' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {getTypeLabel(a.tipe)}
                      </Badge>
                      {a.gambarUrl && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                          <ImageIcon className="w-3 h-3 mr-0.5" /> Gambar
                        </Badge>
                      )}
                      <span className="text-[10px] text-slate-400">{formatDate(a.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setPreviewItem(a); setPreviewOpen(true) }}
                      className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => openEditForm(a)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => { setDeletingItem(a); setDeleteOpen(true) }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Banner Preview */}
                {idx < 5 && (
                  <div className="mt-3 overflow-hidden rounded-lg">
                    {a.gambarUrl ? (
                      <div className="relative h-20">
                        <img src={a.gambarUrl} alt={a.judul} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <span className="inline-block px-1.5 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[8px] text-white font-medium mb-0.5">
                            {getTypeLabel(a.tipe)}
                          </span>
                          <h4 className="text-white font-bold text-xs leading-tight">{a.judul}</h4>
                        </div>
                      </div>
                    ) : (
                      <div className={`bg-gradient-to-r ${getBannerGradient(a.tipe)} p-3`}>
                        <span className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-medium mb-1">
                          {getTypeLabel(a.tipe)}
                        </span>
                        <h4 className="text-white font-bold text-sm leading-tight">{a.judul}</h4>
                        <p className="text-white/70 text-xs mt-1">{truncateText(a.isi, 50)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Form Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Judul Pengumuman *</Label>
              <Input
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value)}
                placeholder="Contoh: Rapat RT Bulanan"
                className="py-2.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Isi Pengumuman *</Label>
              <Textarea
                value={formIsi}
                onChange={(e) => setFormIsi(e.target.value)}
                placeholder="Tulis isi pengumuman..."
                rows={4}
                className="bg-slate-50 border-slate-200 rounded-xl resize-none"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Tipe / Kategori</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'info', label: 'Info', icon: <Info className="w-4 h-4" />, activeClass: 'bg-blue-100 border-blue-400 text-blue-700' },
                  { value: 'important', label: 'Penting', icon: <AlertTriangle className="w-4 h-4" />, activeClass: 'bg-red-100 border-red-400 text-red-700' },
                  { value: 'reminder', label: 'Reminder', icon: <Clock className="w-4 h-4" />, activeClass: 'bg-amber-100 border-amber-400 text-amber-700' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setFormTipe(t.value)}
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      formTipe === t.value ? t.activeClass : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" /> Gambar Banner (opsional)
              </Label>
              <div className="relative">
                <Input
                  value={formGambarUrl}
                  onChange={(e) => setFormGambarUrl(e.target.value)}
                  placeholder="Masukkan URL gambar (https://...)"
                  className="py-2.5 pr-8"
                />
                {formGambarUrl && (
                  <button
                    onClick={() => setFormGambarUrl('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tambahkan URL gambar untuk tampilan banner yang lebih menarik</p>
            </div>

            {/* Banner Preview */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Preview Banner</Label>
              <div className="overflow-hidden rounded-xl">
                {formGambarUrl ? (
                  <div className="relative h-32">
                    <img
                      src={formGambarUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className={`hidden w-full h-full bg-gradient-to-r ${getBannerGradient(formTipe)} p-4 flex flex-col justify-between`}>
                      <span className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-medium mb-2">
                        {getTypeLabel(formTipe)}
                      </span>
                      <h4 className="text-white font-bold text-base leading-tight">{formJudul || 'Judul Pengumuman'}</h4>
                      <p className="text-white/70 text-sm mt-2">{formIsi ? truncateText(formIsi, 80) : 'Isi pengumuman...'}</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] text-white font-medium mb-1">
                        {getTypeLabel(formTipe)}
                      </span>
                      <h4 className="text-white font-bold text-sm leading-tight">{formJudul || 'Judul Pengumuman'}</h4>
                      <p className="text-white/80 text-xs mt-1">{formIsi ? truncateText(formIsi, 60) : 'Isi pengumuman...'}</p>
                    </div>
                  </div>
                ) : (
                  <div className={`bg-gradient-to-r ${getBannerGradient(formTipe)} p-4`}>
                    <span className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-medium mb-2">
                      {getTypeLabel(formTipe)}
                    </span>
                    <h4 className="text-white font-bold text-base leading-tight">{formJudul || 'Judul Pengumuman'}</h4>
                    <p className="text-white/70 text-sm mt-2">{formIsi ? truncateText(formIsi, 80) : 'Isi pengumuman...'}</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Buat Pengumuman'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem && getTypeIcon(previewItem.tipe)}
              {previewItem?.judul}
            </DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-3">
              {/* Image Preview */}
              {previewItem.gambarUrl && (
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={previewItem.gambarUrl}
                    alt={previewItem.judul}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              {/* Banner Preview */}
              {!previewItem.gambarUrl && (
                <div className="overflow-hidden rounded-xl">
                  <div className={`bg-gradient-to-r ${getBannerGradient(previewItem.tipe)} p-5`}>
                    <span className="inline-block px-2.5 py-1 bg-white/20 rounded-full text-xs text-white font-medium mb-2">
                      {getTypeLabel(previewItem.tipe)}
                    </span>
                    <h3 className="text-white font-bold text-lg leading-tight">{previewItem.judul}</h3>
                    <p className="text-white/70 text-sm mt-2">{previewItem.isi}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge className={
                  previewItem.tipe === 'important' ? 'bg-red-100 text-red-700' :
                  previewItem.tipe === 'reminder' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }>
                  {getTypeLabel(previewItem.tipe)}
                </Badge>
                {previewItem.gambarUrl && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <ImageIcon className="w-3 h-3 mr-1" /> Gambar
                  </Badge>
                )}
                <span className="text-xs text-slate-400">{formatDate(previewItem.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{previewItem.isi}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Konfirmasi Hapus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus pengumuman <strong>&quot;{deletingItem?.judul}&quot;</strong>?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1 rounded-xl">
                Batal
              </Button>
              <Button onClick={handleDelete} disabled={submitting} variant="destructive" className="flex-1 rounded-xl">
                {submitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
