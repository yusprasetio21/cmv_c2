'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, truncateText } from '@/lib/helpers'
import { Users, Wallet, FileDown, FileUp, CreditCard, FileText, Map, UserCircle, Bell, Shield, Clock, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Stats {
  totalWarga: number
  totalKas: number
  totalSuratMasuk: number
  totalSuratKeluar: number
  pendingPayments: number
  pendingLetters: number
}

interface Announcement {
  id: string
  judul: string
  isi: string
  tipe: string
  gambarUrl: string | null
  createdAt: string
}

export default function DashboardPage() {
  const { user, setPage } = useAppStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [bannerIndex, setBannerIndex] = useState(0)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

  // Load data on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [statsRes, annRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/announcements'),
        ])
        if (cancelled) return
        if (statsRes.ok) setStats(await statsRes.json())
        if (annRes.ok) {
          const data = await annRes.json()
          setAnnouncements(data)
        }
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Banner auto-rotate
  useEffect(() => {
    if (announcements.length < 2) return
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % Math.min(announcements.length, 5))
    }, 4000)
    return () => clearInterval(interval)
  }, [announcements.length])

  const bannerItems = announcements.slice(0, 5)
  const getBannerGradient = (tipe: string) => {
    switch (tipe) {
      case 'important': return 'from-red-600 to-red-700'
      case 'reminder': return 'from-amber-500 to-orange-600'
      default: return 'from-teal-600 to-teal-700'
    }
  }
  const getTypeLabel = (tipe: string) => {
    switch (tipe) {
      case 'important': return 'Penting'
      case 'reminder': return 'Reminder'
      default: return 'Info'
    }
  }
  const getAnnouncementIcon = (tipe: string) => {
    switch (tipe) {
      case 'important': return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'reminder': return <Clock className="w-5 h-5 text-amber-600" />
      default: return <Info className="w-5 h-5 text-blue-600" />
    }
  }
  const getAnnouncementBg = (tipe: string) => {
    switch (tipe) {
      case 'important': return 'bg-red-100'
      case 'reminder': return 'bg-amber-100'
      default: return 'bg-blue-100'
    }
  }

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Banner Slider */}
      {bannerItems.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl">
          <div className="relative h-48">
            {bannerItems.map((a, i) => (
              <div
                key={a.id}
                onClick={() => setSelectedAnnouncement(a)}
                className={`absolute inset-0 transition-opacity duration-500 cursor-pointer ${i === bannerIndex ? 'opacity-100' : 'opacity-0'}`}
              >
                {a.gambarUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={a.gambarUrl}
                      alt={a.judul}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium mb-2">
                        {getTypeLabel(a.tipe)}
                      </span>
                      <h3 className="text-white font-bold text-lg leading-tight">{a.judul}</h3>
                      <p className="text-white/80 text-sm mt-1">{truncateText(a.isi, 60)}</p>
                    </div>
                  </div>
                ) : (
                  <div className={`w-full h-full bg-gradient-to-r ${getBannerGradient(a.tipe)} p-5 flex flex-col justify-between`}>
                    <div>
                      <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs text-white font-medium mb-2">
                        {getTypeLabel(a.tipe)}
                      </span>
                      <h3 className="text-white font-bold text-lg leading-tight">{a.judul}</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-white/70 text-sm">{truncateText(a.isi, 60)}</p>
                      <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {bannerItems.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIndex(i)}
                className={`rounded-full transition-all ${i === bannerIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Users className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100', value: stats?.totalWarga || 0, label: 'Total Warga' },
          { icon: <Wallet className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-100', value: formatCurrency(stats?.totalKas || 0), label: 'Kas IPL' },
          { icon: <FileDown className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100', value: stats?.totalSuratMasuk || 0, label: 'Surat Disetujui' },
          { icon: <FileUp className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100', value: stats?.totalSuratKeluar || 0, label: 'Total Surat' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-slate-100 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-600/10 transition-all duration-300"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: <CreditCard className="w-5 h-5 text-teal-600" />, bg: 'bg-teal-100', label: 'Bayar Iuran', page: 'iuran' as const },
            { icon: <FileText className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-100', label: 'Ajukan Surat', page: 'surat' as const },
            { icon: <Map className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100', label: 'Denah RT', page: 'denah' as const },
            { icon: <UserCircle className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100', label: 'Data Keluarga', action: 'family' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => {
                if (item.page) setPage(item.page)
                else if (item.action === 'family') setPage('account')
              }}
              className="flex flex-col items-center p-3 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50 transition-all active:scale-95"
            >
              <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center mb-2`}>{item.icon}</div>
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Admin Quick Access */}
      {user?.role === 'admin' && (stats?.pendingPayments || stats?.pendingLetters) ? (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6" />
            <h3 className="font-semibold">Admin Panel</h3>
          </div>
          <div className="flex gap-4 text-sm">
            {stats.pendingPayments > 0 && <span>{stats.pendingPayments} iuran pending</span>}
            {stats.pendingLetters > 0 && <span>{stats.pendingLetters} surat pending</span>}
          </div>
        </div>
      ) : null}

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Pengumuman Terbaru</h2>
          <Bell className="w-5 h-5 text-slate-400" />
        </div>
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Belum ada pengumuman</p>
          ) : (
            announcements.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAnnouncement(a)}
                className="w-full text-left bg-white rounded-xl p-4 border border-slate-100 hover:border-teal-200 transition-all"
              >
                <div className="flex items-start gap-3">
                  {a.gambarUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={a.gambarUrl} alt={a.judul} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 ${getAnnouncementBg(a.tipe)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {getAnnouncementIcon(a.tipe)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm">{a.judul}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.isi}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(a.createdAt)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Announcement Detail Modal */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAnnouncement && getAnnouncementIcon(selectedAnnouncement.tipe)}
              {selectedAnnouncement?.judul}
            </DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <div className="space-y-3">
              {/* Image Preview */}
              {selectedAnnouncement.gambarUrl && (
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={selectedAnnouncement.gambarUrl}
                    alt={selectedAnnouncement.judul}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              {/* Banner Preview */}
              {!selectedAnnouncement.gambarUrl && (
                <div className="overflow-hidden rounded-xl">
                  <div className={`bg-gradient-to-r ${getBannerGradient(selectedAnnouncement.tipe)} p-5`}>
                    <span className="inline-block px-2.5 py-1 bg-white/20 rounded-full text-xs text-white font-medium mb-2">
                      {getTypeLabel(selectedAnnouncement.tipe)}
                    </span>
                    <h3 className="text-white font-bold text-lg leading-tight">{selectedAnnouncement.judul}</h3>
                    <p className="text-white/70 text-sm mt-2">{selectedAnnouncement.isi}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  selectedAnnouncement.tipe === 'important' ? 'bg-red-100 text-red-700' :
                  selectedAnnouncement.tipe === 'reminder' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {getTypeLabel(selectedAnnouncement.tipe)}
                </span>
                <span className="text-xs text-slate-400">{formatDate(selectedAnnouncement.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{selectedAnnouncement.isi}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
