import { create } from 'zustand'

export interface User {
  id: string
  username: string
  namaLengkap: string
  role: string
  rumahId: string | null
  house: { nomorRumah: string } | null
}

export type PageName =
  | 'dashboard'
  | 'denah'
  | 'iuran'
  | 'surat'
  | 'account'
  | 'admin-warga'
  | 'admin-edaran'
  | 'admin-surat'
  | 'login'

interface AppState {
  user: User | null
  currentPage: PageName
  isLoading: boolean
  showLogin: boolean
  login: (user: User) => void
  logout: () => void
  setPage: (page: PageName) => void
  setLoading: (loading: boolean) => void
  setShowLogin: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  currentPage: 'dashboard',
  isLoading: true,
  showLogin: false,
  login: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rtdigital_session', JSON.stringify(user))
    }
    set({ user, currentPage: 'dashboard', showLogin: false })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rtdigital_session')
    }
    set({ user: null, currentPage: 'dashboard', showLogin: false })
  },
  setPage: (page) => set({ currentPage: page }),
  setLoading: (isLoading) => set({ isLoading }),
  setShowLogin: (showLogin) => set({ showLogin }),
}))
