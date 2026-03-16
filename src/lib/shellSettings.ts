export type AppKey = 'orbitum' | 'neuronetix' | 'taskora' | 'optivio' | 'chic' | 'admin'

export type NavItemId =
  | 'dashboard'
  | 'teacher'
  | 'student'
  | 'student_tasks'
  | 'student_quizzes'
  | 'student_tests'
  | 'subjects'
  | 'subject_math'
  | 'subject_polish'
  | 'subject_english'
  | 'subject_it'
  | 'users'
  | 'roles'
  | 'assignments'
  | 'relations'
  | 'projects'
  | 'calendar'
  | 'news'
  | 'markets'
  | 'messages'
  | 'friends'
  | 'board'
  | 'makao'
  | 'sidebar_settings'
  | 'docs'

export const SHELL_NAV_PREFS_KEY = 'shell.navVisibility.v1'
export const TASKORA_URL_KEY = 'shell.taskoraUrl.v1'

export const APP_LABELS: Record<AppKey, string> = {
  orbitum: 'Orbitum',
  neuronetix: 'Neuronetix',
  taskora: 'Taskora',
  optivio: 'Optivio',
  chic: 'Grafiki',
  admin: 'Admin',
}

export const DEFAULT_VISIBLE_NAV: Record<AppKey, NavItemId[]> = {
  orbitum: ['dashboard', 'calendar', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
  neuronetix: ['dashboard', 'messages', 'friends', 'teacher', 'student', 'student_tasks', 'student_quizzes', 'student_tests', 'subjects', 'subject_math', 'subject_polish', 'subject_english', 'subject_it', 'docs'],
  taskora: ['dashboard', 'projects', 'messages', 'friends', 'docs'],
  optivio: ['dashboard', 'projects', 'messages', 'friends', 'docs'],
  chic: ['dashboard', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
  admin: ['dashboard', 'users', 'roles', 'assignments', 'relations', 'docs', 'sidebar_settings'],
}

export const APP_NAV_CANDIDATES: Record<AppKey, NavItemId[]> = {
  orbitum: ['dashboard', 'calendar', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
  neuronetix: ['dashboard', 'messages', 'friends', 'teacher', 'student', 'student_tasks', 'student_quizzes', 'student_tests', 'subjects', 'subject_math', 'subject_polish', 'subject_english', 'subject_it', 'docs'],
  taskora: ['dashboard', 'projects', 'messages', 'friends', 'docs'],
  optivio: ['dashboard', 'projects', 'messages', 'friends', 'docs'],
  chic: ['dashboard', 'news', 'markets', 'messages', 'friends', 'board', 'makao', 'docs'],
  admin: ['dashboard', 'users', 'roles', 'assignments', 'relations', 'docs', 'sidebar_settings'],
}

type NavPrefs = Record<AppKey, Partial<Record<NavItemId, boolean>>>

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function detectAppFromPath(pathname: string): AppKey {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/neuronetix')) return 'neuronetix'
  if (pathname.startsWith('/taskora')) return 'taskora'
  if (pathname.startsWith('/optivio')) return 'optivio'
  if (pathname.startsWith('/grafiki')) return 'chic'
  if (pathname.startsWith('/chic')) return 'chic'
  return 'orbitum'
}

export function getNavPrefs(): NavPrefs {
  return safeParse<NavPrefs>(localStorage.getItem(SHELL_NAV_PREFS_KEY), {
    orbitum: {},
    neuronetix: {},
    taskora: {},
    optivio: {},
    chic: {},
    admin: {},
  })
}

export function isNavVisible(app: AppKey, id: NavItemId): boolean {
  const prefs = getNavPrefs()
  const explicit = prefs?.[app]?.[id]
  if (typeof explicit === 'boolean') return explicit
  return DEFAULT_VISIBLE_NAV[app].includes(id)
}

export function setNavVisibility(app: AppKey, id: NavItemId, visible: boolean): void {
  const prefs = getNavPrefs()
  const next: NavPrefs = {
    ...prefs,
    [app]: {
      ...(prefs[app] || {}),
      [id]: visible,
    },
  }

  localStorage.setItem(SHELL_NAV_PREFS_KEY, JSON.stringify(next))
}

export function resetNavVisibility(app: AppKey): void {
  const prefs = getNavPrefs()
  const next: NavPrefs = {
    ...prefs,
    [app]: {},
  }
  localStorage.setItem(SHELL_NAV_PREFS_KEY, JSON.stringify(next))
}

export function getTaskoraEmbedUrl(): string {
  const envTaskoraUrl = (import.meta.env.VITE_TASKORA_EMBED_URL || '').trim()
  const custom = localStorage.getItem(TASKORA_URL_KEY)
  if (!custom) {
    return envTaskoraUrl || 'http://localhost/taskora/index.php'
  }

  // Migrate older, broken preset to the working XAMPP alias.
  if (custom.includes('/Taskora_App/')) {
    return custom.replace('/Taskora_App/', '/taskora/')
  }

  // If user still has old localhost URL saved but env points to online Taskora,
  // prefer env to avoid dependency on local XAMPP.
  if (envTaskoraUrl && custom.includes('localhost/taskora')) {
    return envTaskoraUrl
  }

  return custom
}

export function setTaskoraEmbedUrl(url: string): void {
  localStorage.setItem(TASKORA_URL_KEY, url.trim())
}
