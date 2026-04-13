/**
 * Hook untuk mengelola data warga per RT
 * Mengintegrasikan access control dan filter otomatis
 */

import { useState, useEffect, useCallback } from 'react'

export interface Resident {
  id: string
  username: string
  namaLengkap: string
  role: 'ketua_rt' | 'warga'
  rtNumber: string
  rwNumber?: string
  rumahId?: string
  familyData?: any
  createdAt: string
}

export interface UseResidentsOptions {
  rtNumber?: string
  rwNumber?: string
  search?: string
  role?: 'ketua_rt' | 'warga'
  organizationId: string
  currentUserRole: string
  currentUserRt?: string
  enabled?: boolean
}

export const useResidents = (options: UseResidentsOptions) => {
  const {
    rtNumber,
    rwNumber,
    search,
    role,
    organizationId,
    currentUserRole,
    currentUserRt,
    enabled = true,
  } = options

  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchResidents = useCallback(async () => {
    if (!enabled || !organizationId) return

    setLoading(true)
    setError(null)

    try {
      // Determine RT to fetch
      let queryRt = rtNumber

      // Jika user adalah ketua_rt dan tidak specify RT, gunakan RT-nya sendiri
      if (
        currentUserRole === 'ketua_rt' &&
        !rtNumber &&
        currentUserRt
      ) {
        queryRt = currentUserRt
      }

      if (!queryRt) {
        setError('RT number tidak tersedia')
        setResidents([])
        return
      }

      const params = new URLSearchParams({
        rt_number: queryRt,
        organization_id: organizationId,
        currentUserRole,
        currentUserRt: currentUserRt || '',
      })

      if (rwNumber) params.append('rw_number', rwNumber)
      if (search) params.append('search', search)
      if (role) params.append('role', role)

      const response = await fetch(`/api/residents?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengambil data warga')
      }

      const data = await response.json()
      setResidents(data.data || [])
      setTotal(data.count || 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setError(message)
      setResidents([])
    } finally {
      setLoading(false)
    }
  }, [
    enabled,
    organizationId,
    rtNumber,
    rwNumber,
    search,
    role,
    currentUserRole,
    currentUserRt,
  ])

  useEffect(() => {
    fetchResidents()
  }, [fetchResidents])

  const addResident = useCallback(
    async (resident: {
      username: string
      password: string
      namaLengkap: string
      role: string
      rtNumber: string
      rwNumber?: string
      rumahId?: string
    }) => {
      try {
        const response = await fetch('/api/residents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...resident,
            organizationId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Gagal menambah warga')
        }

        // Refresh list
        await fetchResidents()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
        setError(message)
        return false
      }
    },
    [organizationId, fetchResidents]
  )

  const updateResident = useCallback(
    async (residentId: string, updates: Partial<Resident>) => {
      try {
        const response = await fetch('/api/residents', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: residentId,
            ...updates,
            currentUserRole,
            currentUserRt,
            organizationId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Gagal mengupdate warga')
        }

        // Refresh list
        await fetchResidents()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
        setError(message)
        return false
      }
    },
    [organizationId, currentUserRole, currentUserRt, fetchResidents]
  )

  const deleteResident = useCallback(
    async (residentId: string) => {
      try {
        const response = await fetch('/api/residents', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: residentId,
            currentUserRole,
            currentUserRt,
            organizationId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Gagal menghapus warga')
        }

        // Refresh list
        await fetchResidents()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
        setError(message)
        return false
      }
    },
    [organizationId, currentUserRole, currentUserRt, fetchResidents]
  )

  return {
    residents,
    loading,
    error,
    total,
    refetch: fetchResidents,
    addResident,
    updateResident,
    deleteResident,
  }
}

/**
 * Hook untuk filter residents berdasarkan criteria
 */
export const useResidentFilter = (residents: Resident[]) => {
  const [filtered, setFiltered] = useState<Resident[]>(residents)

  const filterByRole = useCallback(
    (role: 'ketua_rt' | 'warga' | 'all') => {
      if (role === 'all') {
        setFiltered(residents)
      } else {
        setFiltered(residents.filter((r) => r.role === role))
      }
    },
    [residents]
  )

  const filterBySearch = useCallback(
    (query: string) => {
      const lowercase = query.toLowerCase()
      setFiltered(
        residents.filter(
          (r) =>
            r.namaLengkap.toLowerCase().includes(lowercase) ||
            r.username.toLowerCase().includes(lowercase)
        )
      )
    },
    [residents]
  )

  const sortByName = useCallback(() => {
    setFiltered([
      ...filtered.sort((a, b) =>
        a.namaLengkap.localeCompare(b.namaLengkap)
      ),
    ])
  }, [filtered])

  return {
    filtered,
    filterByRole,
    filterBySearch,
    sortByName,
    reset: () => setFiltered(residents),
  }
}
