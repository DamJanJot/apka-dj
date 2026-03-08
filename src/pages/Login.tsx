import { FormEvent, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [googleInfo, setGoogleInfo] = useState<string | undefined>()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setGoogleInfo(undefined)
    try {
      const ok = await login(email, password)
      if (ok) nav('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Nie udało się zalogować')
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-left">
          <h1>Witaj ponownie</h1>
          <p className="muted">
            Zaloguj sie do panelu i przejdz do Orbitum, Neuronetix oraz Taskory z jednego miejsca.
          </p>

          <ul className="auth-bullets">
            <li>Wspolny panel powiadomien i profilu</li>
            <li>Moduly projektowe w jednym shellu</li>
            <li>Gotowe miejsce pod logowanie Google OAuth</li>
          </ul>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <h2>Logowanie</h2>

          <input
            className="auth-input"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
          <input
            className="auth-input"
            placeholder="Haslo"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          {error && <div className="small" style={{ color: '#ef4444' }}>{error}</div>}
          {googleInfo && <div className="small" style={{ color: '#7dd3fc' }}>{googleInfo}</div>}

          <button className="auth-submit" type="submit">
            Zaloguj
          </button>

          <button
            type="button"
            className="auth-google"
            onClick={() => setGoogleInfo('Integracja Google wymaga dopiecia OAuth po stronie backendu (Socialite).')}
          >
            Kontynuuj z Google
          </button>

          <div className="auth-register-link">
            <Link to="/register">Nie masz konta? Zarejestruj sie</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
