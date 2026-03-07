import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMe, getProfileById } from '@/api/client'

interface User {
  id?: number
  imie: string
  nazwisko?: string
  email: string
  zdjecie_profilowe: string | null
  is_self?: boolean
  is_friend?: boolean
}

export default function Profile() {
  const { userId } = useParams()
  const requestedUserId = Number(userId || 0)

  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const avatarUrl = useMemo(() => {
    if (!user?.zdjecie_profilowe) return '/dj-api/public/uploads/default.png'
    if (user.zdjecie_profilowe.startsWith('http')) return user.zdjecie_profilowe
    return `http://localhost:8000/${user.zdjecie_profilowe.replace(/^\/+/, '')}`
  }, [user])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const data = requestedUserId > 0
          ? await getProfileById(requestedUserId)
          : await getMe().then((me) => ({
              id: me.id,
              imie: me.imie || '',
              nazwisko: me.nazwisko || '',
              email: me.email,
              zdjecie_profilowe: me.avatar || null,
              is_self: true,
              is_friend: true,
            }))

        if (!mounted) return
        setUser(data as User)
      } catch (err: any) {
        if (!mounted) return
        const status = Number(err?.response?.status || 0)
        if (status === 403) {
          setError('Ten profil jest dostepny tylko dla znajomych.')
        } else {
          setError('Nie udalo sie pobrac profilu.')
        }
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [requestedUserId])

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
            <span className="profile-view-label">Nazwisko</span>
            <span className="profile-view-value">{user?.nazwisko || '-'}</span>
          </div>

          <div className="profile-view-row">
            <span className="profile-view-label">E-mail</span>
            <span className="profile-view-value">{user?.email || '-'}</span>
          </div>

          {user?.is_self !== false && (
            <div className="profile-view-actions">
              <Link to="/profile/edit" className="profile-view-edit-btn">
                Edytuj profil
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
