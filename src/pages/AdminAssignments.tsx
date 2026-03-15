import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  AdminAssignmentsResponse,
  getAdminAssignments,
  listAdminRoleChangeLogs,
  RoleChangeLogItem,
  updateAdminRoleApps,
  updateAdminRolePanels,
} from '@/api/client'
import { useAuth } from '@/context/AuthContext'

function getRequestErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string; error?: string }>(error)) {
    const apiMessage = error.response?.data?.message || error.response?.data?.error
    if (apiMessage) return apiMessage
    if (error.response?.status) return `HTTP ${error.response.status}`
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Brak odpowiedzi serwera'
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('pl-PL')
}

export default function AdminAssignments() {
  const { user } = useAuth()
  const role = useMemo(() => (user?.rola || '').toLowerCase(), [user?.rola])
  const canManage = role === 'admin' || role === 'owner'

  const [items, setItems] = useState<RoleChangeLogItem[]>([])
  const [assignments, setAssignments] = useState<AdminAssignmentsResponse | null>(null)
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [selectedRoleKey, setSelectedRoleKey] = useState('')
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [selectedPanels, setSelectedPanels] = useState<Record<string, string[]>>({})
  const [assignmentNotice, setAssignmentNotice] = useState('')
  const [savingApps, setSavingApps] = useState(false)
  const [savingPanels, setSavingPanels] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)

  const [actorFilterInput, setActorFilterInput] = useState('')
  const [targetFilterInput, setTargetFilterInput] = useState('')
  const [roleFilterInput, setRoleFilterInput] = useState('')

  const [actorFilter, setActorFilter] = useState<number | undefined>(undefined)
  const [targetFilter, setTargetFilter] = useState<number | undefined>(undefined)
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined)

  const loadAssignments = async () => {
    const response = await getAdminAssignments()
    setAssignments(response)
    if (!selectedRoleKey && response.roles.length > 0) {
      const firstRole = response.roles[0].key
      setSelectedRoleKey(firstRole)
      setSelectedApps(response.app_assignments[firstRole] || [])
      setSelectedPanels(response.panel_assignments[firstRole] || {})
    }
  }

  useEffect(() => {
    if (!canManage) return

    let mounted = true
    setAssignmentsLoading(true)
    void (async () => {
      try {
        const response = await getAdminAssignments()
        if (!mounted) return
        setAssignments(response)

        const roleKey = selectedRoleKey || response.roles[0]?.key || ''
        setSelectedRoleKey(roleKey)
        if (roleKey) {
          setSelectedApps(response.app_assignments[roleKey] || [])
          setSelectedPanels(response.panel_assignments[roleKey] || {})
        }
      } catch (requestError) {
        if (!mounted) return
        setAssignmentNotice(`Nie udalo sie pobrac przypisan: ${getRequestErrorMessage(requestError)}`)
      } finally {
        if (mounted) setAssignmentsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [canManage])

  useEffect(() => {
    if (!assignments || !selectedRoleKey) return
    setSelectedApps(assignments.app_assignments[selectedRoleKey] || [])
    setSelectedPanels(assignments.panel_assignments[selectedRoleKey] || {})
  }, [assignments, selectedRoleKey])

  useEffect(() => {
    if (!canManage) return

    let mounted = true
    setLoading(true)
    setError('')

    void (async () => {
      try {
        const response = await listAdminRoleChangeLogs({
          page,
          perPage,
          actorUserId: actorFilter,
          targetUserId: targetFilter,
          newRole: roleFilter,
        })

        if (!mounted) return
        setItems(response.data || [])
        setTotal(response.meta?.total || 0)
        setLastPage(response.meta?.last_page || 1)
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
        setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [canManage, page, perPage, actorFilter, targetFilter, roleFilter])

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const actorParsed = Number(actorFilterInput)
    const targetParsed = Number(targetFilterInput)
    const roleParsed = roleFilterInput.trim().toLowerCase()

    setActorFilter(Number.isInteger(actorParsed) && actorParsed > 0 ? actorParsed : undefined)
    setTargetFilter(Number.isInteger(targetParsed) && targetParsed > 0 ? targetParsed : undefined)
    setRoleFilter(roleParsed ? roleParsed : undefined)
    setPage(1)
  }

  const clearFilters = () => {
    setActorFilterInput('')
    setTargetFilterInput('')
    setRoleFilterInput('')
    setActorFilter(undefined)
    setTargetFilter(undefined)
    setRoleFilter(undefined)
    setPage(1)
  }

  const toggleApp = (appKey: string) => {
    setSelectedApps((prev) => {
      const exists = prev.includes(appKey)
      if (exists) {
        setSelectedPanels((currentPanels) => {
          const next = { ...currentPanels }
          delete next[appKey]
          return next
        })
        return prev.filter((item) => item !== appKey)
      }

      return [...prev, appKey]
    })
  }

  const togglePanel = (appKey: string, panelKey: string) => {
    setSelectedPanels((prev) => {
      const current = prev[appKey] || []
      const nextPanels = current.includes(panelKey)
        ? current.filter((item) => item !== panelKey)
        : [...current, panelKey]

      return {
        ...prev,
        [appKey]: nextPanels,
      }
    })
  }

  const submitApps = () => {
    if (!selectedRoleKey) return
    setSavingApps(true)
    setAssignmentNotice('')

    void (async () => {
      try {
        await updateAdminRoleApps(selectedRoleKey, selectedApps)
        await loadAssignments()
        setAssignmentNotice('Przypisania aplikacji zostaly zapisane.')
      } catch (requestError) {
        setAssignmentNotice(`Nie udalo sie zapisac aplikacji: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingApps(false)
      }
    })()
  }

  const submitPanels = () => {
    if (!selectedRoleKey) return

    const payload = Object.fromEntries(
      Object.entries(selectedPanels).filter(([appKey]) => selectedApps.includes(appKey)),
    )

    setSavingPanels(true)
    setAssignmentNotice('')
    void (async () => {
      try {
        await updateAdminRolePanels(selectedRoleKey, payload)
        await loadAssignments()
        setAssignmentNotice('Przypisania paneli zostaly zapisane.')
      } catch (requestError) {
        setAssignmentNotice(`Nie udalo sie zapisac paneli: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingPanels(false)
      }
    })()
  }

  if (!canManage) {
    return (
      <section className="card admin-page">
        <h1 style={{ marginTop: 0 }}>Przypisania</h1>
        <p className="muted">Ten obszar jest dostepny tylko dla roli admin lub owner.</p>
      </section>
    )
  }

  return (
    <section className="card admin-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/neuronetix-logo.png" alt="Admin" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Przypisania</h1>
        </div>
        <small className="muted">Miejsce pod przypisania ról do aplikacji i paneli</small>
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Edytor przypisan</h2>
            <small className="muted">Wybierz role, a potem ustaw dostep do aplikacji i paneli.</small>
          </div>
          <select
            className="admin-field"
            value={selectedRoleKey}
            onChange={(event) => setSelectedRoleKey(event.target.value)}
            style={{ minWidth: 180 }}
          >
            {(assignments?.roles || []).map((roleItem) => (
              <option key={roleItem.key} value={roleItem.key}>{roleItem.key}</option>
            ))}
          </select>
        </div>

        {assignmentsLoading && <p className="muted">Ladowanie przypisan...</p>}

        <div className="assignment-section">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Aplikacje</h3>
            <button type="button" className="btn btn-primary" disabled={savingApps || !selectedRoleKey} onClick={submitApps}>
              {savingApps ? 'Zapisywanie...' : 'Zapisz aplikacje'}
            </button>
          </div>
          <div className="assignment-grid">
            {(assignments?.apps || []).map((appKey) => {
              const isActive = selectedApps.includes(appKey)
              return (
                <button
                  key={appKey}
                  type="button"
                  className={`assignment-chip${isActive ? ' active' : ''}`}
                  onClick={() => toggleApp(appKey)}
                >
                  {appKey}
                </button>
              )
            })}
          </div>
        </div>

        <div className="assignment-section" style={{ marginTop: 16 }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Panele</h3>
            <button type="button" className="btn btn-primary" disabled={savingPanels || !selectedRoleKey} onClick={submitPanels}>
              {savingPanels ? 'Zapisywanie...' : 'Zapisz panele'}
            </button>
          </div>
          <div className="assignment-groups">
            {Object.entries(assignments?.panels || {}).map(([appKey, panelKeys]) => {
              const appEnabled = selectedApps.includes(appKey)
              return (
                <section key={appKey} className="assignment-group">
                  <div className="row-between" style={{ marginBottom: 8 }}>
                    <h4 style={{ margin: 0 }}>{appKey}</h4>
                    <small className="muted">{appEnabled ? 'Aktywna aplikacja' : 'Najpierw wlacz aplikacje'}</small>
                  </div>
                  <div className="assignment-grid">
                    {panelKeys.map((panelKey) => {
                      const isActive = !!selectedPanels[appKey]?.includes(panelKey)
                      return (
                        <button
                          key={`${appKey}-${panelKey}`}
                          type="button"
                          className={`assignment-chip${isActive ? ' active' : ''}`}
                          disabled={!appEnabled}
                          onClick={() => togglePanel(appKey, panelKey)}
                        >
                          {panelKey}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {assignmentNotice && <p className="muted" style={{ marginBottom: 0, marginTop: 12, color: '#bfdbfe' }}>{assignmentNotice}</p>}
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Historia zmian ról</h2>
            <small className="muted">Dziennik zmian jako podstawa pod przyszle przypisania i polityki dostepu.</small>
          </div>
          <div className="muted small">Lacznie wpisow: {total}</div>
        </div>

        <form className="row" style={{ flexWrap: 'wrap', marginBottom: 10 }} onSubmit={applyFilters}>
          <input className="admin-field" value={actorFilterInput} onChange={(event) => setActorFilterInput(event.target.value)} placeholder="ID admina" style={{ minWidth: 120 }} />
          <input className="admin-field" value={targetFilterInput} onChange={(event) => setTargetFilterInput(event.target.value)} placeholder="ID uzytkownika" style={{ minWidth: 140 }} />
          <input className="admin-field" value={roleFilterInput} onChange={(event) => setRoleFilterInput(event.target.value)} placeholder="Rola docelowa" style={{ minWidth: 140 }} />
          <button type="submit" className="btn btn-primary">Filtruj</button>
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>Wyczysc</button>
        </form>

        {error && <p className="muted" style={{ color: '#fca5a5' }}>Blad: {error}</p>}

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Aktor</th>
                <th>Cel</th>
                <th>Zmiana</th>
                <th>Powod</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="muted">Ladowanie logow...</td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">Brak wpisow dla podanych filtrow.</td>
                </tr>
              )}

              {!loading && items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td className="small">{formatTimestamp(item.created_at)}</td>
                  <td>
                    <div>{item.actor.imie || item.actor.nick || item.actor.email || `#${item.actor.id}`}</div>
                    <small className="muted">#{item.actor.id}</small>
                  </td>
                  <td>
                    <div>{item.target.imie || item.target.nick || item.target.email || `#${item.target.id}`}</div>
                    <small className="muted">#{item.target.id}</small>
                  </td>
                  <td>
                    <span className="muted">{item.old_role || '-'}</span>
                    {' -> '}
                    <strong>{item.new_role}</strong>
                  </td>
                  <td className="small">{item.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row-between" style={{ marginTop: 10 }}>
          <small className="muted">Strona {page} z {Math.max(lastPage, 1)}</small>
          <div className="row">
            <button type="button" className="btn btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Poprzednia</button>
            <button type="button" className="btn btn-ghost" disabled={page >= lastPage || loading} onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}>Nastepna</button>
          </div>
        </div>
      </div>
    </section>
  )
}
