'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Users, Loader2 } from 'lucide-react'

interface House {
  id: string
  nomorRumah: string
  blok: string
  statusRumah: string
  resident: { id: string; nama_lengkap: string; username: string } | null
}

export default function DenahPage() {
  const { organization } = useAppStore()
  const [bloks, setBloks] = useState<string[]>([])
  const [selectedBlok, setSelectedBlok] = useState('')
  const [houses, setHouses] = useState<House[]>([])
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null)
  const [loading, setLoading] = useState(true)

  const hasLoaded = useRef(false)
  const prevBlok = useRef('')

  // Load bloks on mount
  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true

    const loadBloks = async () => {
      try {
        const params = new URLSearchParams({ distinct_blok: 'true' })
        if (organization?.id) params.set('organization_id', organization.id)
        const res = await fetch(`/api/houses?${params.toString()}`)
        if (res.ok) {
          const data: string[] = await res.json()
          setBloks(data)
          if (data.length > 0) {
            setSelectedBlok(data[0])
          }
        }
      } catch { /* ignore */ }
    }
    loadBloks()
  }, [organization?.id])

  // Load houses when selectedBlok changes
  useEffect(() => {
    if (!selectedBlok || prevBlok.current === selectedBlok) return
    prevBlok.current = selectedBlok

    const loadHouses = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ blok: selectedBlok })
        if (organization?.id) params.set('organization_id', organization.id)
        const res = await fetch(`/api/houses?${params.toString()}`)
        if (res.ok) {
          const data: House[] = await res.json()
          setHouses(data)
        }
      } catch { /* ignore */ }
      setLoading(false)
      setSelectedHouse(null)
    }
    loadHouses()
  }, [selectedBlok, organization?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-emerald-500 text-white'
      case 'rented': return 'bg-amber-500 text-white'
      case 'renovation': return 'bg-orange-500 text-white'
      default: return 'bg-slate-300 text-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied': return 'Terisi'
      case 'rented': return 'Disewakan'
      case 'renovation': return 'Renovasi'
      default: return 'Kosong'
    }
  }

  return (
    <div className="px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Denah Warga</h2>
          <p className="text-sm text-slate-500">Klik rumah untuk detail</p>
        </div>
        {bloks.length > 0 ? (
          <select
            value={selectedBlok}
            onChange={(e) => setSelectedBlok(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
          >
            {bloks.map((b) => (
              <option key={b} value={b}>Blok {b}</option>
            ))}
          </select>
        ) : (
          !loading && <Badge variant="secondary" className="text-xs">Belum ada blok</Badge>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-xl border border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-xs text-slate-600">Terisi</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-slate-300" />
          <span className="text-xs text-slate-600">Kosong</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-500" />
          <span className="text-xs text-slate-600">Ngontrak</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-orange-500" />
          <span className="text-xs text-slate-600">Renovasi</span>
        </div>
      </div>

      {/* House Grid */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
        ) : bloks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">Belum ada data rumah</p>
            <p className="text-xs text-slate-400 mt-1">Admin dapat menambahkan rumah di menu Kelola Warga</p>
          </div>
        ) : houses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">Tidak ada rumah di Blok {selectedBlok}</p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-2">
            {houses.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedHouse(h)}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-105 active:scale-95 ${getStatusColor(h.statusRumah)} ${selectedHouse?.id === h.id ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}
                title={`${h.nomorRumah} - ${getStatusLabel(h.statusRumah)}${h.resident ? ` - ${h.resident.nama_lengkap}` : ''}`}
              >
                {h.nomorRumah.includes('-') ? h.nomorRumah.split('-').pop() : h.nomorRumah}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected House Info */}
      {selectedHouse && (
        <div className="mt-4 bg-white rounded-2xl p-4 border border-teal-200 animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-teal-700 font-bold text-sm">{selectedHouse.nomorRumah}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">{selectedHouse.nomorRumah}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  Blok {selectedHouse.blok}
                </Badge>
                <Badge className={`${getStatusColor(selectedHouse.statusRumah)} border-0 capitalize`}>
                  {getStatusLabel(selectedHouse.statusRumah)}
                </Badge>
              </div>
              {selectedHouse.resident && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  <span>{selectedHouse.resident.nama_lengkap}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
