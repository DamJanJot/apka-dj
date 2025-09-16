import axios from 'axios'

// mały helper do odczytu cookie XSRF-TOKEN (nie httpOnly)
function getCookie(name: string) {
  const value = document.cookie.split('; ').find(row => row.startsWith(name + '='))
  return value ? decodeURIComponent(value.split('=')[1]) : undefined
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  // jawnie ustaw nazwy dla axios
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// 🚑 dla pewności dołóż nagłówek ręcznie (nie zawsze axios sam go doda cross-origin)
api.interceptors.request.use((config) => {
  const token = getCookie('XSRF-TOKEN')
  if (token) config.headers['X-XSRF-TOKEN'] = token
  return config
})

export type Me = {
  id: number
  email: string
  name?: string
  imie?: string
  nazwisko?: string
  nick?: string
  rola?: string
  avatar?: string | null
}

export async function getMe(): Promise<Me> {
  const r = await api.get('/api/me')
  return r.data
}

export async function login(email: string, password: string): Promise<Me> {
  // 1) zainicjuj sesję + XSRF cookie
  await api.get('/sanctum/csrf-cookie')
  // 2) wyślij login (axios dołoży X-XSRF-TOKEN)
  await api.post('/api/login', { email, password })
  // 3) pobierz usera
  return getMe()
}

export async function logout() {
  await api.post('/api/logout')
}
