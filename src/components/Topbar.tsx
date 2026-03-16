import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChatNotificationItem,
  getChatNotifications,
  getPostMentionNotifications,
  listTeacherNotifications,
  logout,
  markTeacherNotificationRead,
  markTeacherNotificationsReadAll,
  markPostMentionsReadAll,
  markChatNotificationsReadFromUser,
  PostMentionNotificationItem,
  TeacherNotificationItem,
  pingChatActivity,
  setChatOffline,
} from '@/api/client'
import UserMenuContent from './user-menu-content'
import { detectAppFromPath } from '@/lib/shellSettings'

const MQ_MOBILE = '(max-width: 900px)'

const TITLE: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/news': 'Aktualności',
  '/markets': 'Rynki',
  '/messages': 'Wiadomosci',
  '/friends': 'Znajomi',
  '/board': 'Tablica',
  '/neuronetix': 'Neuronetix',
  '/taskora': 'Taskora',
  '/optivio': 'Optivio',
  '/admin': 'Admin',
  '/grafiki': 'Grafiki',
  '/profile': 'Profil',
  '/profile/edit': 'Edytuj profil',
  '/settings': 'Ustawienia konta',
  '/docs': 'Documentation',
}

interface User {
  imie: string
  email: string
  zdjecie_profilowe: string | null
}

