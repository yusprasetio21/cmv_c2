'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserPlus, Pencil, Trash2, Search, Home, Users, ArrowLeft, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface WargaUser {
  id: string
  username: string
  namaLengkap: string
  role: string
  rumahId: string | null
  house: { nomorRumah: string } | null
  createdAt: string
}

interface House {
  id: string
  nomorRumah: string
  blok: string
  statusRumah: string
}

export default function AdminWargaPage() {
  const { setPage } = useAppStore()
  const [users, setUsers] = useState<WargaUser[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<WargaUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<WargaUser | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNama, setFormNama] = useState('')
  const [formRole, setFormRole] = useState('warga')
  const [formRumahId, setFormRumahId] = useState('')

  const hasLoaded = useRef(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  const fetchHouses = async () => {
    try {
      const res = await fetch('/api/houses')
      if (res.ok) setHouses(await res.json())
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    fetchUsers()
    fetchHouses()
  }, [])

  const filteredUsers = users.filter((u) =>
    u.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.rumahId || '').toLowerCase().includes(search.toLowerCase())
  )

  const openCreateForm = () => {
    setEditingUser(null)
    setFormUsername('')
    setFormPassword('')
    setFormNama('')
    setFormRole('warga')
    setFormRumahId('')
    setFormOpen(true)
  }

  const openEditForm = (user: WargaUser) => {
    setEditingUser(user)
    setFormUsername(user.username)
    setFormPassword('')
    setFormNama(user.namaLengkap)
    setFormRole(user.role)
    setFormRumahId(user.rumahId || '')
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formUsername || !formNama) {
      toast.error('Username dan nama wajib diisi')
      return
    }
    if (!editingUser && !formPassword) {
      toast.error('Password wajib diisi untuk user baru')
      return
    }

    setSubmitting(true)
    try {
      if (editingUser) {
        const body: Record<string, string> = {
          nama_lengkap: formNama,
          role: formRole,
          rumah_id: formRumahId || '',
        }
        if (formPassword) body.password = formPassword
        if (formUsername !== editingUser.username) body.username = formUsername

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          toast.success('Data warga berhasil diperbarui')
          setFormOpen(false)
          fetchUsers()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal memperbarui data')
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formUsername,
            password: formPassword,
            nama_lengkap: formNama,
            role: formRole,
            rumah_id: formRumahId || null,
          }),
        })
        if (res.ok) {
          toast.success('Warga baru berhasil ditambahkan')
          setFormOpen(false)
          fetchUsers()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal menambahkan warga')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Warga berhasil dihapus')
        setDeleteOpen(false)
        setDeletingUser(null)
        fetchUsers()
      } else {
        toast.error('Gagal menghapus warga')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  // Available houses (unassigned + current user's house)
  const availableHouses = houses.filter((h) => {
    if (editingUser && h.nomorRumah === editingUser.rumahId) return true
    return !users.some((u) => u.rumahId === h.nomorRumah)
  })

  return (
    <div className="px-5 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setPage('account')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">Kelola Warga</h2>
          <p className="text-sm text-slate-500">{users.length} warga terdaftar</p>
        </div>
        <Button onClick={openCreateForm} size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">
          <UserPlus className="w-4 h-4 mr-1" /> Tambah
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, username, atau rumah..."
          className="pl-12 py-3 bg-white border-slate-200 rounded-xl"
        />
      </div>

      {/* User List */}
      <ScrollArea className="max-h-[calc(100vh-280px)]">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Memuat data...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">Tidak ada warga ditemukan</p>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 text-sm">{u.namaLengkap}</span>
                      <Badge className={u.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}>
                        {u.role === 'admin' ? 'Ketua RT' : 'Warga'}
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-xs text-slate-500">
                      <p>Username: <span className="font-medium text-slate-700">{u.username}</span></p>
                      <p>Rumah: <span className="font-medium text-slate-700">{u.house?.nomorRumah || u.rumahId || '-'}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditForm(u)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => { setDeletingUser(u); setDeleteOpen(true) }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Form Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Warga' : 'Tambah Warga Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap *</Label>
              <Input
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="py-2.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Username *</Label>
                <Input
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Username login"
                  className="py-2.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">
                  Password {editingUser ? '(kosongkan jika tidak diubah)' : '*'}
                </Label>
                <Input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? '••••••' : 'Password'}
                  className="py-2.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Role</Label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="warga">Warga</option>
                  <option value="admin">Ketua RT (Admin)</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5">Rumah</Label>
                <select
                  value={formRumahId}
                  onChange={(e) => setFormRumahId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">-- Tidak ada --</option>
                  {availableHouses.map((h) => (
                    <option key={h.id} value={h.nomorRumah}>{h.nomorRumah} ({h.statusRumah})</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              {submitting ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Tambah Warga'}
            </Button>
          </div>
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
              Apakah Anda yakin ingin menghapus warga <strong>{deletingUser?.namaLengkap}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                className="flex-1 rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handleDelete}
                disabled={submitting}
                variant="destructive"
                className="flex-1 rounded-xl"
              >
                {submitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
