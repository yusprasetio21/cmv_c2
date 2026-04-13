'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Users, LogOut, Shield, FileText, CreditCard, Bell, Megaphone, Settings, ChevronRight, Mountain } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDate, formatCurrency, getMonthName, getStatusBadgeClass, getStatusLabel, calculateAge, formatDateLong } from '@/lib/helpers'

interface FamilyMember {
  namaLengkap: string
  hubungan: string
  tanggalLahir: string
  pekerjaanSekolah: string
}

interface FamilyData {
  id: string
  namaKk: string
  tempatLahir: string
  tanggalLahir: string
  jenisKelamin: string
  agama: string
  pekerjaan: string
  noHp: string
  members: FamilyMember[]
}

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

interface PendingItem {
  id: string
  type: 'payment' | 'letter'
  detail: string
  status: string
  createdAt: string
  userId: string
  userName: string
}

export default function AccountPage() {
  const { user, logout, setPage } = useAppStore()
  const [familyOpen, setFamilyOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [familyData, setFamilyData] = useState<FamilyData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])

  // Edit form state
  const [editNamaKk, setEditNamaKk] = useState('')
  const [editTempatLahir, setEditTempatLahir] = useState('')
  const [editTanggalLahir, setEditTanggalLahir] = useState('')
  const [editJenisKelamin, setEditJenisKelamin] = useState('')
  const [editAgama, setEditAgama] = useState('')
  const [editPekerjaan, setEditPekerjaan] = useState('')
  const [editNoHp, setEditNoHp] = useState('')
  const [editMembers, setEditMembers] = useState<FamilyMember[]>([])

  const loadFamilyDataRef = useRef(false)
  const fetchFamilyData = async () => {
    if (!user) return
    const res = await fetch(`/api/family?userId=${user.id}`)
    if (res.ok) {
      const data = await res.json()
      if (data) {
        const members = typeof data.members === 'string' ? JSON.parse(data.members) : data.members || []
        setFamilyData({ ...data, members })
        setEditNamaKk(data.namaKk || '')
        setEditTempatLahir(data.tempatLahir || '')
        setEditTanggalLahir(data.tanggalLahir || '')
        setEditJenisKelamin(data.jenisKelamin || '')
        setEditAgama(data.agama || '')
        setEditPekerjaan(data.pekerjaan || '')
        setEditNoHp(data.noHp || '')
        setEditMembers(members)
      }
    }
  }

  const fetchNotifications = async () => {
    if (!user) return
    const res = await fetch(`/api/notifications?userId=${user.id}`)
    if (res.ok) setNotifications(await res.json())
  }

  const fetchPendingItems = async () => {
    if (!user || user.role !== 'admin') return
    try {
      const [payRes, letRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/letters'),
      ])
      const payments = payRes.ok ? await payRes.json() : []
      const letters = letRes.ok ? await letRes.json() : []
      const items: PendingItem[] = [
        ...payments
          .filter((p: { status: string }) => p.status === 'pending')
          .map((p: { id: string; tahun: number; bulan: number; nominal: number; createdAt: string; userId: string; user: { namaLengkap: string } }) => ({
            id: p.id,
            type: 'payment' as const,
            detail: `Iuran ${getMonthName(p.bulan)} ${p.tahun} - ${formatCurrency(p.nominal)}`,
            status: p.status,
            createdAt: p.createdAt,
            userId: p.userId,
            userName: p.user?.namaLengkap || '-',
          })),
        ...letters
          .filter((l: { status: string }) => l.status === 'pending')
          .map((l: { id: string; jenisSurat: string; createdAt: string; userId: string; user: { namaLengkap: string } }) => ({
            id: l.id,
            type: 'letter' as const,
            detail: `Surat ${l.jenisSurat}`,
            status: l.status,
            createdAt: l.createdAt,
            userId: l.userId,
            userName: l.user?.namaLengkap || '-',
          })),
      ]
      setPendingItems(items)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (loadFamilyDataRef.current) return
    loadFamilyDataRef.current = true
    fetchNotifications()
    fetchPendingItems()
  }, [])

  const openFamilyModal = async () => {
    await fetchFamilyData()
    setIsEditing(false)
    setFamilyOpen(true)
  }

  const saveFamilyData = async () => {
    if (!user) return
    try {
      const method = familyData ? 'PUT' : 'POST'
      const res = await fetch('/api/family', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          namaKk: editNamaKk,
          tempatLahir: editTempatLahir,
          tanggalLahir: editTanggalLahir,
          jenisKelamin: editJenisKelamin,
          agama: editAgama,
          pekerjaan: editPekerjaan,
          noHp: editNoHp,
          members: editMembers,
        }),
      })
      if (res.ok) {
        toast.success('Data keluarga berhasil disimpan!')
        setIsEditing(false)
        fetchFamilyData()
      } else {
        toast.error('Gagal menyimpan data')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    }
  }

  const handleApprove = async (item: PendingItem) => {
    const endpoint = item.type === 'payment' ? `/api/payments/${item.id}` : `/api/letters/${item.id}`
    const body = item.type === 'letter'
      ? { status: 'approved', nomorSurat: `${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}/Sekrt-RT/${new Date().getFullYear()}` }
      : { status: 'approved' }
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      toast.success('Berhasil disetujui!')
      fetchPendingItems()
    }
  }

  const handleReject = async (item: PendingItem) => {
    const endpoint = item.type === 'payment' ? `/api/payments/${item.id}` : `/api/letters/${item.id}`
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    })
    if (res.ok) {
      toast.success('Ditolak')
      fetchPendingItems()
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Anda telah keluar')
  }

  const initials = user?.namaLengkap?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '-'

  return (
    <div className="px-5 py-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 mb-6 text-center">
        <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-teal-700 font-bold text-2xl">{initials}</span>
        </div>
        <h2 className="text-lg font-bold text-slate-800">{user?.namaLengkap}</h2>
        <p className="text-sm text-slate-500">Rumah: {user?.house ? `${user.house.nomorRumah} (Blok ${user.house.blok})` : user?.rumahId || '-'}</p>
        <Badge className="mt-2 bg-teal-100 text-teal-700">{user?.role === 'admin' ? 'Ketua RT' : 'Warga'}</Badge>
      </div>

      {/* Admin Section */}
      {user?.role === 'admin' && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Admin Panel</h3>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => setPage('admin-warga')}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Kelola Warga & Rumah</p>
                <p className="text-xs text-slate-500">Tambah, edit, hapus warga & rumah</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => setPage('admin-edaran')}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Kelola Edaran & Banner</p>
                <p className="text-xs text-slate-500">Atur pengumuman & info banner</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => setPage('admin-surat')}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Kelola Surat</p>
                <p className="text-xs text-slate-500">Persetujuan & manajemen surat</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => setPage('admin-settings')}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <Mountain className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Pengaturan RT</p>
                <p className="text-xs text-slate-500">Data wilayah, logo, stempel, TTD</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={() => { fetchPendingItems(); setAdminOpen(true) }}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-800">Persetujuan Cepat</p>
                <p className="text-xs text-slate-500">{pendingItems.length} item pending</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      )}

      {/* User Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Akun Saya</h3>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button
            onClick={openFamilyModal}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-800">Data Keluarga</p>
              <p className="text-xs text-slate-500">Kelola data KK & anggota</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            onClick={() => { fetchNotifications(); setNotifOpen(true) }}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-800">Notifikasi</p>
              <p className="text-xs text-slate-500">{notifications.filter((n) => !n.read).length} belum dibaca</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-red-600"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Keluar dari Akun</p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-300" />
          </button>
        </div>
      </div>

      {/* Family Data Modal */}
      <Dialog open={familyOpen} onOpenChange={setFamilyOpen}>
        <DialogContent className="max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Data Keluarga
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsEditing(!isEditing)}
                className="ml-4"
              >
                {isEditing ? 'Batal' : 'Edit'}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">Kepala Keluarga</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1">Nama Lengkap *</Label>
                      <Input value={editNamaKk} onChange={(e) => setEditNamaKk(e.target.value)} className="py-2.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">Tempat Lahir</Label>
                        <Input value={editTempatLahir} onChange={(e) => setEditTempatLahir(e.target.value)} className="py-2.5" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">Tanggal Lahir</Label>
                        <Input type="date" value={editTanggalLahir} onChange={(e) => setEditTanggalLahir(e.target.value)} className="py-2.5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">Jenis Kelamin</Label>
                        <select value={editJenisKelamin} onChange={(e) => setEditJenisKelamin(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-600 mb-1">Agama</Label>
                        <select value={editAgama} onChange={(e) => setEditAgama(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1">Pekerjaan</Label>
                      <Input value={editPekerjaan} onChange={(e) => setEditPekerjaan(e.target.value)} className="py-2.5" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1">No. HP</Label>
                      <Input value={editNoHp} onChange={(e) => setEditNoHp(e.target.value)} className="py-2.5" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider">
                      Anggota Keluarga ({editMembers.length})
                    </h4>
                    <button
                      onClick={() => setEditMembers([...editMembers, { namaLengkap: '', hubungan: 'Anak', tanggalLahir: '', pekerjaanSekolah: '' }])}
                      className="text-xs text-teal-600 font-medium"
                    >
                      + Tambah
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editMembers.map((m, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">Anggota #{i + 1}</span>
                          <button onClick={() => setEditMembers(editMembers.filter((_, idx) => idx !== i))} className="text-red-500 text-xs">Hapus</button>
                        </div>
                        <div className="space-y-2">
                          <Input placeholder="Nama" value={m.namaLengkap} onChange={(e) => {
                            const newMembers = [...editMembers]
                            newMembers[i] = { ...newMembers[i], namaLengkap: e.target.value }
                            setEditMembers(newMembers)
                          }} className="py-2 text-sm" />
                          <div className="grid grid-cols-2 gap-2">
                            <select value={m.hubungan} onChange={(e) => {
                              const newMembers = [...editMembers]
                              newMembers[i] = { ...newMembers[i], hubungan: e.target.value }
                              setEditMembers(newMembers)
                            }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                              <option value="Suami">Suami</option>
                              <option value="Istri">Istri</option>
                              <option value="Anak">Anak</option>
                              <option value="Ayah">Ayah</option>
                              <option value="Ibu">Ibu</option>
                            </select>
                            <Input type="date" value={m.tanggalLahir} onChange={(e) => {
                              const newMembers = [...editMembers]
                              newMembers[i] = { ...newMembers[i], tanggalLahir: e.target.value }
                              setEditMembers(newMembers)
                            }} className="py-2 text-sm" />
                          </div>
                          <Input placeholder="Pekerjaan/Sekolah" value={m.pekerjaanSekolah} onChange={(e) => {
                            const newMembers = [...editMembers]
                            newMembers[i] = { ...newMembers[i], pekerjaanSekolah: e.target.value }
                            setEditMembers(newMembers)
                          }} className="py-2 text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={saveFamilyData} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl">
                  Simpan Perubahan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">Kepala Keluarga</h4>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Nama</span><span className="font-medium">{familyData?.namaKk || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">TTL</span><span className="font-medium">{familyData?.tempatLahir || '-'}, {formatDateLong(familyData?.tanggalLahir)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">JK</span><span className="font-medium">{familyData?.jenisKelamin || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Pekerjaan</span><span className="font-medium">{familyData?.pekerjaan || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">HP</span><span className="font-medium">{familyData?.noHp || '-'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3">
                    Anggota Keluarga ({familyData?.members?.length || 0})
                  </h4>
                  <div className="space-y-3">
                    {(familyData?.members || []).length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">Belum ada anggota</p>
                    ) : (
                      (familyData?.members || []).map((m, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-800">{m.namaLengkap}</span>
                            <Badge className="bg-teal-100 text-teal-700">{m.hubungan}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <div>TTL: {m.tempatLahir || '-'}, {formatDateLong(m.tanggalLahir)}</div>
                            <div>Usia: {calculateAge(m.tanggalLahir)} thn</div>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">{m.pekerjaanSekolah || '-'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifikasi</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-center text-slate-500 py-4">Tidak ada notifikasi</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`p-3 rounded-xl ${n.read ? 'bg-slate-50' : 'bg-teal-50'} transition-colors`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 ${n.read ? 'bg-slate-300' : 'bg-teal-500'} rounded-full mt-2 flex-shrink-0`} />
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{formatDate(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Admin Approval Modal */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Persetujuan Cepat</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {pendingItems.length === 0 ? (
                <p className="text-center text-slate-500 py-4">Tidak ada item pending</p>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-slate-800 text-sm">{item.detail}</span>
                        <p className="text-xs text-slate-500">oleh {item.userName}</p>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => handleApprove(item)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                        Setujui
                      </Button>
                      <Button size="sm" onClick={() => handleReject(item)} variant="destructive" className="flex-1">
                        Tolak
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
