import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

interface User {
  imie: string
  email: string
  zdjecie_profilowe: string | null
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const avatarUrl = useMemo(() => {
    if (!user?.zdjecie_profilowe) return '/dj-api/public/uploads/default.png'
    if (user.zdjecie_profilowe.startsWith('http')) return user.zdjecie_profilowe
    return `http://localhost:8000/${user.zdjecie_profilowe.replace(/^\/+/, '')}`
  }, [user])

  useEffect(() => {
    fetch('http://localhost:8000/api/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setError('Nie udalo sie pobrac profilu.'))
  }, [])

  if (!user && !error) {
    return (
      <div className="card profile-view-card">
        <p className="muted">Ladowanie profilu...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card profile-view-card">
        <p className="small" style={{ color: '#ef4444' }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="card profile-view-card">
      <h1 className="profile-view-title">Profil uzytkownika</h1>

      <div className="profile-view-layout">
        <div className="profile-view-avatar-wrap">
          <img src={avatarUrl} alt="Avatar uzytkownika" className="profile-view-avatar" />
          <div className="muted small">Aktualny avatar</div>
        </div>

        <div className="profile-view-details">
          <div className="profile-view-row">
            <span className="profile-view-label">Imie</span>
            <span className="profile-view-value">{user?.imie || '-'}</span>
          </div>

          <div className="profile-view-row">
            <span className="profile-view-label">E-mail</span>
            <span className="profile-view-value">{user?.email || '-'}</span>
          </div>

          <div className="profile-view-actions">
            <Link to="/profile/edit" className="profile-view-edit-btn">
              Edytuj profil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
