import { FormEvent, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string|undefined>()

  const onSubmit = async (e:FormEvent) => {
    e.preventDefault()
    setError(undefined)
    const ok = await login(email, password)
    if (ok) nav('/dashboard')
    else setError('Błędny e-mail lub hasło')
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>
      <form onSubmit={onSubmit} className="widget" style={{width:360}}>
        <h3 style={{marginTop:0, textAlign:'center'}}>Logowanie</h3>
        <div className="col">
          <input className="stat" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="stat" placeholder="Hasło" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {error && <div className="small" style={{color:'#ef4444'}}>{error}</div>}
          <button className="btn-icon" style={{width:'100%',padding:10,border:'1px solid #1f2937',borderRadius:10}} type="submit">
            Zaloguj
          </button>
        </div>
      </form>
    </div>
  )
}
