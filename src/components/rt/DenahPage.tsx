'use client'

import { useEffect, useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface House {
  id: string
  nomorRumah: string
  blok: string
  statusRumah: string
  resident: { id: string; nama_lengkap: string; username: string } | null
}

export default function DenahPage() {
  const [blok, setBlok] = useState('C1')
  const [houses, setHouses] = useState<House[]>([])
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null)

  const prevBlok = useRef(blok)
  useEffect(() => {
    if (prevBlok.current === blok && houses.length > 0) return
    prevBlok.current = blok
    const loadHouses = async () => {
      const res = await fetch(`/api/houses?blok=${blok}`)
      if (res.ok) setHouses(await res.json())
      setSelectedHouse(null)
    }
    loadHouses()
  }, [blok, houses.length])

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
        <select
          value={blok}
          onChange={(e) => setBlok(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
        >
          <option value="C1">Blok C1</option>
          <option value="C2">Blok C2</option>
          <option value="D1">Blok D1</option>
        </select>
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
      </div>

      {/* House Grid */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="grid grid-cols-6 gap-2">
          {houses.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHouse(h)}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-105 active:scale-95 ${getStatusColor(h.statusRumah)} ${selectedHouse?.id === h.id ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`}
            >
              {h.nomorRumah.split('-')[1]}
            </button>
          ))}
        </div>
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
              <Badge variant="secondary" className="mt-1 capitalize">
                {getStatusLabel(selectedHouse.statusRumah)}
              </Badge>
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
