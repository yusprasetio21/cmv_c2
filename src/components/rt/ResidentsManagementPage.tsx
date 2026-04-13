'use client'

import { useState, useEffect } from 'react'
import { useResidents } from '@/hooks/use-residents'
import { useResidentFilter } from '@/hooks/use-residents'
import { getAccessDeniedMessage } from '@/lib/access-control'

interface CurrentUser {
  id: string
  role: 'admin' | 'rw_manager' | 'ketua_rt' | 'warga'
  rtNumber?: string
  rwNumber?: string
  organizationId: string
}

interface ResidentsManagementPageProps {
  currentUser: CurrentUser
}

/**
 * Component untuk menampilkan dan mengelola warga per RT
 * 
 * Features:
 * - Ketua RT hanya bisa lihat warga RT-nya
 * - Admin bisa lihat semua RT
 * - Filter & search warga
 * - Add/edit/delete warga dengan permission check
 */
export function ResidentsManagementPage({
  currentUser,
}: ResidentsManagementPageProps) {
  const [selectedRT, setSelectedRT] = useState(currentUser.rtNumber || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<'all' | 'ketua_rt' | 'warga'>('all')
  const [isAddingResident, setIsAddingResident] = useState(false)

  // ====== FETCH DATA ======
  const {
    residents,
    loading,
    error: fetchError,
    total,
    refetch,
    addResident,
    updateResident,
    deleteResident,
  } = useResidents({
    rtNumber: selectedRT,
    search: searchQuery,
    role: selectedRole === 'all' ? undefined : selectedRole,
    organizationId: currentUser.organizationId,
    currentUserRole: currentUser.role,
    currentUserRt: currentUser.rtNumber,
  })

  // ====== CLIENT-SIDE FILTERING ======
  const { filtered, filterByRole, filterBySearch } = useResidentFilter(residents)

  // ====== HANDLERS ======

  const handleAddResident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Validasi: ketua_rt tidak boleh ubah RT
    const rtNumber = formData.get('rtNumber') as string
    if (currentUser.role === 'ketua_rt' && rtNumber !== currentUser.rtNumber) {
      alert('Anda hanya dapat menambah warga untuk RT Anda sendiri')
      return
    }

    const success = await addResident({
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      namaLengkap: formData.get('namaLengkap') as string,
      role: formData.get('role') as string,
      rtNumber: rtNumber,
      rwNumber: formData.get('rwNumber') as string,
      rumahId: formData.get('rumahId') as string,
    })

    if (success) {
      setIsAddingResident(false)
      alert('Warga berhasil ditambahkan')
      e.currentTarget.reset()
    }
  }

  const handleDeleteResident = async (residentId: string, residentName: string) => {
    if (!confirm(`Hapus warga "${residentName}"?`)) return

    const success = await deleteResident(residentId)
    if (success) {
      alert('Warga berhasil dihapus')
    }
  }

  // ====== RENDER ======

  // Ketua RT hanya bisa akses RT-nya sendiri
  const canAccessRT = (rtNumber: string): boolean => {
    if (currentUser.role === 'admin') return true
    if (currentUser.role === 'ketua_rt') return rtNumber === currentUser.rtNumber
    return false
  }

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-3xl font-bold">
          {currentUser.role === 'ketua_rt'
            ? `Warga RT ${currentUser.rtNumber}`
            : 'Manajemen Warga'}
        </h1>
        <p className="text-slate-500 mt-1">
          {currentUser.role === 'ketua_rt'
            ? 'Anda dapat melihat dan mengelola warga RT Anda saja'
            : 'Lihat dan kelola warga semua RT'}
        </p>
      </div>

      {/* ===== ERROR MESSAGE ===== */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">
            <strong>Error:</strong> {fetchError}
          </p>
        </div>
      )}

      {/* ===== FILTER & SEARCH ===== */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filter RT (disabled untuk ketua_rt) */}
          {currentUser.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pilih RT
              </label>
              <input
                type="text"
                value={selectedRT}
                onChange={(e) => setSelectedRT(e.target.value)}
                placeholder="Nomor RT (ex: 002)"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          )}

          {/* Filter Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => {
                const value = e.target.value as 'all' | 'ketua_rt' | 'warga'
                setSelectedRole(value)
                filterByRole(value)
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="all">Semua</option>
              <option value="ketua_rt">Ketua RT</option>
              <option value="warga">Warga</option>
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cari Warga
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                filterBySearch(e.target.value)
              }}
              placeholder="Nama atau username..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
          <div>
            <p className="text-slate-600 text-sm">Total Warga</p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </div>
          <div>
            <p className="text-slate-600 text-sm">Ketua RT</p>
            <p className="text-2xl font-bold text-slate-900">
              {residents.filter((r) => r.role === 'ketua_rt').length}
            </p>
          </div>
          <div>
            <p className="text-slate-600 text-sm">Warga Biasa</p>
            <p className="text-2xl font-bold text-slate-900">
              {residents.filter((r) => r.role === 'warga').length}
            </p>
          </div>
        </div>
      </div>

      {/* ===== ADD RESIDENT BUTTON ===== */}
      {!isAddingResident && (
        <button
          onClick={() => setIsAddingResident(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Tambah Warga
        </button>
      )}

      {/* ===== ADD RESIDENT FORM ===== */}
      {isAddingResident && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Tambah Warga Baru</h3>
          <form onSubmit={handleAddResident} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  name="namaLengkap"
                  required
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="john.doe"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  name="role"
                  required
                  defaultValue="warga"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="warga">Warga</option>
                  <option value="ketua_rt">Ketua RT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  RT {currentUser.role === 'ketua_rt' ? '(otomatis)' : '*'}
                </label>
                <input
                  type="text"
                  name="rtNumber"
                  defaultValue={currentUser.rtNumber}
                  disabled={currentUser.role === 'ketua_rt'}
                  placeholder="002"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">RW</label>
                <input
                  type="text"
                  name="rwNumber"
                  defaultValue={currentUser.rwNumber}
                  placeholder="013"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nomor Rumah</label>
                <input
                  type="text"
                  name="rumahId"
                  placeholder=\"Nomor rumah atau ID\"\n                  className=\"w-full px-3 py-2 border border-slate-300 rounded-md\"\n                />\n              </div>\n            </div>\n\n            <div className=\"flex gap-3 justify-end\">\n              <button\n                type=\"button\"\n                onClick={() => setIsAddingResident(false)}\n                className=\"px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50\"\n              >\n                Batal\n              </button>\n              <button\n                type=\"submit\"\n                className=\"px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700\"\n              >\n                Simpan\n              </button>\n            </div>\n          </form>\n        </div>\n      )}\n\n      {/* ===== RESIDENTS TABLE ===== */}\n      <div className=\"bg-white rounded-lg border border-slate-200 overflow-hidden\">\n        {loading ? (\n          <div className=\"p-8 text-center text-slate-500\">\n            Loading...\n          </div>\n        ) : filtered.length === 0 ? (\n          <div className=\"p-8 text-center text-slate-500\">\n            Tidak ada warga yang sesuai filter\n          </div>\n        ) : (\n          <table className=\"w-full\">\n            <thead className=\"bg-slate-50 border-b border-slate-200\">\n              <tr>\n                <th className=\"px-4 py-3 text-left text-sm font-semibold\">Nama</th>\n                <th className=\"px-4 py-3 text-left text-sm font-semibold\">Username</th>\n                <th className=\"px-4 py-3 text-left text-sm font-semibold\">Role</th>\n                <th className=\"px-4 py-3 text-left text-sm font-semibold\">RT/RW</th>\n                <th className=\"px-4 py-3 text-left text-sm font-semibold\">Rumah</th>\n                <th className=\"px-4 py-3 text-center text-sm font-semibold\">Aksi</th>\n              </tr>\n            </thead>\n            <tbody className=\"divide-y divide-slate-200\">\n              {filtered.map((resident) => (\n                <tr key={resident.id} className=\"hover:bg-slate-50\">\n                  <td className=\"px-4 py-3 font-medium text-slate-900\">\n                    {resident.namaLengkap}\n                  </td>\n                  <td className=\"px-4 py-3 text-slate-600\">{resident.username}</td>\n                  <td className=\"px-4 py-3\">\n                    <span\n                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${\n                        resident.role === 'ketua_rt'\n                          ? 'bg-purple-100 text-purple-700'\n                          : 'bg-blue-100 text-blue-700'\n                      }`}\n                    >\n                      {resident.role === 'ketua_rt' ? 'Ketua RT' : 'Warga'}\n                    </span>\n                  </td>\n                  <td className=\"px-4 py-3 text-slate-600\">\n                    {resident.rtNumber}/{resident.rwNumber || '-'}\n                  </td>\n                  <td className=\"px-4 py-3 text-slate-600\">\n                    {resident.rumahId || '-'}\n                  </td>\n                  <td className=\"px-4 py-3 text-center\">\n                    <button\n                      onClick={() =>\n                        handleDeleteResident(resident.id, resident.namaLengkap)\n                      }\n                      className=\"text-red-600 hover:text-red-700 text-sm font-semibold\"\n                    >\n                      Hapus\n                    </button>\n                  </td>\n                </tr>\n              ))}\n            </tbody>\n          </table>\n        )}\n      </div>\n\n      {/* ===== INFO BOX ===== */}\n      {currentUser.role === 'ketua_rt' && (\n        <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-4\">\n          <p className=\"text-blue-700 text-sm\">\n            <strong>ℹ️ Catatan:</strong> Sebagai Ketua RT, Anda hanya dapat melihat\n            dan mengelola warga RT {currentUser.rtNumber}. Untuk mengakses RT lain,\n            hubungi admin.\n          </p>\n        </div>\n      )}\n    </div>\n  )\n}\n