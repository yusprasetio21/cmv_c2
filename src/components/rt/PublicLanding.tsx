'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, truncateText, formatDate } from '@/lib/helpers'
import { Users, Wallet, CreditCard, FileText, Map, ChevronRight, Bell, LogIn, Clock, AlertTriangle, Info, Mountain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PublicStats {
  totalWarga: number
  totalKas: number
  recentPayments: number
  totalAnnouncements: number
}

interface Announcement {
  id: string
  judul: string
  isi: string
  tipe: string
  gambarUrl: string | null
  createdAt: string
}

export default function PublicLanding() {
  const { setShowLogin, organization } = useAppStore()
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [bannerIndex, setBannerIndex] = useState(0)

  // Load data on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const orgId = organization?.id || ''
        const [statsRes, annRes] = await Promise.all([
          fetch(`/api/public/stats${orgId ? `?organizationId=${orgId}` : ''}`),
          fetch(`/api/announcements${orgId ? `?organizationId=${orgId}` : ''}`),
        ])
        if (cancelled) return
        if (statsRes.ok) setStats(await statsRes.json())
        if (annRes.ok) setAnnouncements(await annRes.json())
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [organization])

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
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

        <div className="relative z-10 px-6 pt-10 pb-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl mx-auto mb-4 flex items-center justify-center overflow-hidden">
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="w-12 h-12 object-contain" />
            ) : (
              <Mountain className="w-10 h-10 text-teal-600" />
            )}
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{organization?.name || 'RT Digital'}</h1>
          <p className="text-teal-100 text-sm mb-1">RT {organization?.rtNumber || '...'} RW {organization?.rwNumber || '...'}</p>
          <p className="text-teal-200/70 text-xs">{organization ? `Desa ${organization.kelurahan}, Kec. ${organization.kecamatan}, ${organization.kabupaten}` : 'Sistem Manajemen RT Terpadu'}</p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="relative z-10 px-6 pb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <Users className="w-5 h-5 text-teal-100 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{stats.totalWarga}</p>
                <p className="text-teal-200 text-[10px]">Warga</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <Wallet className="w-5 h-5 text-teal-100 mx-auto mb-1" />
                <p className="text-white font-bold text-sm">{formatCurrency(stats.totalKas)}</p>
                <p className="text-teal-200 text-[10px]">Kas IPL</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <CreditCard className="w-5 h-5 text-teal-100 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{stats.recentPayments}</p>
                <p className="text-teal-200 text-[10px]">Bayar IPL</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 -mt-4 relative z-10 space-y-5 pb-8">
        {/* Login Button */}
        <Button
          onClick={() => setShowLogin(true)}
          className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-2xl shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          Masuk ke Akun
        </Button>

        {/* Banner Slider */}
        {bannerItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-800">Informasi Terbaru</h2>
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
            <div className="relative overflow-hidden rounded-2xl">
              <div className="relative h-44">
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
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] text-white font-medium mb-1.5">
                            {getTypeLabel(a.tipe)}
                          </span>
                          <h3 className="text-white font-bold text-sm leading-tight">{a.judul}</h3>
                          <p className="text-white/80 text-xs mt-1">{truncateText(a.isi, 50)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-r ${getBannerGradient(a.tipe)} p-5 flex flex-col justify-between`}>
                        <div>
                          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs text-white font-medium mb-2">
                            {getTypeLabel(a.tipe)}
                          </span>
                          <h3 className="text-white font-bold text-base leading-tight">{a.judul}</h3>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-white/70 text-sm">{truncateText(a.isi, 50)}</p>
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
          </div>
        )}

        {/* Announcement List */}
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3">Pengumuman</h2>
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

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Map className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs font-medium text-slate-700">Denah Warga</p>
            <p className="text-[10px] text-slate-400 mt-1">Login untuk melihat</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xs font-medium text-slate-700">Pengajuan Surat</p>
            <p className="text-[10px] text-slate-400 mt-1">Login untuk mengajukan</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-2">
          <p className="text-xs text-slate-400">© 2026 {organization?.name || 'RT Digital'}</p>
          <p className="text-[10px] text-slate-300 mt-1">RT Digital - Sistem Manajemen RT Terpadu</p>
          <p className="text-[10px] text-slate-300 mt-1">Powered By YunichTech CMV</p>
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
