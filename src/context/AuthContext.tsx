import { createContext, useContext, useEffect, useState } from 'react'
import { api, getCsrf } from '@/api/client'

export type User = { id:number|string; name:string; email:string; avatarUrl?:string|null; role?:string|null }
type AuthCtx = {
  user: User | null
  loading: boolean
  login: (email:string, password:string) => Promise<boolean>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>(null as any)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User|null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const { data } = await api.get('/api/me')
      setUser(data?.id ? data : null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const login = async (email:string, password:string) => {
    await getCsrf()
    try {
      await api.post('/login', { email, password })
      await refresh()
      return true
    } catch {
      return false
    }
  }

  const logout = async () => {
    try { await api.post('/logout') } finally { setUser(null) }
  }

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>
}
