import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  AdminRelationItem,
  AdminRelationType,
  AdminUserListItem,
  createAdminRelation,
  deleteAdminRelation,
  listAdminRelations,
  listAdminUsers,
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

function formatUserLabel(user: { id: number; imie?: string | null; nick?: string | null; email?: string | null }): string {
  const name = user.imie || user.nick || user.email || `#${user.id}`
  return `${name} (#${user.id})`
}

export default function AdminRelations() {
  const { user } = useAuth()
  const role = useMemo(() => (user?.rola || '').toLowerCase(), [user?.rola])
  const canManage = role === 'admin' || role === 'owner'

  const [relations, setRelations] = useState<AdminRelationItem[]>([])
  const [relationTypes, setRelationTypes] = useState<AdminRelationType[]>([])
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)

  const [listRelationType, setListRelationType] = useState<string>('')
  const [listQueryInput, setListQueryInput] = useState('')
  const [listQuery, setListQuery] = useState<string | undefined>(undefined)

  const [userSearchInput, setUserSearchInput] = useState('')

  const [supervisorId, setSupervisorId] = useState('')
  const [subordinateId, setSubordinateId] = useState('')
  const [relationType, setRelationType] = useState('manager_employee')
  const [activityScope, setActivityScope] = useState('')
  const [notes, setNotes] = useState('')

  const loadRelations = async () => {
    const response = await listAdminRelations({
      page,
      perPage,
      relationType: listRelationType || undefined,
      q: listQuery,
    })

    setRelations(response.data || [])
    setRelationTypes(response.relation_types || [])
    setTotal(response.meta?.total || 0)
    setLastPage(response.meta?.last_page || 1)

    if (!relationType && response.relation_types?.length) {
      setRelationType(response.relation_types[0].key)
    }
  }

  const loadUsers = async (query?: string) => {
    const response = await listAdminUsers({ page: 1, perPage: 100, q: query })
    setUsers(response.data || [])
  }

  useEffect(() => {
    if (!canManage) return

    let mounted = true
    setLoading(true)
    setError('')

    void (async () => {
      try {
        const response = await listAdminRelations({
          page,
          perPage,
          relationType: listRelationType || undefined,
          q: listQuery,
        })

        if (!mounted) return
        setRelations(response.data || [])
        setRelationTypes(response.relation_types || [])
        setTotal(response.meta?.total || 0)
        setLastPage(response.meta?.last_page || 1)
        if (!relationType && response.relation_types?.length) {
          setRelationType(response.relation_types[0].key)
        }
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
        setRelations([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [canManage, page, perPage, listRelationType, listQuery])

  useEffect(() => {
    if (!canManage) return

    let mounted = true
    setUsersLoading(true)

    void (async () => {
      try {
        const response = await listAdminUsers({ page: 1, perPage: 100 })
        if (!mounted) return
        setUsers(response.data || [])
      } catch {
        if (!mounted) return
        setUsers([])
      } finally {
        if (mounted) setUsersLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [canManage])

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = listQueryInput.trim()
    setListQuery(q || undefined)
    setPage(1)
  }

  const clearFilters = () => {
    setListRelationType('')
    setListQueryInput('')
    setListQuery(undefined)
    setPage(1)
  }

  const searchUsers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setUsersLoading(true)
    void (async () => {
      try {
        await loadUsers(userSearchInput.trim() || undefined)
      } catch (requestError) {
        setNotice(`Nie udalo sie pobrac listy uzytkownikow: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setUsersLoading(false)
      }
    })()
  }

  const submitCreateRelation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const supervisor = Number(supervisorId)
    const subordinate = Number(subordinateId)
    const normalizedType = relationType.trim().toLowerCase()

    if (!Number.isInteger(supervisor) || supervisor <= 0) {
      setNotice('Wybierz osobe nadrzedna.')
      return
    }

    if (!Number.isInteger(subordinate) || subordinate <= 0) {
      setNotice('Wybierz osobe podrzedna.')
      return
    }

    if (!normalizedType) {
      setNotice('Wybierz typ relacji.')
      return
    }

    setSaving(true)
    setNotice('')

    void (async () => {
      try {
        await createAdminRelation({
          supervisor_user_id: supervisor,
          subordinate_user_id: subordinate,
          relation_type: normalizedType,
          activity_scope: activityScope.trim() || undefined,
          notes: notes.trim() || undefined,
        })

        setNotice('Relacja zostala zapisana.')
        setSubordinateId('')
        setActivityScope('')
        setNotes('')
        await loadRelations()
      } catch (requestError) {
        setNotice(`Nie udalo sie zapisac relacji: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSaving(false)
      }
    })()
  }

  const removeRelation = (item: AdminRelationItem) => {
    const confirmed = window.confirm(`Usunac relacje ${item.relation_type} dla #${item.id}?`)
    if (!confirmed) return

    setDeletingId(item.id)
    setNotice('')

    void (async () => {
      try {
        await deleteAdminRelation(item.id)
        setNotice('Relacja zostala usunieta.')
        await loadRelations()
      } catch (requestError) {
        setNotice(`Nie udalo sie usunac relacji: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setDeletingId(null)
      }
    })()
  }

  if (!canManage) {
    return (
      <section className="card admin-page">
        <h1 style={{ marginTop: 0 }}>Relacje</h1>
        <p className="muted">Ten obszar jest dostepny tylko dla roli admin lub owner.</p>
      </section>
    )
  }

  return (
    <section className="card admin-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/neuronetix-logo.png" alt="Admin" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Relacje</h1>
        </div>
        <small className="muted">Relacje nadrzedny-podrzedny pod przypisywanie czynnosci</small>
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <h2 style={{ marginTop: 0 }}>Nowa relacja</h2>

        <form className="row" style={{ flexWrap: 'wrap', marginBottom: 10 }} onSubmit={searchUsers}>
          <input
            className="admin-field"
            value={userSearchInput}
            onChange={(event) => setUserSearchInput(event.target.value)}
            placeholder="Szukaj uzytkownika do wyboru (imie, email, nick)"
            style={{ minWidth: 280 }}
          />
          <button type="submit" className="btn btn-ghost" disabled={usersLoading}>
            {usersLoading ? 'Szukanie...' : 'Szukaj osob'}
          </button>
        </form>

        <form className="row" style={{ flexWrap: 'wrap' }} onSubmit={submitCreateRelation}>
          <select
            className="admin-field"
            value={supervisorId}
            onChange={(event) => setSupervisorId(event.target.value)}
            style={{ minWidth: 230 }}
          >
            <option value="">Osoba nadrzedna</option>
            {users.map((u) => (
              <option key={`sup-${u.id}`} value={u.id}>{formatUserLabel(u)}</option>
            ))}
          </select>

          <select
            className="admin-field"
            value={subordinateId}
            onChange={(event) => setSubordinateId(event.target.value)}
            style={{ minWidth: 230 }}
          >
            <option value="">Osoba podrzedna</option>
            {users.map((u) => (
              <option key={`sub-${u.id}`} value={u.id}>{formatUserLabel(u)}</option>
            ))}
          </select>

          <select
            className="admin-field"
            value={relationType}
            onChange={(event) => setRelationType(event.target.value)}
            style={{ minWidth: 220 }}
          >
            {(relationTypes || []).map((typeItem) => (
              <option key={typeItem.key} value={typeItem.key}>{typeItem.label}</option>
            ))}
          </select>

          <input
            className="admin-field"
            value={activityScope}
            onChange={(event) => setActivityScope(event.target.value)}
            placeholder="Zakres czynnosci (np. matematyka, sprint 3)"
            style={{ minWidth: 240 }}
          />

          <input
            className="admin-field"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notatka (opcjonalnie)"
            style={{ minWidth: 260 }}
          />

          <button type="submit" className="btn btn-primary" disabled={saving || usersLoading}>
            {saving ? 'Zapisywanie...' : 'Zapisz relacje'}
          </button>
        </form>

        {notice && <p className="muted" style={{ marginBottom: 0, color: '#bfdbfe' }}>{notice}</p>}
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Lista relacji</h2>
            <small className="muted">Wyszukiwanie i filtrowanie zaleznosci miedzy osobami.</small>
          </div>
          <div className="muted small">Lacznie wpisow: {total}</div>
        </div>

        <form className="row" style={{ flexWrap: 'wrap', marginBottom: 10 }} onSubmit={applyFilters}>
          <select
            className="admin-field"
            value={listRelationType}
            onChange={(event) => setListRelationType(event.target.value)}
            style={{ minWidth: 220 }}
          >
            <option value="">Wszystkie typy</option>
            {(relationTypes || []).map((typeItem) => (
              <option key={`filter-${typeItem.key}`} value={typeItem.key}>{typeItem.label}</option>
            ))}
          </select>

          <input
            className="admin-field"
            value={listQueryInput}
            onChange={(event) => setListQueryInput(event.target.value)}
            placeholder="Szukaj po osobach, zakresie lub notatce"
            style={{ minWidth: 260 }}
          />

          <button type="submit" className="btn btn-primary">Filtruj</button>
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>Wyczysc</button>
        </form>

        {error && <p className="muted" style={{ color: '#fca5a5' }}>Blad: {error}</p>}

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Typ</th>
                <th>Nadrzedny</th>
                <th>Podrzedny</th>
                <th>Zakres</th>
                <th>Notatka</th>
                <th>Data</th>
                <th>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="muted">Ladowanie relacji...</td>
                </tr>
              )}

              {!loading && relations.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">Brak relacji dla podanych filtrow.</td>
                </tr>
              )}

              {!loading && relations.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td><strong>{item.relation_type}</strong></td>
                  <td>{formatUserLabel(item.supervisor)}</td>
                  <td>{formatUserLabel(item.subordinate)}</td>
                  <td>{item.activity_scope || '-'}</td>
                  <td>{item.notes || '-'}</td>
                  <td className="small">{formatTimestamp(item.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={deletingId === item.id}
                      onClick={() => removeRelation(item)}
                    >
                      {deletingId === item.id ? 'Usuwanie...' : 'Usun'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row-between" style={{ marginTop: 10 }}>
          <small className="muted">Strona {page} z {Math.max(lastPage, 1)}</small>
          <div className="row">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Poprzednia
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
            >
              Nastepna
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
