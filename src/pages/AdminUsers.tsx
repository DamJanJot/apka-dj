import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  AdminRoleItem,
  AdminUserListItem,
  createAdminUser,
  listAdminRoles,
  listAdminUsers,
  updateAdminUserRole,
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

export default function AdminUsers() {
  const { user } = useAuth()
  const role = useMemo(() => (user?.rola || '').toLowerCase(), [user?.rola])
  const canManage = role === 'admin' || role === 'owner'

  const [roles, setRoles] = useState<AdminRoleItem[]>([])
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userError, setUserError] = useState('')
  const [noticeByUserId, setNoticeByUserId] = useState<Record<number, string>>({})

  const [usersPage, setUsersPage] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLastPage, setUsersLastPage] = useState(1)
  const [usersQueryInput, setUsersQueryInput] = useState('')
  const [usersRoleFilterInput, setUsersRoleFilterInput] = useState('')
  const [usersQuery, setUsersQuery] = useState<string | undefined>(undefined)
  const [usersRoleFilter, setUsersRoleFilter] = useState<string | undefined>(undefined)
  const [savingByUserId, setSavingByUserId] = useState<Record<number, boolean>>({})
  const [roleDraftByUserId, setRoleDraftByUserId] = useState<Record<number, string>>({})
  const [reasonDraftByUserId, setReasonDraftByUserId] = useState<Record<number, string>>({})

  const [perPage] = useState(20)
  const [createSaving, setCreateSaving] = useState(false)
  const [createNotice, setCreateNotice] = useState('')
  const [newImie, setNewImie] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newNick, setNewNick] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')

  const loadUsers = async () => {
    const response = await listAdminUsers({
      page: usersPage,
      perPage,
      q: usersQuery,
      role: usersRoleFilter,
    })

    setUsers(response.data || [])
    setUsersTotal(response.meta?.total || 0)
    setUsersLastPage(response.meta?.last_page || 1)
    setRoleDraftByUserId((prev) => {
      const next = { ...prev }
      for (const u of response.data || []) {
        if (!next[u.id]) next[u.id] = u.rola || ''
      }
      return next
    })
  }

  useEffect(() => {
    if (!canManage) return

    let mounted = true
    void (async () => {
      try {
        const response = await listAdminRoles()
        if (!mounted) return
        const roleItems = response.data || []
        setRoles(roleItems)
        if (roleItems.length > 0 && !roleItems.some((r) => r.key === newRole)) {
          setNewRole(roleItems[0].key)
        }
      } catch {
        if (!mounted) return
        setRoles([])
      }
    })()

    return () => {
      mounted = false
    }
  }, [canManage, newRole])

  useEffect(() => {
    if (!canManage) return

    let mounted = true
    setUsersLoading(true)
    setUserError('')

    void (async () => {
      try {
        const response = await listAdminUsers({
          page: usersPage,
          perPage,
          q: usersQuery,
          role: usersRoleFilter,
        })
        if (!mounted) return

        setUsers(response.data || [])
        setUsersTotal(response.meta?.total || 0)
        setUsersLastPage(response.meta?.last_page || 1)
        setRoleDraftByUserId((prev) => {
          const next = { ...prev }
          for (const u of response.data || []) {
            if (!next[u.id]) next[u.id] = u.rola || ''
          }
          return next
        })
      } catch (requestError) {
        if (!mounted) return
        setUserError(getRequestErrorMessage(requestError))
        setUsers([])
      } finally {
        if (mounted) setUsersLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [canManage, usersPage, perPage, usersQuery, usersRoleFilter])

  const applyUsersFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = usersQueryInput.trim()
    const roleFilter = usersRoleFilterInput.trim().toLowerCase()
    setUsersQuery(q ? q : undefined)
    setUsersRoleFilter(roleFilter ? roleFilter : undefined)
    setUsersPage(1)
  }

  const clearUsersFilters = () => {
    setUsersQueryInput('')
    setUsersRoleFilterInput('')
    setUsersQuery(undefined)
    setUsersRoleFilter(undefined)
    setUsersPage(1)
  }

  const submitRoleChangeForUser = (userItem: AdminUserListItem) => {
    const normalizedRole = (roleDraftByUserId[userItem.id] || '').trim().toLowerCase()
    const reason = (reasonDraftByUserId[userItem.id] || '').trim()
    if (!normalizedRole) {
      setNoticeByUserId((prev) => ({ ...prev, [userItem.id]: 'Wybierz role docelowa.' }))
      return
    }

    setSavingByUserId((prev) => ({ ...prev, [userItem.id]: true }))
    setNoticeByUserId((prev) => ({ ...prev, [userItem.id]: '' }))

    void (async () => {
      try {
        await updateAdminUserRole(userItem.id, normalizedRole, reason || undefined)
        setNoticeByUserId((prev) => ({ ...prev, [userItem.id]: 'Rola zostala zaktualizowana.' }))
        await loadUsers()
      } catch (requestError) {
        setNoticeByUserId((prev) => ({
          ...prev,
          [userItem.id]: `Nie udalo sie zmienic roli: ${getRequestErrorMessage(requestError)}`,
        }))
      } finally {
        setSavingByUserId((prev) => ({ ...prev, [userItem.id]: false }))
      }
    })()
  }

  const submitCreateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const imie = newImie.trim()
    const email = newEmail.trim().toLowerCase()
    const nick = newNick.trim()
    const roleToCreate = newRole.trim().toLowerCase() || 'user'

    if (!imie) {
      setCreateNotice('Podaj imie uzytkownika.')
      return
    }

    if (!email) {
      setCreateNotice('Podaj email uzytkownika.')
      return
    }

    if (newPassword.length < 8) {
      setCreateNotice('Haslo musi miec minimum 8 znakow.')
      return
    }

    if (newPassword !== newPasswordConfirmation) {
      setCreateNotice('Hasla nie sa takie same.')
      return
    }

    setCreateSaving(true)
    setCreateNotice('')

    void (async () => {
      try {
        await createAdminUser({
          imie,
          email,
          nick: nick || undefined,
          role: roleToCreate,
          password: newPassword,
          password_confirmation: newPasswordConfirmation,
        })

        setCreateNotice('Uzytkownik zostal utworzony.')
        setNewImie('')
        setNewEmail('')
        setNewNick('')
        setNewRole(roles[0]?.key || 'user')
        setNewPassword('')
        setNewPasswordConfirmation('')

        setUsersPage(1)
        await loadUsers()
      } catch (requestError) {
        setCreateNotice(`Nie udalo sie utworzyc uzytkownika: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setCreateSaving(false)
      }
    })()
  }

  if (!canManage) {
    return (
      <section className="card admin-page">
        <h1 style={{ marginTop: 0 }}>Uzytkownicy</h1>
        <p className="muted">Ten obszar jest dostepny tylko dla roli admin lub owner.</p>
      </section>
    )
  }

  return (
    <section className="card admin-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/neuronetix-logo.png" alt="Admin" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Uzytkownicy</h1>
        </div>
        <small className="muted">Tworzenie i zarzadzanie uzytkownikami</small>
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <h2 style={{ marginTop: 0 }}>Nowy uzytkownik</h2>
        <form className="row" style={{ flexWrap: 'wrap', marginBottom: 10 }} onSubmit={submitCreateUser}>
          <input className="admin-field" value={newImie} onChange={(event) => setNewImie(event.target.value)} placeholder="Imie" style={{ minWidth: 140 }} />
          <input className="admin-field" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="Email" style={{ minWidth: 220 }} />
          <input className="admin-field" value={newNick} onChange={(event) => setNewNick(event.target.value)} placeholder="Nick (opcjonalnie)" style={{ minWidth: 160 }} />
          <select className="admin-field" value={newRole} onChange={(event) => setNewRole(event.target.value)} style={{ minWidth: 140 }}>
            {roles.map((roleItem) => (
              <option key={roleItem.key} value={roleItem.key}>{roleItem.key}</option>
            ))}
          </select>
          <input className="admin-field" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Haslo" style={{ minWidth: 160 }} />
          <input className="admin-field" type="password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} placeholder="Powtorz haslo" style={{ minWidth: 170 }} />
          <button type="submit" className="btn btn-primary" disabled={createSaving}>{createSaving ? 'Tworzenie...' : 'Utworz uzytkownika'}</button>
        </form>
        {createNotice && <p className="muted" style={{ marginBottom: 0, color: '#bfdbfe' }}>{createNotice}</p>}
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Lista i zmiana roli</h2>
            <small className="muted">Wybierz uzytkownika i zmien role bez wpisywania ID.</small>
          </div>
          <div className="muted small">Lacznie uzytkownikow: {usersTotal}</div>
        </div>

        <form className="row" style={{ flexWrap: 'wrap', marginBottom: 10 }} onSubmit={applyUsersFilters}>
          <input className="admin-field" value={usersQueryInput} onChange={(event) => setUsersQueryInput(event.target.value)} placeholder="Szukaj po email/imie/nick" style={{ minWidth: 220 }} />
          <input className="admin-field" value={usersRoleFilterInput} onChange={(event) => setUsersRoleFilterInput(event.target.value)} placeholder="Filtr roli" style={{ minWidth: 140 }} />
          <button type="submit" className="btn btn-primary">Filtruj</button>
          <button type="button" className="btn btn-ghost" onClick={clearUsersFilters}>Wyczysc</button>
        </form>

        {userError && <p className="muted" style={{ color: '#fca5a5' }}>Blad: {userError}</p>}

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Uzytkownik</th>
                <th>Email</th>
                <th>Aktualna rola</th>
                <th>Nowa rola</th>
                <th>Powod</th>
                <th>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading && (
                <tr>
                  <td colSpan={7} className="muted">Ladowanie uzytkownikow...</td>
                </tr>
              )}

              {!usersLoading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">Brak uzytkownikow dla podanych filtrow.</td>
                </tr>
              )}

              {!usersLoading && users.map((u) => {
                const isSaving = !!savingByUserId[u.id]
                const draftRole = roleDraftByUserId[u.id] || u.rola || ''
                const draftReason = reasonDraftByUserId[u.id] || ''
                const rowNotice = noticeByUserId[u.id] || ''

                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>
                      <div>{u.imie || u.nick || '-'}</div>
                      <small className="muted">{u.nick ? `@${u.nick}` : '-'}</small>
                    </td>
                    <td>{u.email}</td>
                    <td><strong>{u.rola || '-'}</strong></td>
                    <td>
                      <select
                        className="admin-field"
                        value={draftRole}
                        onChange={(event) => setRoleDraftByUserId((prev) => ({ ...prev, [u.id]: event.target.value }))}
                        style={{ minWidth: 150 }}
                      >
                        <option value="">Wybierz role</option>
                        {roles.map((roleItem) => (
                          <option key={roleItem.key} value={roleItem.key}>{roleItem.key}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="admin-field"
                        value={draftReason}
                        onChange={(event) => setReasonDraftByUserId((prev) => ({ ...prev, [u.id]: event.target.value }))}
                        placeholder="Powod (opcjonalnie)"
                        style={{ minWidth: 190 }}
                      />
                      {rowNotice && <small className="muted" style={{ display: 'block', marginTop: 4, color: '#bfdbfe' }}>{rowNotice}</small>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={isSaving}
                        onClick={() => submitRoleChangeForUser(u)}
                      >
                        {isSaving ? 'Zapisywanie...' : 'Zmien role'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="row-between" style={{ marginTop: 10 }}>
          <small className="muted">Strona {usersPage} z {Math.max(usersLastPage, 1)}</small>
          <div className="row">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={usersPage <= 1 || usersLoading}
              onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
            >
              Poprzednia
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={usersPage >= usersLastPage || usersLoading}
              onClick={() => setUsersPage((prev) => Math.min(usersLastPage, prev + 1))}
            >
              Nastepna
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
