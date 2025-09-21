import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import UserMenuContent from './user-menu-content'

const MQ_MOBILE = '(max-width: 900px)'

const TITLE: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/news': 'Aktualności',
  '/markets': 'Rynki',
  '/docs': 'Documentation',
}

interface User {
  imie: string
  email: string
  zdjecie_profilowe: string | null
}

export default function Topbar() {
  const loc = useLocation()
  const title = TITLE[loc.pathname] ?? 'Orbi'

  const [isMobile, setIsMobile] = useState(window.matchMedia(MQ_MOBILE).matches)
  const [collapsed, setCollapsed] = useState(document.body.classList.contains('sidebar-collapsed'))
  const [mobileOpen, setMobileOpen] = useState(!!document.getElementById('sidebar')?.classList.contains('open'))
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // 👤 dane użytkownika
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(MQ_MOBILE)
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // pobranie danych z backendu
  useEffect(() => {
    fetch("http://localhost:8000/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }, [])

  const toggleSidebar = () => {
    const el = document.getElementById('sidebar')
    if (!el) return
    if (isMobile) {
      el.classList.toggle('open')
      setMobileOpen(el.classList.contains('open'))
    } else {
      document.body.classList.toggle('sidebar-collapsed')
      setCollapsed(document.body.classList.contains('sidebar-collapsed'))
    }
  }

  const ArrowIcon = isMobile
    ? (mobileOpen ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>)
    : (collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>)

  const arrowStyle = (isMobile && mobileOpen)
    ? { position: 'fixed' as const, left: 'calc(var(--sidebar-w) + 8px)', top: 10, zIndex: 1201 }
    : undefined

  const headerStyle = (isMobile && mobileOpen)
    ? { paddingLeft: 'calc(var(--sidebar-w))' }
    : undefined

  return (
    <>
      {isMobile && mobileOpen && <div className="scrim show" onClick={toggleSidebar} />}

      <header className="topbar grid3" style={headerStyle}>
        <div className="tb-left">
          <button className="btn-icon" aria-label="Toggle sidebar" onClick={toggleSidebar} title="Pokaż/ukryj nawigację" style={arrowStyle}>
            {ArrowIcon}
          </button>
        </div>

        <div className="tb-center">{title}</div>

        <div className="tb-right" ref={wrapRef}>
          <button className="btn-icon" aria-label="Powiadomienia" onClick={() => { setNotifOpen(v => !v); setMenuOpen(false) }}>
            <Bell size={18}/>
          </button>

          {notifOpen && (
            <div className="dropdown" style={{ right: 56 }}>
              <div className="dropdown-menu">
                <div className="dropdown-header"><strong>Powiadomienia</strong></div>
                <div className="dropdown-sep" />
                <div className="muted small" style={{ padding: '8px 12px' }}>Brak nowych powiadomień</div>
              </div>
            </div>
          )}

          <div className="avatar-wrap">
            <button className="avatar" onClick={() => { setMenuOpen(v => !v); setNotifOpen(false) }}>
              <img
                src={user?.zdjecie_profilowe ? `http://localhost:8000/${user.zdjecie_profilowe}` : "/default-avatar.png"}
                alt="U"
              />
            </button>
            {menuOpen && (
              <div className="dropdown">
                <UserMenuContent
                  user={{
                    name: user?.imie ?? 'Użytkownik',
                    email: user?.email ?? '—',
                    avatarUrl: user?.zdjecie_profilowe
                      ? `http://localhost:8000/${user.zdjecie_profilowe}`
                      : '/default-avatar.png',
                  }}
                  onLogout={() => {
                    // wylogowanie
                    fetch("http://localhost:8000/api/logout", {
                      method: "POST",
                      credentials: "include",
                    }).finally(() => {
                      localStorage.removeItem("token"); // jeśli używasz JWT
                      window.location.href = "/login";
                    })
                    setMenuOpen(false)
                  }}
                  onClose={() => setMenuOpen(false)}
                />
                
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
