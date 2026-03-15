import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { getTeacherOverview, TeacherOverviewStudent } from '@/api/client'

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

function displayStudentName(item: TeacherOverviewStudent): string {
  return item.student.imie || item.student.nick || item.student.email || `#${item.student.id}`
}

export default function TeacherPanel() {
  const [items, setItems] = useState<TeacherOverviewStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [stats, setStats] = useState<Record<string, number>>({})

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    setWarning('')

    void (async () => {
      try {
        const response = await getTeacherOverview()
        if (!mounted) return

        setItems(response.students || [])
        setStats(response.meta?.by_type || {})
        setWarning(response.warning || '')
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
  }, [])

  const total = useMemo(() => items.length, [items])

  return (
    <section className="card admin-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/neuronetix-logo.png" alt="Neuronetix" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Panel nauczyciela</h1>
        </div>
        <small className="muted">Podglad uczniow i relacji opiekunczych</small>
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="row-between">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Twoi podopieczni</h2>
            <p className="muted" style={{ margin: 0 }}>
              Lista budowana na bazie relacji nadrzedny-podrzedny z modułu Admin Relacje.
            </p>
          </div>
          <div className="muted small">Lacznie: {total}</div>
        </div>

        {warning && <p className="muted" style={{ color: '#fbbf24', marginTop: 10 }}>{warning}</p>}
        {error && <p className="muted" style={{ color: '#fca5a5', marginTop: 10 }}>Blad: {error}</p>}

        <div className="row" style={{ flexWrap: 'wrap', marginTop: 10, marginBottom: 4 }}>
          {Object.entries(stats).map(([type, count]) => (
            <span key={type} className="assignment-chip active" style={{ cursor: 'default' }}>
              {type}: {count}
            </span>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <h2 style={{ marginTop: 0 }}>Relacje uczniow</h2>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Uczen</th>
                <th>Email</th>
                <th>Typ relacji</th>
                <th>Zakres</th>
                <th>Notatka</th>
                <th>Aktualizacja</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="muted">Ladowanie danych panelu nauczyciela...</td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">Brak przypisanych uczniow.</td>
                </tr>
              )}

              {!loading && items.map((item) => (
                <tr key={item.relation_id}>
                  <td>
                    <div>{displayStudentName(item)}</div>
                    <small className="muted">#{item.student.id}</small>
                  </td>
                  <td>{item.student.email || '-'}</td>
                  <td><strong>{item.relation_type}</strong></td>
                  <td>{item.activity_scope || '-'}</td>
                  <td>{item.notes || '-'}</td>
                  <td className="small">{formatTimestamp(item.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
