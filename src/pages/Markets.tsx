import { FormEvent, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      setError(null)
      await login(email, password)
      window.location.href = '/' // prosto – przekierowanie na dashboard
    } catch (err) {
      setError('Błędny email lub hasło')
    }
  }

  return (
    <div style={{minHeight:'100vh', display:'grid', placeItems:'center'}}>
      <form onSubmit={onSubmit} style={{width:340, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:16}}>
        <h2 style={{marginTop:0}}>Logowanie</h2>
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required
          style={{width:'100%', margin:'6px 0 12px', padding:10, borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)'}}/>
        <label>Hasło</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required
          style={{width:'100%', margin:'6px 0 16px', padding:10, borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)'}}/>
        {error && <div style={{color:'#ff7b7b', marginBottom:8}}>{error}</div>}
        <button disabled={loading} type="submit"
          style={{width:'100%', padding:10, borderRadius:10, border:'1px solid var(--border)', background:'var(--primary)', color:'#fff', fontWeight:700}}>
          {loading ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>
    </div>
  )
}
