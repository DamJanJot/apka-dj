import { Fragment, useMemo, useState } from 'react'

type Role = 'RM' | 'AM' | 'DK'
type Availability = 'available' | 'prefer_off' | 'unavailable'
type Approval = 'pending' | 'approved' | 'rejected'
type ManagerTab = 'week' | 'month' | 'summary' | 'workplan'
export type ChicModule = 'dashboard' | 'week' | 'month' | 'summary' | 'workplan' | 'work' | 'advisors' | 'locations'

type Staff = {
  id: number
  name: string
  role: Role
  region: string
  area: string
  location: string
  managerId?: number
}

type Assignment = {
  dateKey: string
  location: string
  dkId: number | null
}

const WEEK_DAYS = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Ndz']

const STAFF: Staff[] = [
  { id: 1, name: 'Anna Mroz', role: 'RM', region: 'Polnoc', area: 'A1', location: 'HQ' },
  { id: 2, name: 'Marek Lis', role: 'AM', region: 'Polnoc', area: 'A1', location: 'Gdansk', managerId: 1 },
  { id: 3, name: 'Olga Krol', role: 'AM', region: 'Polnoc', area: 'A2', location: 'Bydgoszcz', managerId: 1 },
  { id: 11, name: 'Kamil Nowak', role: 'DK', region: 'Polnoc', area: 'A1', location: 'Gdansk', managerId: 2 },
  { id: 12, name: 'Natalia Wrobel', role: 'DK', region: 'Polnoc', area: 'A1', location: 'Gdynia', managerId: 2 },
  { id: 13, name: 'Patryk Sowa', role: 'DK', region: 'Polnoc', area: 'A2', location: 'Bydgoszcz', managerId: 3 },
  { id: 14, name: 'Ewa Kaczor', role: 'DK', region: 'Polnoc', area: 'A2', location: 'Torun', managerId: 3 },
]

const MANAGER_TABS: { id: ManagerTab; label: string }[] = [
  { id: 'week', label: 'Tydzien' },
  { id: 'month', label: 'Miesiac' },
  { id: 'summary', label: 'Podsumowanie' },
  { id: 'workplan', label: 'Plan pracy' },
]

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function nextAvailability(current: Availability): Availability {
  if (current === 'available') return 'prefer_off'
  if (current === 'prefer_off') return 'unavailable'
  return 'available'
}

function availabilityLabel(value: Availability) {
  if (value === 'available') return 'OK'
  if (value === 'prefer_off') return 'Wole wolne'
  return 'Nie moge'
}

