import { createContext, useContext, useEffect, useState } from 'react'
import { Me, getMe, login as apiLogin, logout as apiLogout } from '@/api/client'

type AuthCtx = {
  user: Me | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    try {
      const me = await apiLogin(email, password)
      setUser(me)
      return true
    } catch (e) {
      setUser(null)
      throw e
    }
  }

  async function logout() {
    await apiLogout()
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
