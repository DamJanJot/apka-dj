import { type ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Info, LayoutDashboard, Newspaper, LineChart, BookText, MessageSquare, UsersRound, Gamepad2, ChevronDown, Settings, CalendarDays, KanbanSquare } from 'lucide-react'
import { getFriendsOverview } from '@/api/client'
import { APP_LABELS, AppKey, detectAppFromPath, isNavVisible, NavItemId } from '@/lib/shellSettings'
import { useAuth } from '@/context/AuthContext'

type NavDef = {
  id: NavItemId
  label: string
  to: string
  title: string
  icon: ReactNode
}

const NAV_DEFS: NavDef[] = [
  { id: 'dashboard', label: 'Dashboard', to: '/dashboard', title: 'Dashboard', icon: <LayoutDashboard className="nav-icon" size={18} /> },
  { id: 'teacher', label: 'Panel nauczyciela', to: '/neuronetix/teacher', title: 'Panel nauczyciela', icon: <UsersRound className="nav-icon" size={18} /> },
  { id: 'student', label: 'Panel ucznia', to: '/neuronetix/student', title: 'Panel ucznia', icon: <BookText className="nav-icon" size={18} /> },
  { id: 'student_tasks', label: 'Zadania ucznia', to: '/neuronetix/student/tasks', title: 'Zadania ucznia', icon: <KanbanSquare className="nav-icon" size={18} /> },
  { id: 'student_quizzes', label: 'Quizy ucznia', to: '/neuronetix/student/quizzes', title: 'Quizy ucznia', icon: <BookText className="nav-icon" size={18} /> },
  { id: 'student_tests', label: 'Testy ucznia', to: '/neuronetix/student/tests', title: 'Testy ucznia', icon: <BookText className="nav-icon" size={18} /> },
  { id: 'users', label: 'Uzytkownicy', to: '/admin/users', title: 'Uzytkownicy', icon: <UsersRound className="nav-icon" size={18} /> },
  { id: 'roles', label: 'Role', to: '/admin/roles', title: 'Role', icon: <Settings className="nav-icon" size={18} /> },
  { id: 'assignments', label: 'Przypisania', to: '/admin/assignments', title: 'Przypisania', icon: <KanbanSquare className="nav-icon" size={18} /> },
  { id: 'relations', label: 'Relacje', to: '/admin/relations', title: 'Relacje', icon: <UsersRound className="nav-icon" size={18} /> },
  { id: 'projects', label: 'Projekty', to: '/projects', title: 'Projekty', icon: <KanbanSquare className="nav-icon" size={18} /> },
  { id: 'calendar', label: 'Kalendarz', to: '/calendar', title: 'Kalendarz', icon: <CalendarDays className="nav-icon" size={18} /> },
  { id: 'news', label: 'Aktualnosci', to: '/news', title: 'Aktualnosci', icon: <Newspaper className="nav-icon" size={18} /> },
  { id: 'markets', label: 'Rynki', to: '/markets', title: 'Rynki', icon: <LineChart className="nav-icon" size={18} /> },
  { id: 'messages', label: 'Wiadomosci', to: '/messages', title: 'Wiadomosci', icon: <MessageSquare className="nav-icon" size={18} /> },
  { id: 'friends', label: 'Znajomi', to: '/friends', title: 'Znajomi', icon: <UsersRound className="nav-icon" size={18} /> },
  { id: 'board', label: 'Tablica', to: '/board', title: 'Tablica', icon: <Newspaper className="nav-icon" size={18} /> },
  { id: 'makao', label: 'Makao', to: '/makao', title: 'Makao', icon: <Gamepad2 className="nav-icon" size={18} /> },
  { id: 'sidebar_settings', label: 'Panel boczny', to: '/admin/sidebar-settings', title: 'Panel boczny', icon: <Settings className="nav-icon" size={18} /> },
  { id: 'docs', label: 'Documentation', to: '/docs', title: 'Documentation', icon: <BookText className="nav-icon" size={18} /> },
]