export default function ChicPlanner({ module = 'dashboard' }: { module?: ChicModule }) {
  const [activeTab, setActiveTab] = useState<ManagerTab>('week')
  const [selectedAmId, setSelectedAmId] = useState<number>(2)
  const [selectedDkId, setSelectedDkId] = useState<number>(11)
  const [showTopInfo, setShowTopInfo] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [showManagerContext, setShowManagerContext] = useState(false)

  const monthAnchor = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [])

  const weekDates = useMemo(() => {
    const first = startOfWeek(new Date())
    return WEEK_DAYS.map((_, idx) => addDays(first, idx))
  }, [])

  const monthCalendar = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
    const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0)
    const offset = (first.getDay() + 6) % 7
    const totalCells = Math.ceil((offset + last.getDate()) / 7) * 7

    const cells: Array<Date | null> = []
    for (let i = 0; i < totalCells; i += 1) {
      const dayNumber = i - offset + 1
      if (dayNumber < 1 || dayNumber > last.getDate()) {
        cells.push(null)
      } else {
        cells.push(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), dayNumber))
      }
    }
    return cells
  }, [monthAnchor])

  const monthDateKeys = useMemo(() => monthCalendar.filter(Boolean).map((d) => toDateKey(d as Date)), [monthCalendar])

  const amList = useMemo(() => STAFF.filter((s) => s.role === 'AM'), [])
  const selectedAm = useMemo(() => amList.find((a) => a.id === selectedAmId) || amList[0], [amList, selectedAmId])

  const managedDks = useMemo(() => {
    if (!selectedAm) return []
    return STAFF.filter((s) => s.role === 'DK' && s.area === selectedAm.area)
  }, [selectedAm])

  const managedLocations = useMemo(() => Array.from(new Set(managedDks.map((s) => s.location))), [managedDks])

  const [availabilityByDk, setAvailabilityByDk] = useState<Record<number, Record<string, Availability>>>(() => {
    const map: Record<number, Record<string, Availability>> = {}
    const first = startOfWeek(new Date())
    const allKeys = Array.from({ length: 42 }, (_, idx) => toDateKey(addDays(first, idx)))

    for (const dk of STAFF.filter((s) => s.role === 'DK')) {
      map[dk.id] = {}
      for (const key of allKeys) {
        map[dk.id][key] = 'available'
      }
    }
    return map
  })

  const [approvalByDk, setApprovalByDk] = useState<Record<number, Record<string, Approval>>>(() => {
    const map: Record<number, Record<string, Approval>> = {}
    const first = startOfWeek(new Date())
    const allKeys = Array.from({ length: 42 }, (_, idx) => toDateKey(addDays(first, idx)))

    for (const dk of STAFF.filter((s) => s.role === 'DK')) {
      map[dk.id] = {}
      for (const key of allKeys) {
        map[dk.id][key] = 'approved'
      }
    }
    return map
  })

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const rows: Assignment[] = []
    const first = startOfWeek(new Date())
    for (let d = 0; d < 14; d += 1) {
      const dateKey = toDateKey(addDays(first, d))
      for (const location of ['Gdansk', 'Gdynia', 'Bydgoszcz', 'Torun']) {
        rows.push({ dateKey, location, dkId: null })
      }
    }
    return rows
  })

  const dkForSelf = useMemo(() => {
    const fallback = STAFF.find((s) => s.role === 'DK')
    return STAFF.find((s) => s.id === selectedDkId && s.role === 'DK') || fallback || null
  }, [selectedDkId])

  const setAvailability = (dkId: number, dateKey: string, value: Availability) => {
    setAvailabilityByDk((prev) => ({
      ...prev,
      [dkId]: {
        ...(prev[dkId] || {}),
        [dateKey]: value,
      },
    }))

    setApprovalByDk((prev) => ({
      ...prev,
      [dkId]: {
        ...(prev[dkId] || {}),
        [dateKey]: value === 'available' ? 'approved' : 'pending',
      },
    }))
  }

  const toggleAvailability = (dkId: number, dateKey: string) => {
    const current = availabilityByDk[dkId]?.[dateKey] || 'available'
    setAvailability(dkId, dateKey, nextAvailability(current))
  }

  const setApproval = (dkId: number, dateKey: string, value: Approval) => {
    setApprovalByDk((prev) => ({
      ...prev,
      [dkId]: {
        ...(prev[dkId] || {}),
        [dateKey]: value,
      },
    }))
  }

  const assignDk = (dateKey: string, location: string, dkId: number | null) => {
    setAssignments((prev) => prev.map((row) => {
      if (row.dateKey === dateKey && row.location === location) {
        return { ...row, dkId }
      }
      return row
    }))
  }

  const managedAssignments = useMemo(() => {
    return assignments.filter((a) => managedLocations.includes(a.location))
  }, [assignments, managedLocations])

  const summary = useMemo(() => {
    const rmCount = STAFF.filter((s) => s.role === 'RM').length
    const amCount = STAFF.filter((s) => s.role === 'AM').length
    const dkCount = STAFF.filter((s) => s.role === 'DK').length

    const unavailableCount = managedDks.reduce((acc, dk) => {
      const byDay = availabilityByDk[dk.id] || {}
      return acc + monthDateKeys.filter((key) => byDay[key] === 'unavailable').length
    }, 0)

    const pendingCount = managedDks.reduce((acc, dk) => {
      const byDay = approvalByDk[dk.id] || {}
      return acc + monthDateKeys.filter((key) => byDay[key] === 'pending').length
    }, 0)

    const assignedSlots = managedAssignments.filter((a) => !!a.dkId).length
    return { rmCount, amCount, dkCount, unavailableCount, pendingCount, assignedSlots }
  }, [availabilityByDk, approvalByDk, managedAssignments, managedDks, monthDateKeys])

  const locationStats = useMemo(() => {
    return managedLocations.map((location) => {
      const slots = managedAssignments.filter((a) => a.location === location)
      const filled = slots.filter((a) => !!a.dkId).length
      const coverage = slots.length ? Math.round((filled / slots.length) * 100) : 0
      return { location, slots: slots.length, filled, coverage }
    })
  }, [managedAssignments, managedLocations])

  const pendingRequests = useMemo(() => {
    const rows: Array<{ dkId: number; dateKey: string; value: Availability }> = []
    for (const dk of managedDks) {
      for (const key of monthDateKeys) {
        const approval = approvalByDk[dk.id]?.[key] || 'approved'
        const value = availabilityByDk[dk.id]?.[key] || 'available'
        if (approval === 'pending' && value !== 'available') {
          rows.push({ dkId: dk.id, dateKey: key, value })
        }
      }
    }
    return rows
  }, [managedDks, monthDateKeys, approvalByDk, availabilityByDk])

  const weekDateKeys = weekDates.map((d) => toDateKey(d))

  const managerContext = (
    <article className="chic-panel">
      <h3>Kontekst AM</h3>
      <label className="small muted" htmlFor="amSelect">Wybierz AM</label>
      <select
        id="amSelect"
        className="auth-input"
        value={selectedAm?.id || ''}
        onChange={(e) => setSelectedAmId(Number(e.target.value))}
      >
        {amList.map((am) => (
          <option key={am.id} value={am.id}>{am.name} ({am.area})</option>
        ))}
      </select>

      <div className="chic-meta-list">
        <div><span>Region</span><b>{selectedAm?.region || '-'}</b></div>
        <div><span>Area</span><b>{selectedAm?.area || '-'}</b></div>
        <div><span>Lokalizacje</span><b>{managedLocations.join(', ') || '-'}</b></div>
        <div><span>Doradcy DK</span><b>{managedDks.length}</b></div>
      </div>
    </article>
  )

  const legendPanel = (
    <article className="chic-panel chic-legend-panel" style={{ marginTop: 10 }}>
      <h3>Legenda kolorow</h3>
      <div className="chic-legend-grid">
        <div className="chic-legend-item"><span className="chic-legend-dot available" /> Dostepny</div>
        <div className="chic-legend-item"><span className="chic-legend-dot prefer_off" /> Wole wolne</div>
        <div className="chic-legend-item"><span className="chic-legend-dot unavailable" /> Niedostepny</div>
        <div className="chic-legend-item"><span className="chic-legend-dot approved" /> Akceptacja OK</div>
        <div className="chic-legend-item"><span className="chic-legend-dot pending" /> Akceptacja oczekuje</div>
        <div className="chic-legend-item"><span className="chic-legend-dot rejected" /> Akceptacja odrzucona</div>
      </div>
    </article>
  )

  const managerPanels: Record<ManagerTab, JSX.Element> = {
    week: (
      <article className="chic-panel">
        <h3>Tydzien - kalendarz lokalizacji</h3>
        <div className="chic-calendar-scroll">
          <div className="chic-week-grid">
            <div className="chic-week-head chic-week-cell">Lokalizacja</div>
            {weekDates.map((date) => (
              <div key={toDateKey(date)} className="chic-week-head chic-week-cell">{WEEK_DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]} {date.getDate()}</div>
            ))}

            {managedLocations.map((location) => (
              <Fragment key={location}>
                <div key={`${location}-name`} className="chic-week-row-label chic-week-cell">{location}</div>
                {weekDateKeys.map((dateKey) => {
                  const slot = managedAssignments.find((a) => a.location === location && a.dateKey === dateKey)
                  const dk = slot?.dkId ? managedDks.find((d) => d.id === slot.dkId) : null
                  return (
                    <div key={`${location}-${dateKey}`} className="chic-week-cell">
                      <span className="small">{dk ? dk.name : '-'}</span>
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </article>
    ),
    month: (
      <article className="chic-panel">
        <h3>Miesiac - kalendarz zespolu</h3>
        <div className="chic-calendar-scroll">
          <div className="chic-month-grid">
            {WEEK_DAYS.map((d) => <div key={d} className="chic-month-head">{d}</div>)}
            {monthCalendar.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="chic-month-cell empty" />
              const key = toDateKey(date)
              const unavailable = managedDks.filter((dk) => availabilityByDk[dk.id]?.[key] === 'unavailable').length
              const preferOff = managedDks.filter((dk) => availabilityByDk[dk.id]?.[key] === 'prefer_off').length
              const filled = managedAssignments.filter((a) => a.dateKey === key && a.dkId).length

              return (
                <div key={key} className="chic-month-cell">
                  <div className="chic-month-date">{date.getDate()}</div>
                  <div className="chic-mini-metrics">
                    <span className="chic-mini-badge unavailable" title="Niedostepni">{unavailable}</span>
                    <span className="chic-mini-badge prefer_off" title="Wole wolne">{preferOff}</span>
                    <span className="chic-mini-badge approved" title="Obsadzone">{filled}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </article>
    ),
    summary: (
      <article className="chic-panel">
        <h3>Podsumowanie</h3>
        <div className="chic-stats">
          <div className="chic-stat"><span>RM</span><b>{summary.rmCount}</b></div>
          <div className="chic-stat"><span>AM</span><b>{summary.amCount}</b></div>
          <div className="chic-stat"><span>DK</span><b>{summary.dkCount}</b></div>
          <div className="chic-stat"><span>Niemozliwosci DK</span><b>{summary.unavailableCount}</b></div>
          <div className="chic-stat"><span>Wnioski pending</span><b>{summary.pendingCount}</b></div>
          <div className="chic-stat"><span>Obsadzone sloty</span><b>{summary.assignedSlots}</b></div>
        </div>
      </article>
    ),
    workplan: (
      <article className="chic-panel">
        <h3>Plan pracy</h3>
        <div className="chic-schedule-grid">
          {managedAssignments.filter((a) => weekDateKeys.includes(a.dateKey)).map((row) => {
            const assigned = managedDks.find((d) => d.id === row.dkId)
            const availability = row.dkId ? (availabilityByDk[row.dkId]?.[row.dateKey] || 'available') : 'available'
            const warning = availability !== 'available' && row.dkId

            return (
              <div key={`${row.dateKey}-${row.location}`} className={`chic-slot ${warning ? 'warn' : ''}`}>
                <div className="chic-slot-head">
                  <b>{row.dateKey}</b>
                  <span className="small muted">{row.location}</span>
                </div>
                <select
                  className="auth-input"
                  value={row.dkId || ''}
                  onChange={(e) => assignDk(row.dateKey, row.location, e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">- bez przypisania -</option>
                  {managedDks
                    .filter((dk) => dk.location === row.location)
                    .map((dk) => (
                      <option key={dk.id} value={dk.id}>{dk.name}</option>
                    ))}
                </select>
                <div className="small muted">{assigned ? `DK: ${assigned.name}` : 'Brak DK'}</div>
                {warning && <div className="small" style={{ color: '#fca5a5' }}>Uwaga: DK oznaczyl ten dzien jako niedostepny lub preferuje wolne.</div>}
              </div>
            )
          })}
        </div>
      </article>
    ),
  }

  const advisorsPanel = (
    <article className="chic-panel">
      <h3>Doradcy i akceptacje przelozonych</h3>
      <div className="chic-availability-wrap">
        {managedDks.map((dk) => {
          const unavailable = monthDateKeys.filter((key) => availabilityByDk[dk.id]?.[key] === 'unavailable').length
          const preferOff = monthDateKeys.filter((key) => availabilityByDk[dk.id]?.[key] === 'prefer_off').length
          const pending = monthDateKeys.filter((key) => approvalByDk[dk.id]?.[key] === 'pending').length
          return (
            <div key={dk.id} className="chic-availability-row">
              <div className="chic-dk-name">{dk.name}<span className="small muted">{dk.location}</span></div>
              <div className="small muted">Nie moge: {unavailable} | Wole wolne: {preferOff} | Oczekuje: {pending}</div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 10 }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Wnioski DK do akceptacji</h4>
        {pendingRequests.length === 0 && <div className="small muted">Brak oczekujacych wnioskow.</div>}
        {pendingRequests.map((row) => {
          const dk = managedDks.find((d) => d.id === row.dkId)
          return (
            <div key={`${row.dkId}-${row.dateKey}`} className="chic-pending-row">
              <div>
                <b>{dk?.name || `DK #${row.dkId}`}</b>
                <div className="small muted">{row.dateKey} - {availabilityLabel(row.value)}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn btn-primary" onClick={() => setApproval(row.dkId, row.dateKey, 'approved')}>Akceptuj</button>
                <button type="button" className="btn btn-ghost" onClick={() => setApproval(row.dkId, row.dateKey, 'rejected')}>Odrzuc</button>
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )

  const locationsPanel = (
    <article className="chic-panel">
      <h3>Lokalizacje</h3>
      <div className="chic-location-grid">
        {locationStats.map((item) => (
          <div key={item.location} className="chic-slot">
            <div className="chic-slot-head"><b>{item.location}</b><span className="small muted">Coverage</span></div>
            <div className="small muted">Sloty: {item.slots}</div>
            <div className="small muted">Obsadzone: {item.filled}</div>
            <div className="small muted">Pokrycie: {item.coverage}%</div>
          </div>
        ))}
      </div>
    </article>
  )

  const moduleTitle =
    module === 'work'
      ? 'Grafik - Grafik roboczy'
      : module === 'week'
        ? 'Grafik - Tydzien'
        : module === 'month'
          ? 'Grafik - Miesiac'
          : module === 'summary'
            ? 'Grafik - Podsumowanie'
            : module === 'workplan'
              ? 'Grafik - Plan pracy'
      : module === 'advisors'
        ? 'Grafik - Doradcy'
        : module === 'locations'
          ? 'Grafik - Lokalizacje'
          : 'Grafik - Dashboard'

  const forcedTab: ManagerTab | null =
    module === 'week'
      ? 'week'
      : module === 'month'
        ? 'month'
        : module === 'summary'
          ? 'summary'
          : module === 'workplan'
            ? 'workplan'
            : null

  return (
    <section className="card chic-page" style={{ padding: 18 }}>
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div className="row" style={{ gap: 10 }}>
            <img src="/chic-logo.png" alt="Grafiki" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            <h1 style={{ margin: 0 }}>{moduleTitle}</h1>
          </div>
        </div>
      </div>

      <div className="chic-toolbar">
        <button type="button" className="btn btn-ghost" onClick={() => setShowTopInfo((v) => !v)}>
          {showTopInfo ? 'Ukryj opis' : 'Pokaz opis'}
        </button>
        {module !== 'work' && (
          <button type="button" className="btn btn-ghost" onClick={() => setShowManagerContext((v) => !v)}>
            {showManagerContext ? 'Ukryj kontekst' : 'Pokaz kontekst'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => setShowLegend((v) => !v)}>
          {showLegend ? 'Ukryj legende' : 'Pokaz legende'}
        </button>
      </div>

      {showTopInfo && (
        <p className="muted" style={{ margin: '8px 0 0 0' }}>
          RM i AM planuja tydzien i miesiac oraz akceptuja zgloszenia DK. DK uzupelnia tylko grafik roboczy.
        </p>
      )}

      {showLegend && legendPanel}

      {module === 'work' ? (
        <article className="chic-panel" style={{ marginTop: 12 }}>
          <h3>Grafik roboczy DK</h3>
          <p className="small muted" style={{ marginTop: 0 }}>
            Kliknij dzien, aby ustawic status. Przelozeni (AM/RM) akceptuja zgloszenia.
          </p>
          <select className="auth-input chic-inline-select" value={dkForSelf?.id || ''} onChange={(e) => setSelectedDkId(Number(e.target.value))}>
            {STAFF.filter((s) => s.role === 'DK').map((dk) => (
              <option key={dk.id} value={dk.id}>{dk.name} ({dk.area})</option>
            ))}
          </select>
          <div className="chic-calendar-scroll">
            <div className="chic-month-grid">
              {WEEK_DAYS.map((d) => <div key={d} className="chic-month-head">{d}</div>)}
              {monthCalendar.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="chic-month-cell empty" />
                const key = toDateKey(date)
                const value = dkForSelf ? (availabilityByDk[dkForSelf.id]?.[key] || 'available') : 'available'
                const approval = dkForSelf ? (approvalByDk[dkForSelf.id]?.[key] || 'approved') : 'approved'
                return (
                  <button
                    key={key}
                    type="button"
                    className={`chic-month-cell chic-dk-cell ${value}`}
                    onClick={() => dkForSelf && toggleAvailability(dkForSelf.id, key)}
                  >
                    <div className="chic-month-date">{date.getDate()}</div>
                    <div className="chic-cell-flags">
                      <span className={`chic-flag ${value}`} title={`Dostepnosc: ${availabilityLabel(value)}`} />
                      <span className={`chic-flag ${approval}`} title={`Akceptacja: ${approval}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </article>
      ) : module === 'advisors' ? (
        showManagerContext ? (
          <div className="chic-grid" style={{ marginTop: 12 }}>
            {managerContext}
            {advisorsPanel}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>{advisorsPanel}</div>
        )
      ) : module === 'locations' ? (
        showManagerContext ? (
          <div className="chic-grid" style={{ marginTop: 12 }}>
            {managerContext}
            {locationsPanel}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>{locationsPanel}</div>
        )
      ) : (
        <>
          {!forcedTab && (
            <div className="chic-tabs" style={{ marginTop: 12 }}>
              {MANAGER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`chic-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {showManagerContext ? (
            <div className="chic-grid" style={{ marginTop: 12 }}>
              {managerContext}
              {managerPanels[forcedTab || activeTab]}
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>{managerPanels[forcedTab || activeTab]}</div>
          )}
        </>
      )}
    </section>
  )
}
