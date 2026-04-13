'use client'

import { useEffect, useState } from 'react'
import { useAppStore, PageName } from '@/lib/store'
import PublicLanding from '@/components/rt/PublicLanding'
import LoginPage from '@/components/rt/LoginPage'
import DashboardPage from '@/components/rt/DashboardPage'
import DenahPage from '@/components/rt/DenahPage'
import IuranPage from '@/components/rt/IuranPage'
import SuratPage from '@/components/rt/SuratPage'
import AccountPage from '@/components/rt/AccountPage'
import AdminWargaPage from '@/components/rt/AdminWargaPage'
import AdminEdaranPage from '@/components/rt/AdminEdaranPage'
import AdminSuratPage from '@/components/rt/AdminSuratPage'
import AdminSettingsPage from '@/components/rt/AdminSettingsPage'
import { Home, Map, CreditCard, FileText, UserCircle, Bell, Shield, Mountain, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems: { page: PageName; icon: typeof Home; label: string }[] = [
  { page: 'dashboard', icon: Home, label: 'Home' },
  { page: 'denah', icon: Map, label: 'Denah' },
  { page: 'iuran', icon: CreditCard, label: 'Iuran' },
  { page: 'surat', icon: FileText, label: 'Surat' },
  { page: 'account', icon: UserCircle, label: 'Akun' },
]

const adminPages: PageName[] = ['admin-warga', 'admin-edaran', 'admin-surat', 'admin-settings']

export default function OrgApp() {
  const { user, organization, currentPage, setPage, login, isLoading, setLoading, showLogin, setShowLogin } = useAppStore()
  const [showNotifBadge, setShowNotifBadge] = useState(false)

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const stored = localStorage.getItem('rtdigital_session')
        if (stored) {
          const userData = JSON.parse(stored)
          // Verify the session belongs to this organization
          if (organization && userData.organizationId === organization.id) {
            login(userData)
          } else {
            localStorage.removeItem('rtdigital_session')
          }
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    checkSession()
  }, [organization, login, setLoading])

  // Check for unread notifications
  useEffect(() => {
    if (!user) return
    const checkNotifs = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`)
        if (res.ok) {
          const notifs = await res.json()
          setShowNotifBadge(notifs.some((n: { read: boolean }) => !n.read))
        }
      } catch { /* ignore */ }
    }
    checkNotifs()
  }, [user])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Memuat aplikasi...</p>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    if (showLogin) {
      return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative">
          <LoginPage
            onBack={() => setShowLogin(false)}
            organizationId={organization?.id}
            orgName={organization?.name}
          />
        </div>
      )
    }
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50">
        <PublicLanding />
      </div>
    )
  }

  const isAdminPage = adminPages.includes(currentPage)
  const initials = user.namaLengkap.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />
      case 'denah': return <DenahPage />
      case 'iuran': return <IuranPage />
      case 'surat': return <SuratPage />
      case 'account': return <AccountPage />
      case 'admin-warga': return <AdminWargaPage />
      case 'admin-edaran': return <AdminEdaranPage />
      case 'admin-surat': return <AdminSuratPage />
      case 'admin-settings': return <AdminSettingsPage />
      default: return <DashboardPage />
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-50 relative"
      style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(13,148,136,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(249,115,22,0.03) 0%, transparent 50%)' }}
    >
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAdminPage && (
              <button onClick={() => setPage('account')} className="p-1 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-4 h-4 text-slate-500" />
              </button>
            )}
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <Mountain className="w-4 h-4 text-teal-600" />
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">{organization?.name || 'RT Digital'}</p>
              <h1 className="text-sm font-bold text-slate-800">{user.namaLengkap}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'admin' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage('account')}
                className="relative p-2 hover:bg-slate-100 rounded-xl h-9 w-9"
              >
                <Shield className="w-5 h-5 text-orange-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage('account')}
              className="relative p-2 hover:bg-slate-100 rounded-xl h-9 w-9"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {showNotifBadge && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </Button>
            <button
              onClick={() => setPage('account')}
              className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center"
            >
              <span className="text-teal-700 font-bold text-xs">{initials}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {renderPage()}
      </main>

      {/* Bottom Navigation */}
      {!isAdminPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
          <div className="max-w-md mx-auto flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {navItems.map((item) => {
              const isActive = currentPage === item.page
              const Icon = item.icon
              return (
                <button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  className={`flex flex-col items-center py-2 px-4 transition-all ${
                    isActive ? 'text-teal-600' : 'text-slate-400'
                  }`}
                >
                  <Icon className={`w-6 h-6 transition-transform ${isActive ? '-translate-y-0.5' : ''}`} />
                  <span className={`text-xs mt-1 font-medium ${isActive ? 'text-teal-600' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
