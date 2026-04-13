'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import HomePage from '@/components/rt/HomePage'

export default function RTDigitalApp() {
  const { setOrgSlug, setOrganization, organization } = useAppStore()
  const [slugFromUrl, setSlugFromUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Detect slug from URL path
  useEffect(() => {
    const detectOrg = async () => {
      const path = window.location.pathname
      const slug = path.split('/').filter(Boolean)[0]

      if (slug && slug !== 'api' && slug !== '_next') {
        setSlugFromUrl(slug)
        setOrgSlug(slug)
        try {
          const res = await fetch(`/api/organizations?slug=${slug}`)
          if (res.ok) {
            const org = await res.json()
            setOrganization(org)
          }
        } catch { /* ignore */ }
      }
      setLoading(false)
    }
    detectOrg()
  }, [setOrgSlug, setOrganization])

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Memuat RT Digital...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <HomePage />
    </div>
  )
}
