'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserPlus, Pencil, Trash2, Search, Home, Users, ArrowLeft, AlertTriangle, Plus, Building2, X } from 'lucide-react'
import { toast } from 'sonner'

interface WargaUser {
  id: string
  username: string
  namaLengkap: string
  role: string
  rumahId: string | null
  house: { nomorRumah: string; blok: string; statusRumah: string } | null
  createdAt: string
}

interface House {
  id: string
  nomorRumah: string
  blok: string
  statusRumah: string
  resident: { id: string; nama_lengkap: string; username: string } | null
}

type Tab = 'warga' | 'rumah'

export default function AdminWargaPage() {
  const { organization, setPage } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('warga')
  const [users, setUsers] = useState<WargaUser[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [bloks, setBloks] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<WargaUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<WargaUser | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // House management state
  const [houseFormOpen, setHouseFormOpen] = useState(false)
  const [editingHouse, setEditingHouse] = useState<House | null>(null)
  const [deletingHouse, setDeletingHouse] = useState<House | null>(null)
  const [deleteHouseOpen, setDeleteHouseOpen] = useState(false)
  const [filterBlok, setFilterBlok] = useState<string>('all')

  // User form state
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNama, setFormNama] = useState('')
  const [formRole, setFormRole] = useState('warga')
  const [formRumahId, setFormRumahId] = useState('')

  // House form state
  const [formNomorRumah, setFormNomorRumah] = useState('')
  const [formBlok, setFormBlok] = useState('')
  const [formStatusRumah, setFormStatusRumah] = useState('empty')
  const [newBlokInput, setNewBlokInput] = useState('')

  const hasLoaded = useRef(false)

  // Helper function untuk mendapatkan organization_id
  const getOrganizationId = () => {
    return organization?.id || null
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const orgId = getOrganizationId()
      const url = `/api/users?organization_id=${orgId || ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
    setLoading(false)
  }

  const fetchHouses = async () => {
    try {
      const params = new URLSearchParams()
      if (organization?.id) params.set('organization_id', organization.id)
      const res = await fetch(`/api/houses?${params.toString()}`)
      if (res.ok) setHouses(await res.json())
    } catch { /* ignore */ }
  }

  const fetchBloks = async () => {
    try {
      const params = new URLSearchParams({ distinct_blok: 'true' })
      if (organization?.id) params.set('organization_id', organization.id)
      const res = await fetch(`/api/houses?${params.toString()}`)
      if (res.ok) setBloks(await res.json())
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    fetchUsers()
    fetchHouses()
    fetchBloks()
  }, [organization])

  const filteredUsers = users.filter((u) =>
    u.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.house?.nomorRumah || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.house?.blok || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredHouses = houses.filter((h) =>
    filterBlok === 'all' || h.blok === filterBlok
  )

  // === USER MANAGEMENT ===

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

  const handleSubmitUser = async () => {
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
        // UPDATE user
        const body: Record<string, string> = {
          nama_lengkap: formNama,
          role: formRole,
          rumah_id: formRumahId || '',
        }
        if (formPassword) body.password = formPassword
        if (formUsername !== editingUser.username) body.username = formUsername

        const res = await fetch(`/api/users/${editingUser.id}?organization_id=${getOrganizationId()}`, {
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
        // CREATE user baru
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formUsername,
            password: formPassword,
            nama_lengkap: formNama,
            role: formRole,
            rumah_id: formRumahId || null,
            organization_id: getOrganizationId(),
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

  const handleDeleteUser = async () => {
    if (!deletingUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${deletingUser.id}?organization_id=${getOrganizationId()}`, { 
        method: 'DELETE' 
      })
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

  // Available houses for user assignment (unassigned + current user's house)
  const availableHouses = houses.filter((h) => {
    if (editingUser && h.id === editingUser.rumahId) return true
    return !users.some((u) => u.rumahId === h.id)
  })

  // === HOUSE MANAGEMENT ===

  const openCreateHouseForm = () => {
    setEditingHouse(null)
    setFormNomorRumah('')
    setFormBlok(bloks.length > 0 ? bloks[0] : '')
    setFormStatusRumah('empty')
    setNewBlokInput('')
    setHouseFormOpen(true)
  }

  const openEditHouseForm = (house: House) => {
    setEditingHouse(house)
    setFormNomorRumah(house.nomorRumah)
    setFormBlok(house.blok)
    setFormStatusRumah(house.statusRumah)
    setNewBlokInput('')
    setHouseFormOpen(true)
  }

  const handleSubmitHouse = async () => {
    const finalBlok = newBlokInput.trim() || formBlok
    if (!formNomorRumah || !finalBlok) {
      toast.error('Nomor rumah dan blok wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      if (editingHouse) {
        const res = await fetch('/api/houses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingHouse.id,
            nomorRumah: formNomorRumah,
            blok: finalBlok,
            statusRumah: formStatusRumah,
          }),
        })
        if (res.ok) {
          toast.success('Rumah berhasil diperbarui')
          setHouseFormOpen(false)
          fetchHouses()
          fetchBloks()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal memperbarui rumah')
        }
      } else {
        const res = await fetch('/api/houses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomorRumah: formNomorRumah,
            blok: finalBlok,
            statusRumah: formStatusRumah,
            organizationId: organization?.id || null,
          }),
        })
        if (res.ok) {
          toast.success('Rumah baru berhasil ditambahkan')
          setHouseFormOpen(false)
          fetchHouses()
          fetchBloks()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal menambahkan rumah')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteHouse = async () => {
    if (!deletingHouse) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/houses?id=${deletingHouse.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Rumah berhasil dihapus')
        setDeleteHouseOpen(false)
        setDeletingHouse(null)
        fetchHouses()
        fetchBloks()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus rumah')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied': return 'Terisi'
      case 'rented': return 'Sewa'
      case 'renovation': return 'Renovasi'
      default: return 'Kosong'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-emerald-100 text-emerald-700'
      case 'rented': return 'bg-amber-100 text-amber-700'
      case 'renovation': return 'bg-orange-100 text-orange-700'
      default: return 'bg-slate-100 text-slate-600'
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
          <h2 className="text-xl font-bold text-slate-800">Kelola Warga</h2>
          <p className="text-sm text-slate-500">{users.length} warga, {houses.length} rumah</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setActiveTab('warga')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'warga' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Warga ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('rumah')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'rumah' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Rumah ({houses.length})
        </button>
      </div>

      {/* === WARGA TAB === */}
      {activeTab === 'warga' && (
        <>
          {/* Search + Add */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, username, rumah..."
                className="pl-12 py-3 bg-white border-slate-200 rounded-xl"
              />
            </div>
            <Button onClick={openCreateForm} size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl px-4">
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          {/* User List */}
          <ScrollArea className="max-h-[calc(100vh-340px)]">
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
                          <Badge className={u.role === 'admin' ? 'bg-orange-100 text-orange-700 text-[10px]' : 'bg-teal-100 text-teal-700 text-[10px]'}>
                            {u.role === 'admin' ? 'Ketua RT' : 'Warga'}
                          </Badge>
                        </div>
                        <div className="space-y-0.5 text-xs text-slate-500">
                          <p>Username: <span className="font-medium text-slate-700">{u.username}</span></p>
                          <p>Rumah: <span className="font-medium text-slate-700">
                            {u.house ? `${u.house.nomorRumah} (Blok ${u.house.blok})` : '-'}
                          </span></p>
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
        </>
      )}

      {/* === RUMAH TAB === */}
      {activeTab === 'rumah' && (
        <>
          {/* Blok Filter + Add */}
          <div className="flex gap-2 mb-4">
            <select
              value={filterBlok}
              onChange={(e) => setFilterBlok(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
            >
              <option value="all">Semua Blok ({houses.length})</option>
              {bloks.map((b) => (
                <option key={b} value={b}>Blok {b} ({houses.filter(h => h.blok === b).length})</option>
              ))}
            </select>
            <Button onClick={openCreateHouseForm} size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl px-4">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Blok summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            {bloks.map((b) => {
              const blokHouses = houses.filter(h => h.blok === b)
              const occupied = blokHouses.filter(h => h.statusRumah === 'occupied').length
              return (
                <button
                  key={b}
                  onClick={() => setFilterBlok(filterBlok === b ? 'all' : b)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    filterBlok === b
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  Blok {b} · {occupied}/{blokHouses.length} terisi
                </button>
              )
            })}
          </div>

          {/* House List */}
          <ScrollArea className="max-h-[calc(100vh-400px)]">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Memuat data...</p>
                </div>
              ) : filteredHouses.length === 0 ? (
                <div className="text-center py-8">
                  <Home className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Belum ada rumah{filterBlok !== 'all' ? ` di Blok ${filterBlok}` : ''}</p>
                  <Button onClick={openCreateHouseForm} size="sm" variant="outline" className="mt-3 rounded-xl">
                    <Plus className="w-4 h-4 mr-1" /> Tambah Rumah
                  </Button>
                </div>
              ) : (
                filteredHouses.map((h) => (
                  <div key={h.id} className="bg-white rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{h.nomorRumah}</span>
                          <Badge className="bg-slate-100 text-slate-600 text-[10px]">Blok {h.blok}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`${getStatusColor(h.statusRumah)} text-[10px]`}>
                            {getStatusLabel(h.statusRumah)}
                          </Badge>
                          {h.resident && (
                            <span className="text-xs text-slate-500">{h.resident.nama_lengkap}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditHouseForm(h)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => { setDeletingHouse(h); setDeleteHouseOpen(true) }}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* ========== USER FORM MODAL ========== */}
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
                    <option key={h.id} value={h.id}>
                      {h.nomorRumah} - Blok {h.blok} ({getStatusLabel(h.statusRumah)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={handleSubmitUser}
              disabled={submitting}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              {submitting ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Tambah Warga'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== HOUSE FORM MODAL ========== */}
      <Dialog open={houseFormOpen} onOpenChange={setHouseFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHouse ? 'Edit Rumah' : 'Tambah Rumah Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Nomor Rumah *</Label>
              <Input
                value={formNomorRumah}
                onChange={(e) => setFormNomorRumah(e.target.value)}
                placeholder="Contoh: C1-01, A-5, 12"
                className="py-2.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Blok *</Label>
              {bloks.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={newBlokInput ? '__new__' : formBlok}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setNewBlokInput('')
                      } else {
                        setFormBlok(e.target.value)
                        setNewBlokInput('')
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                  >
                    {bloks.map((b) => (
                      <option key={b} value={b}>Blok {b}</option>
                    ))}
                    <option value="__new__">+ Blok Baru...</option>
                  </select>
                  {newBlokInput !== '' && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newBlokInput}
                        onChange={(e) => setNewBlokInput(e.target.value)}
                        placeholder="Nama blok baru"
                        className="py-2.5"
                        autoFocus
                      />
                      <button
                        onClick={() => setNewBlokInput('')}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  value={newBlokInput || formBlok}
                  onChange={(e) => {
                    setNewBlokInput(e.target.value)
                    setFormBlok('')
                  }}
                  placeholder="Masukkan nama blok (Contoh: A, B, C1)"
                  className="py-2.5"
                />
              )}
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5">Status Rumah</Label>
              <select
                value={formStatusRumah}
                onChange={(e) => setFormStatusRumah(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              >
                <option value="empty">Kosong</option>
                <option value="occupied">Terisi</option>
                <option value="rented">Sewa</option>
                <option value="renovation">Renovasi</option>
              </select>
            </div>
            <Button
              onClick={handleSubmitHouse}
              disabled={submitting}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
            >
              {submitting ? 'Menyimpan...' : editingHouse ? 'Simpan Perubahan' : 'Tambah Rumah'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== DELETE USER MODAL ========== */}
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
              <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1 rounded-xl">
                Batal
              </Button>
              <Button onClick={handleDeleteUser} disabled={submitting} variant="destructive" className="flex-1 rounded-xl">
                {submitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== DELETE HOUSE MODAL ========== */}
      <Dialog open={deleteHouseOpen} onOpenChange={setDeleteHouseOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Konfirmasi Hapus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus rumah <strong>{deletingHouse?.nomorRumah}</strong> (Blok {deletingHouse?.blok})?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            {deletingHouse?.resident && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                ⚠️ Rumah ini ditempati oleh {deletingHouse.resident.nama_lengkap}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteHouseOpen(false)} className="flex-1 rounded-xl">
                Batal
              </Button>
              <Button onClick={handleDeleteHouse} disabled={submitting} variant="destructive" className="flex-1 rounded-xl">
                {submitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}