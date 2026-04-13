'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, Lock, Eye, EyeOff, ArrowLeft, Mountain } from 'lucide-react'

interface LoginPageProps {
  onBack?: () => void
  organizationId?: string | null
  orgName?: string | null
}

export default function LoginPage({ onBack, organizationId, orgName }: LoginPageProps) {
  const { login } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Isi username dan password')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, organizationId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login gagal')
        return
      }
      login(data)
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {onBack && (
        <div className="px-4 pt-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}

      <div className="bg-gradient-to-br from-teal-600 to-teal-800 px-6 pt-8 pb-16 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl mx-auto mb-4 flex items-center justify-center">
            {orgName ? (
              <Home className="w-12 h-12 text-teal-600" />
            ) : (
              <Mountain className="w-12 h-12 text-teal-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{orgName || 'RT Digital'}</h1>
          <p className="text-teal-100 text-sm">Masuk ke akun Anda</p>
        </div>
      </div>

      <div className="px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-6 animate-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">Username</Label>
              <div className="relative">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username Anda"
                  className="pl-12 py-3.5 bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password Anda"
                  className="pl-12 pr-12 py-3.5 bg-slate-50 border-slate-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-600/25 mt-6"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
