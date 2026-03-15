import { useMemo, useState } from 'react'
import {
  APP_LABELS,
  AppKey,
  getTaskoraEmbedUrl,
  isNavVisible,
  NavItemId,
  resetNavVisibility,
  setNavVisibility,
  setTaskoraEmbedUrl,
} from '@/lib/shellSettings'

const APP_ORDER: AppKey[] = ['orbitum', 'neuronetix', 'taskora', 'optivio', 'chic', 'admin']

const APP_FIELDS: Record<AppKey, { id: NavItemId; label: string }[]> = {
  orbitum: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'calendar', label: 'Kalendarz' },
    { id: 'news', label: 'Aktualnosci' },
    { id: 'markets', label: 'Rynki' },
    { id: 'messages', label: 'Wiadomosci' },
    { id: 'friends', label: 'Znajomi' },
    { id: 'board', label: 'Tablica' },
    { id: 'makao', label: 'Makao' },
    { id: 'docs', label: 'Documentation' },
  ],
  neuronetix: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'messages', label: 'Wiadomosci' },
    { id: 'friends', label: 'Znajomi' },
    { id: 'teacher', label: 'Panel nauczyciela' },
    { id: 'student', label: 'Panel ucznia' },
    { id: 'student_tasks', label: 'Zadania ucznia' },
    { id: 'student_quizzes', label: 'Quizy ucznia' },
    { id: 'student_tests', label: 'Testy ucznia' },
    { id: 'docs', label: 'Documentation' },
  ],
  taskora: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'projects', label: 'Projekty' },
    { id: 'messages', label: 'Wiadomosci' },
    { id: 'friends', label: 'Znajomi' },
    { id: 'docs', label: 'Documentation' },
  ],
  optivio: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'projects', label: 'Projekty' },
    { id: 'messages', label: 'Wiadomosci' },
    { id: 'friends', label: 'Znajomi' },
    { id: 'docs', label: 'Documentation' },
  ],
  chic: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'news', label: 'Tydzien' },
    { id: 'markets', label: 'Miesiac' },
    { id: 'messages', label: 'Grafik roboczy' },
    { id: 'friends', label: 'Doradcy' },
    { id: 'board', label: 'Podsumowanie' },
    { id: 'makao', label: 'Plan pracy' },
    { id: 'docs', label: 'Lokalizacje' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Uzytkownicy' },
    { id: 'roles', label: 'Role' },
    { id: 'assignments', label: 'Przypisania' },
    { id: 'relations', label: 'Relacje' },
    { id: 'docs', label: 'Documentation' },
    { id: 'sidebar_settings', label: 'Panel boczny' },
  ],
}

export default function Settings() {
  const [tick, setTick] = useState(0)
  const [taskoraUrl, setTaskoraUrlInput] = useState(() => getTaskoraEmbedUrl())

  const appState = useMemo(() => {
    const state: Record<AppKey, Record<NavItemId, boolean>> = {
      orbitum: {} as Record<NavItemId, boolean>,
      neuronetix: {} as Record<NavItemId, boolean>,
      taskora: {} as Record<NavItemId, boolean>,
      optivio: {} as Record<NavItemId, boolean>,
      chic: {} as Record<NavItemId, boolean>,
      admin: {} as Record<NavItemId, boolean>,
    }

    for (const app of APP_ORDER) {
      for (const field of APP_FIELDS[app]) {
        state[app][field.id] = isNavVisible(app, field.id)
      }
    }

    return state
  }, [tick])

  const handleToggle = (app: AppKey, id: NavItemId, checked: boolean) => {
    setNavVisibility(app, id, checked)
    setTick((v) => v + 1)
  }

  const handleReset = (app: AppKey) => {
    resetNavVisibility(app)
    setTick((v) => v + 1)
  }

  const handleTaskoraSave = () => {
    setTaskoraEmbedUrl(taskoraUrl)
    setTaskoraUrlInput(getTaskoraEmbedUrl())
    setTick((v) => v + 1)
  }

  return (
    <section className="surface page-shell card settings-page">
      <h1 className="section-title">Panel boczny</h1>
      <p className="muted">Dostosuj widoczne panele sidebara osobno dla kazdej aplikacji.</p>

      <div className="settings-grid">
        {APP_ORDER.map((app) => (
          <article key={app} className="settings-card">
            <div className="settings-card-head">
              <h2>{APP_LABELS[app]}</h2>
              <button type="button" className="btn btn-ghost" onClick={() => handleReset(app)}>
                Resetuj
              </button>
            </div>

            <div className="settings-list">
              {APP_FIELDS[app].map((field) => (
                <label key={`${app}-${field.id}`} className="settings-check">
                  <input
                    type="checkbox"
                    checked={appState[app][field.id] ?? false}
                    onChange={(e) => handleToggle(app, field.id, e.target.checked)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <article className="settings-card settings-card-wide">
        <h2>Taskora URL</h2>
        <p className="muted">Adres osadzenia Taskory w iframe i dla przycisku "Otworz w nowej karcie".</p>
        <div className="settings-inline-row">
          <input
            type="url"
            value={taskoraUrl}
            onChange={(e) => setTaskoraUrlInput(e.target.value)}
            placeholder="https://code-dj.pl/taskora/index.php"
          />
          <button type="button" className="btn btn-primary" onClick={handleTaskoraSave}>
            Zapisz
          </button>
        </div>
      </article>
    </section>
  )
}
