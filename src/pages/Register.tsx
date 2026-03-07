import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()

  const [imie, setImie] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)

    if (password !== passwordConfirmation) {
      setError('Hasla musza byc takie same')
      return
    }

    try {
      setLoading(true)
      const ok = await register({
        imie,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      if (ok) nav('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Nie udalo sie zarejestrowac')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="container"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
    >
      <form onSubmit={onSubmit} className="widget" style={{ width: 380 }}>
        <h1 style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>Rejestracja</h1>

        <div className="col" style={{ gap: 12 }}>
          <input
            className="stat"
            placeholder="Imie"
            value={imie}
            onChange={(e) => setImie(e.target.value)}
            autoComplete="given-name"
            required
          />
          <input
            className="stat"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
          <input
            className="stat"
            placeholder="Haslo"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <input
            className="stat"
            placeholder="Powtorz haslo"
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            minLength={8}
            required
          />

          {error && <div className="small" style={{ color: '#ef4444' }}>{error}</div>}

          <button
            className="btn-icon"
            style={{ width: '100%', padding: 10, border: '1px solid #1f2937', borderRadius: 10 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Rejestrowanie...' : 'Zarejestruj'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Link to="/login" style={{ color: '#4c5a70ff' }}>
              Masz konto? Zaloguj sie
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