export default function Topbar() {
  const loc = useLocation()
  const nav = useNavigate()
  const currentApp = detectAppFromPath(loc.pathname)

  const scopedTitle = (() => {
    if (loc.pathname.startsWith('/neuronetix/')) {
      if (loc.pathname.endsWith('/dashboard')) return 'Dashboard'
      if (loc.pathname.endsWith('/messages')) return 'Wiadomosci'
      if (loc.pathname.endsWith('/friends')) return 'Znajomi'
      if (loc.pathname.endsWith('/student/tasks')) return 'Zadania ucznia'
      if (loc.pathname.endsWith('/student/tests')) return 'Testy ucznia'
      if (loc.pathname.endsWith('/student/quizzes')) return 'Quizy ucznia'
      if (loc.pathname.endsWith('/subjects')) return 'Przedmioty'
      if (loc.pathname.includes('/subjects/')) return 'Przedmiot'
      if (loc.pathname.endsWith('/teacher')) return 'Panel nauczyciela'
      if (loc.pathname.endsWith('/student')) return 'Panel ucznia'
      if (loc.pathname.endsWith('/docs')) return 'Documentation'
    }

    if (loc.pathname.startsWith('/taskora/')) {
      if (loc.pathname.endsWith('/dashboard')) return 'Dashboard'
      if (loc.pathname.endsWith('/messages')) return 'Wiadomosci'
      if (loc.pathname.endsWith('/friends')) return 'Znajomi'
      if (loc.pathname.endsWith('/docs')) return 'Documentation'
    }

    if (loc.pathname.startsWith('/optivio/')) {
      if (loc.pathname.endsWith('/dashboard')) return 'Dashboard'
      if (loc.pathname.endsWith('/messages')) return 'Wiadomosci'
      if (loc.pathname.endsWith('/friends')) return 'Znajomi'
      if (loc.pathname.endsWith('/docs')) return 'Documentation'
    }

    if (loc.pathname.startsWith('/admin/')) {
      if (loc.pathname.endsWith('/dashboard')) return 'Admin Panel'
      if (loc.pathname.endsWith('/users')) return 'Uzytkownicy'
      if (loc.pathname.endsWith('/roles')) return 'Role'
      if (loc.pathname.endsWith('/assignments')) return 'Przypisania'
      if (loc.pathname.endsWith('/relations')) return 'Relacje'
      if (loc.pathname.endsWith('/sidebar-settings')) return 'Panel boczny'
      if (loc.pathname.endsWith('/docs')) return 'Documentation'
    }

    if (loc.pathname.startsWith('/grafiki/')) {
      if (loc.pathname.endsWith('/dashboard')) return 'Grafiki'
      if (loc.pathname.endsWith('/messages')) return 'Wiadomosci'
      if (loc.pathname.endsWith('/friends')) return 'Znajomi'
      if (loc.pathname.endsWith('/docs')) return 'Documentation'
      if (loc.pathname.endsWith('/week')) return 'Tydzien'
      if (loc.pathname.endsWith('/month')) return 'Miesiac'
      if (loc.pathname.endsWith('/summary')) return 'Podsumowanie'
      if (loc.pathname.endsWith('/workplan')) return 'Plan pracy'
    }

    return null
  })()

  const projectMeta = useMemo(() => {
    if (loc.pathname.startsWith('/taskora')) {
      return { appName: 'Taskora', favicon: '/taskora-logo.png' }
    }

    if (loc.pathname.startsWith('/neuronetix')) {
      return { appName: 'Neuronetix', favicon: '/neuronetix-logo.png' }
    }

    if (loc.pathname.startsWith('/optivio')) {
      return { appName: 'Optivio', favicon: '/optivio-favicon.ico' }
    }

    if (loc.pathname.startsWith('/grafiki') || loc.pathname.startsWith('/chic')) {
      return { appName: 'Grafiki', favicon: '/chic-favicon.ico' }
    }

    if (loc.pathname.startsWith('/admin')) {
      return { appName: 'Admin', favicon: '/neuronetix-logo.png' }
    }

    return { appName: 'Orbitum', favicon: '/dj-api/public/uploads/orbitum-logo.png' }
  }, [loc.pathname])

  const title = loc.pathname.startsWith('/profile/') && loc.pathname !== '/profile/edit'
    ? 'Profil uzytkownika'
    : (scopedTitle ?? TITLE[loc.pathname] ?? projectMeta.appName)

  useEffect(() => {
    document.title = `${title} | ${projectMeta.appName}`

    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.href = projectMeta.favicon
  }, [title, projectMeta])

  const [isMobile, setIsMobile] = useState(window.matchMedia(MQ_MOBILE).matches)
  const [isTinyScreen, setIsTinyScreen] = useState(window.matchMedia('(max-width: 560px)').matches)
  const [collapsed, setCollapsed] = useState(document.body.classList.contains('sidebar-collapsed'))
  const [mobileOpen, setMobileOpen] = useState(!!document.getElementById('sidebar')?.classList.contains('open'))
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifItems, setNotifItems] = useState<ChatNotificationItem[]>([])
  const [teacherNotifItems, setTeacherNotifItems] = useState<TeacherNotificationItem[]>([])
  const [teacherUnreadCount, setTeacherUnreadCount] = useState(0)
  const [postMentionItems, setPostMentionItems] = useState<PostMentionNotificationItem[]>([])
  const [postMentionsCount, setPostMentionsCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
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
    const tinyMq = window.matchMedia('(max-width: 560px)')
    const h = (e: MediaQueryListEvent) => setIsTinyScreen(e.matches)
    setIsTinyScreen(tinyMq.matches)
    tinyMq.addEventListener('change', h)
    return () => tinyMq.removeEventListener('change', h)
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
    fetch('http://localhost:8000/api/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const isNeuronetix = loc.pathname.startsWith('/neuronetix')
        const [chatData, postData, teacherData] = await Promise.all([
          getChatNotifications(),
          getPostMentionNotifications(),
          isNeuronetix ? listTeacherNotifications() : Promise.resolve({ data: [], unread: 0 }),
        ])

        if (!mounted) return
        setUnreadCount((chatData.unread_count || 0) + (postData.unread_count || 0) + (teacherData.unread || 0))
        setNotifItems(chatData.items || [])
        setPostMentionItems(postData.items || [])
        setPostMentionsCount(postData.unread_count || 0)
        setTeacherNotifItems(teacherData.data || [])
        setTeacherUnreadCount(teacherData.unread || 0)
      } catch {
        if (!mounted) return
        setUnreadCount(0)
        setNotifItems([])
        setPostMentionItems([])
        setPostMentionsCount(0)
        setTeacherNotifItems([])
        setTeacherUnreadCount(0)
      }
    }

    load()
    const id = window.setInterval(load, 8000)

    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [loc.pathname])

  useEffect(() => {
    if (!notifOpen) return
    if (!loc.pathname.startsWith('/neuronetix')) return
    if (teacherUnreadCount <= 0) return

    void (async () => {
      try {
        await markTeacherNotificationsReadAll()
        const data = await listTeacherNotifications()
        setTeacherNotifItems(data.data || [])
        setTeacherUnreadCount(data.unread || 0)
        setUnreadCount((prev) => Math.max(0, prev - teacherUnreadCount))
      } catch {
        // noop
      }
    })()
  }, [notifOpen, loc.pathname, teacherUnreadCount])

  useEffect(() => {
    const ping = () => {
      pingChatActivity().catch(() => {})
    }

    ping()
    const id = window.setInterval(ping, 30000)
    return () => window.clearInterval(id)
  }, [])

  const openThreadFromNotification = async (fromUserId: number) => {
    try {
      await markChatNotificationsReadFromUser(fromUserId)
      const [chatData, postData] = await Promise.all([
        getChatNotifications(),
        getPostMentionNotifications(),
      ])
      setUnreadCount((chatData.unread_count || 0) + (postData.unread_count || 0) + teacherUnreadCount)
      setNotifItems(chatData.items || [])
      setPostMentionItems(postData.items || [])
      setPostMentionsCount(postData.unread_count || 0)
    } catch {
      // noop
    }

    setNotifOpen(false)
    if (currentApp === 'orbitum' || currentApp === 'admin') {
      nav(`/messages?user=${fromUserId}`)
      return
    }

    nav(`/${currentApp}/messages`)
  }

  const openBoardFromMention = async () => {
    try {
      await markPostMentionsReadAll()
      const [chatData, postData] = await Promise.all([
        getChatNotifications(),
        getPostMentionNotifications(),
      ])
      setUnreadCount((chatData.unread_count || 0) + (postData.unread_count || 0) + teacherUnreadCount)
      setNotifItems(chatData.items || [])
      setPostMentionItems(postData.items || [])
      setPostMentionsCount(postData.unread_count || 0)
    } catch {
      // noop
    }

    setNotifOpen(false)
    if (currentApp === 'orbitum' || currentApp === 'admin') {
      nav('/board')
      return
    }

    nav(`/${currentApp}/dashboard`)
  }

  const openTeacherNotification = async (item: TeacherNotificationItem) => {
    try {
      if (!item.read_at) {
        await markTeacherNotificationRead(item.id)
      }

      const data = await listTeacherNotifications()
      setTeacherNotifItems(data.data || [])
      setTeacherUnreadCount(data.unread || 0)
    } catch {
      // noop
    }

    setNotifOpen(false)

    if (item.quiz_id) {
      nav('/neuronetix/student/quizzes')
      return
    }

    if (item.task_id) {
      nav('/neuronetix/student/tasks')
      return
    }

    nav('/neuronetix/student')
  }

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

      <header className={`topbar grid3${isMobile && mobileOpen && isTinyScreen ? ' topbar-mobile-open' : ''}`} style={headerStyle}>
        <div className="tb-left">
          <button className="btn-icon" aria-label="Toggle sidebar" onClick={toggleSidebar} title="Pokaż/ukryj nawigację" style={arrowStyle}>
            {ArrowIcon}
          </button>
        </div>

        <div className="tb-center">{title}</div>

        <div className="tb-right" ref={wrapRef}>
          <button className="btn-icon bell-btn" aria-label="Powiadomienia" onClick={() => { setNotifOpen(v => !v); setMenuOpen(false) }}>
            <Bell size={18}/>
            {unreadCount > 0 && <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="dropdown" style={{ right: 56 }}>
              <div className="dropdown-menu">
                <div className="dropdown-header"><strong>Powiadomienia</strong></div>
                <div className="dropdown-sep" />
                {postMentionItems.length === 0 && notifItems.length === 0 && teacherNotifItems.length === 0 && (
                  <div className="muted small" style={{ padding: '8px 12px' }}>Brak nowych powiadomien</div>
                )}

                {teacherNotifItems.length > 0 && (
                  <>
                    <div className="small muted" style={{ padding: '8px 12px' }}>Neuronetix: {teacherUnreadCount} nowych</div>
                    {teacherNotifItems.slice(0, 8).map((n) => (
                      <button
                        key={`teacher-notif-${n.id}`}
                        className="dropdown-item"
                        onClick={() => openTeacherNotification(n)}
                      >
                        <div><strong>{n.title}</strong></div>
                        <div className="small muted">{n.message || 'Kliknij, aby przejsc'}</div>
                      </button>
                    ))}
                    <div className="dropdown-sep" />
                  </>
                )}

                {postMentionItems.length > 0 && (
                  <>
                    <div className="small muted" style={{ padding: '8px 12px' }}>Wzmianki w postach: {postMentionsCount}</div>
                    {postMentionItems.map((n) => (
                      <button
                        key={`post-mention-${n.id}`}
                        className="dropdown-item"
                        onClick={openBoardFromMention}
                      >
                        <div>
                          <strong>
                            {n.by_imie || n.by_email || 'Uzytkownik'} wspomnial Cie
                            {n.mention_type === 'comment' ? ' w komentarzu' : ' w poscie'}
                          </strong>
                        </div>
                        <div className="small muted">{(n.post_body || '').slice(0, 80) || '(brak tresci)'}</div>
                      </button>
                    ))}
                    <div className="dropdown-sep" />
                  </>
                )}

                {notifItems.map((n) => (
                  <button
                    key={n.from_user_id}
                    className="dropdown-item"
                    onClick={() => openThreadFromNotification(Number(n.from_user_id))}
                  >
                    <div><strong>{n.sender_name || n.sender_email || `Uzytkownik #${n.from_user_id}`}</strong></div>
                    <div className="small muted">Nowe wiadomosci: {n.unread_count}</div>
                    {Number(n.mention_count || 0) > 0 && (
                      <div className="small" style={{ color: '#7dd3fc' }}>Wzmianki: {n.mention_count}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="avatar-wrap">
            <button className="avatar" onClick={() => { setMenuOpen(v => !v); setNotifOpen(false) }}>
              <img
                src={user?.zdjecie_profilowe ? `http://localhost:8000/${user.zdjecie_profilowe}` : "/dj-api/public/uploads/default.png"}
                alt="U"
              />
            </button>
            {menuOpen && (
              <div className="dropdown">
                <UserMenuContent
                  user={{
                    name: user?.imie ?? 'Uzytkownik',
                    email: user?.email ?? '—',
                    avatarUrl: user?.zdjecie_profilowe
                      ? `http://localhost:8000/${user.zdjecie_profilowe}`
                      : "/dj-api/public/uploads/default.png"

                  }}
                  onLogout={async () => {
                    try {
                      await setChatOffline()
                    } catch {
                      // noop
                    }

                    await logout().finally(() => {
                      localStorage.removeItem('token')
                      window.location.href = '/login'
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
