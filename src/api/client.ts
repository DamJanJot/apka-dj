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

export type ChatUser = {
  id: number
  imie?: string
  email?: string
  zdjecie_profilowe?: string | null
  is_online?: boolean | null
  last_seen_at?: string | null
}

export type ChatMessage = {
  id: number
  from_user_id: number
  to_user_id: number
  body: string
  read_at?: string | null
  created_at: string
  updated_at: string
}

export type ChatNotificationItem = {
  from_user_id: number
  latest_at: string
  unread_count: number
  sender_name?: string | null
  sender_email?: string | null
}

export type ChatNotifications = {
  unread_count: number
  items: ChatNotificationItem[]
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

export async function register(payload: {
  imie: string
  email: string
  password: string
  password_confirmation: string
}): Promise<Me> {
  await api.get('/sanctum/csrf-cookie')
  await api.post('/api/register', payload)
  return getMe()
}

export async function logout() {
  await api.post('/api/logout')
}

export async function listChatUsers(): Promise<ChatUser[]> {
  const r = await api.get('/api/chat/users')
  return r.data
}

export async function getChatThread(userId: number): Promise<ChatMessage[]> {
  const r = await api.get(`/api/chat/thread/${userId}`)
  return r.data
}

export async function sendChatMessage(toUserId: number, body: string): Promise<ChatMessage> {
  const r = await api.post('/api/chat/send', { to_user_id: toUserId, body })
  return r.data
}

export async function getChatNotifications(): Promise<ChatNotifications> {
  const r = await api.get('/api/chat/notifications')
  return r.data
}

export async function markChatNotificationsReadFromUser(fromUserId: number): Promise<void> {
  await api.post(`/api/chat/notifications/${fromUserId}/read`)
}

export async function pingChatActivity(): Promise<void> {
  await api.post('/api/chat/activity/ping')
}

export async function setChatOffline(): Promise<void> {
  await api.post('/api/chat/activity/offline')
}
