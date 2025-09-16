import { useAuth } from '@/context/AuthContext'
import { Bell } from 'lucide-react'
import { useMemo } from 'react'

export default function Topbar({ title, onArrowClick }: { title?: string; onArrowClick?: () => void }) {
  const { user, logout } = useAuth()

  const initials = useMemo(() => {
    const n = (user?.name || `${user?.imie ?? ''} ${user?.nazwisko ?? ''}` || user?.email || '').trim()
    return n.split(/\s+/).map(s => s[0]?.toUpperCase()).slice(0,2).join('') || '?'
  }, [user])

  const avatarUrl = user?.avatar
    ? // Jeśli w DB trzymasz np. "uploads/..." z poprzedniego projektu – ustaw bazowy host, albo zostaw względne:
      (import.meta.env.VITE_FILES_BASE_URL ? `${import.meta.env.VITE_FILES_BASE_URL}/${user.avatar}` : user.avatar)
    : null

  return (
    <header className="topbar">
      <button className="arrow-btn" aria-label="toggle sidebar" onClick={onArrowClick}>
        <span className="arrow-icon" />
      </button>

      <h1 className="topbar-title">{title ?? ''}</h1>

      <div className="topbar-right">
        <button className="icon-btn" aria-label="powiadomienia"><Bell size={18} /></button>

        <div className="avatar" title={user?.email ?? ''}>
          {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : <span>{initials}</span>}
          <div className="avatar-menu">
            <div className="avatar-name">{user?.name || `${user?.imie ?? ''} ${user?.nazwisko ?? ''}`}</div>
            <div className="avatar-email">{user?.email}</div>
            <div className="avatar-actions">
              <a href="/profile">Profil</a>
              <a href="/profile/edit">Edytuj profil</a>
              <button onClick={() => logout()}>Wyloguj</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