const APP_NAV_ORDER: Record<AppKey, NavItemId[]> = {
  orbitum: ['dashboard', 'calendar', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
  neuronetix: ['dashboard', 'messages', 'friends', 'teacher', 'student', 'student_tasks', 'student_quizzes', 'student_tests', 'docs'],
  taskora: ['dashboard', 'projects', 'messages', 'friends', 'docs'],
  optivio: ['dashboard', 'projects', 'messages', 'friends', 'docs'],
  chic: ['dashboard', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
  admin: ['dashboard', 'users', 'roles', 'assignments', 'relations', 'docs', 'sidebar_settings'],
}

const APP_NAV_LABEL_OVERRIDES: Partial<Record<AppKey, Partial<Record<NavItemId, string>>>> = {
  chic: {
    dashboard: 'Dashboard',
    news: 'Tydzien',
    markets: 'Miesiac',
    messages: 'Grafik roboczy',
    friends: 'Doradcy',
    board: 'Podsumowanie',
    makao: 'Plan pracy',
    docs: 'Lokalizacje',
  },
}

function toAppPath(app: AppKey, navId: NavItemId): string {
  if (app === 'orbitum') {
    if (navId === 'calendar') return '/calendar'
    return `/${navId}`
  }

  if (app === 'chic') {
    if (navId === 'dashboard') return '/grafiki/dashboard'
    if (navId === 'news') return '/grafiki/week'
    if (navId === 'markets') return '/grafiki/month'
    if (navId === 'messages') return '/grafiki/messages'
    if (navId === 'friends') return '/grafiki/friends'
    if (navId === 'board') return '/grafiki/summary'
    if (navId === 'makao') return '/grafiki/workplan'
    if (navId === 'docs') return '/grafiki/docs'
  }

  if (navId === 'dashboard') {
    return `/${app}/dashboard`
  }

  if (navId === 'projects') {
    return `/${app}/projects`
  }

  if (navId === 'teacher') {
    return `/${app}/teacher`
  }

  if (navId === 'student') {
    return `/${app}/student`
  }

  if (navId === 'student_tasks') {
    return `/${app}/student/tasks`
  }

  if (navId === 'student_quizzes') {
    return `/${app}/student/quizzes`
  }

  if (navId === 'student_tests') {
    return `/${app}/student/tests`
  }

  if (navId === 'users') {
    return `/${app}/users`
  }

  if (navId === 'roles') {
    return `/${app}/roles`
  }

  if (navId === 'assignments') {
    return `/${app}/assignments`
  }

  if (navId === 'relations') {
    return `/${app}/relations`
  }

  if (navId === 'calendar') {
    return `/${app}/calendar`
  }

  if (navId === 'messages') {
    return `/${app}/messages`
  }

  if (navId === 'friends') {
    return `/${app}/friends`
  }

  if (navId === 'docs') {
    return `/${app}/docs`
  }

  if (navId === 'sidebar_settings') {
    return `/${app}/sidebar-settings`
  }

  return `/${app}/dashboard`
}

export default function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const [incomingCount, setIncomingCount] = useState(0)
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const currentApp = detectAppFromPath(location.pathname)
  const role = (user?.rola || '').toLowerCase()
  const allowedApps = user?.access?.apps || []
  const allowedPanels = user?.access?.panels?.[currentApp] || []
  const canAccessAdmin = (role === 'admin' || role === 'owner') && (allowedApps.length === 0 || allowedApps.includes('admin'))
  const canAccessOrbitum = allowedApps.length === 0 || allowedApps.includes('orbitum')
  const isNeuronetix = currentApp === 'neuronetix'
  const isTaskora = currentApp === 'taskora'
  const isOptivio = currentApp === 'optivio'
  const isChic = currentApp === 'chic'
  const isAdmin = currentApp === 'admin'

  const brandLogo = isTaskora
    ? '/taskora-logo.png'
    : (isNeuronetix ? '/neuronetix-logo.png' : (isOptivio ? '/optivio-logo.png' : (isChic ? '/chic-logo.png' : (isAdmin ? '/neuronetix-logo.png' : '/dj-api/public/uploads/orbitum-logo.png'))))
  const brandName = isTaskora ? 'Taskora' : (isNeuronetix ? 'Neuronetix' : (isOptivio ? 'Optivio' : (isChic ? 'Grafiki' : (isAdmin ? 'Admin' : 'Orbitum'))))

  const startPath = currentApp === 'orbitum' ? '/dashboard' : `/${currentApp}/dashboard`

  const visibleMainNav = APP_NAV_ORDER[currentApp]
    .map((id) => NAV_DEFS.find((n) => n.id === id))
    .filter((item): item is NavDef => !!item)
    .filter((item) => isNavVisible(currentApp, item.id))
    .filter((item) => allowedPanels.length === 0 || allowedPanels.includes(item.id))
    .map((item) => ({
      ...item,
      to: toAppPath(currentApp, item.id),
      label: APP_NAV_LABEL_OVERRIDES[currentApp]?.[item.id] || item.label,
      title: APP_NAV_LABEL_OVERRIDES[currentApp]?.[item.id] || item.title,
    }))

  useEffect(() => {
    document.body.dataset.app = currentApp
  }, [currentApp])

  useEffect(() => {
    setProjectMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const data = await getFriendsOverview()
        if (!mounted) return
        setIncomingCount((data.incoming || []).length)
      } catch {
        // noop
      }
    }

    load()
    const id = window.setInterval(load, 20000)

    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [])

  return (
    <aside className="sidebar" id="sidebar">
      <div className="brand">
        <button type="button" className="brand-btn" onClick={() => setProjectMenuOpen((v) => !v)}>
          <span className="brand-logo-box">
            <img src={brandLogo} alt="Logo" className="brand-logo" />
          </span>
          <span className="brand-name">{brandName}</span>
          <ChevronDown size={14} className="brand-caret" />
        </button>

        {projectMenuOpen && (
          <div className="brand-project-menu">
            {canAccessOrbitum && <NavLink to="/dashboard" className="brand-project-item">
              <img src="/dj-api/public/uploads/orbitum-logo.png" alt="Orbitum" className="project-nav-logo" />
              <span>{APP_LABELS.orbitum}</span>
            </NavLink>}
            {(allowedApps.length === 0 || allowedApps.includes('neuronetix')) && <NavLink to="/neuronetix/dashboard" className="brand-project-item">
              <img src="/neuronetix-logo.png" alt="Neuronetix" className="project-nav-logo" />
              <span>{APP_LABELS.neuronetix}</span>
            </NavLink>}
            {(allowedApps.length === 0 || allowedApps.includes('taskora')) && <NavLink to="/taskora/dashboard" className="brand-project-item">
              <img src="/taskora-logo.png" alt="Taskora" className="project-nav-logo" />
              <span>{APP_LABELS.taskora}</span>
            </NavLink>}
            {(allowedApps.length === 0 || allowedApps.includes('optivio')) && <NavLink to="/optivio/dashboard" className="brand-project-item">
              <img src="/optivio-logo.png" alt="Optivio" className="project-nav-logo" />
              <span>{APP_LABELS.optivio}</span>
            </NavLink>}
            {(allowedApps.length === 0 || allowedApps.includes('chic')) && <NavLink to="/grafiki/dashboard" className="brand-project-item">
              <img src="/chic-logo.png" alt="Grafiki" className="project-nav-logo" />
              <span>{APP_LABELS.chic}</span>
            </NavLink>}
            {canAccessAdmin && (
              <NavLink to="/admin/dashboard" className="brand-project-item">
                <img src="/neuronetix-logo.png" alt="Admin" className="project-nav-logo" />
                <span>{APP_LABELS.admin}</span>
              </NavLink>
            )}
          </div>
        )}
      </div>

      <nav className="side-nav">
        {visibleMainNav.map((item) => (
          <NavLink key={item.id} to={item.id === 'dashboard' ? startPath : item.to} title={item.title} className="nav-item">
            {item.icon}
            <span className="link-text">{item.label}</span>
            {item.id === 'friends' && incomingCount > 0 && <span className="nav-badge">{incomingCount}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="side-footer">
        <NavLink to="/repo" title="Repository" className="nav-item">
          <BookText className="nav-icon" size={18} />
          <span className="link-text">Repository</span>
        </NavLink>
        <NavLink to="/info" title="Info " className="nav-item">
          <Info  className="nav-icon" size={18} />
          <span className="link-text">Info </span>
        </NavLink>
      </div>
    </aside>
  )
}


