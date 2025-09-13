import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  withCredentials: true, // <-- dla Sanctum (cookies)
})

// helpery
export async function getCsrf() {
  await api.get('/sanctum/csrf-cookie')
}
