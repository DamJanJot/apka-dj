import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  AdminRoleItem,
  createAdminRole,
  deleteAdminRole,
  listAdminRoles,
  updateAdminRole,
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

export default function AdminRoles() {
  const { user } = useAuth()
  const role = useMemo(() => (user?.rola || '').toLowerCase(), [user?.rola])
  const canManage = role === 'admin' || role === 'owner'

  const [roles, setRoles] = useState<AdminRoleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roleCreateSaving, setRoleCreateSaving] = useState(false)
  const [roleNotice, setRoleNotice] = useState('')
  const [newRoleKey, setNewRoleKey] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [savingRoleMetaByKey, setSavingRoleMetaByKey] = useState<Record<string, boolean>>({})
  const [roleNameDraftByKey, setRoleNameDraftByKey] = useState<Record<string, string>>({})
  const [roleDescDraftByKey, setRoleDescDraftByKey] = useState<Record<string, string>>({})

  const loadRoles = async () => {
    const response = await listAdminRoles()
    const roleItems = response.data || []
    setRoles(roleItems)
    setRoleNameDraftByKey((prev) => {
      const next = { ...prev }
      for (const roleItem of roleItems) {
        if (!(roleItem.key in next)) next[roleItem.key] = roleItem.name
      }
      return next
    })
    setRoleDescDraftByKey((prev) => {
      const next = { ...prev }
      for (const roleItem of roleItems) {
        if (!(roleItem.key in next)) next[roleItem.key] = roleItem.description || ''
      }
      return next
    })
  }

  useEffect(() => {
    if (!canManage) return

    let mounted = true
    setLoading(true)
    setError('')

    void (async () => {
      try {
        const response = await listAdminRoles()
        if (!mounted) return

        const roleItems = response.data || []
        setRoles(roleItems)
        setRoleNameDraftByKey((prev) => {
          const next = { ...prev }
          for (const roleItem of roleItems) {
            if (!(roleItem.key in next)) next[roleItem.key] = roleItem.name
          }
          return next
        })
        setRoleDescDraftByKey((prev) => {
          const next = { ...prev }
          for (const roleItem of roleItems) {
            if (!(roleItem.key in next)) next[roleItem.key] = roleItem.description || ''
          }
          return next
        })
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [canManage])

  const submitCreateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const key = newRoleKey.trim().toLowerCase()
    const name = newRoleName.trim()
    const description = newRoleDescription.trim()
    if (!key) {
      setRoleNotice('Podaj klucz roli, np. editor.')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(key)) {
      setRoleNotice('Klucz roli moze zawierac tylko male litery, cyfry, _ i -.')
      return
    }
    if (!name) {
      setRoleNotice('Podaj nazwe roli.')
      return
    }

    setRoleCreateSaving(true)
    setRoleNotice('')
    void (async () => {
      try {
        await createAdminRole({ key, name, description: description || undefined })
        setRoleNotice('Rola zostala utworzona.')
        setNewRoleKey('')
        setNewRoleName('')
        setNewRoleDescription('')
        await loadRoles()
      } catch (requestError) {
        setRoleNotice(`Nie udalo sie utworzyc roli: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setRoleCreateSaving(false)
      }
    })()
  }

  const submitUpdateRole = (roleItem: AdminRoleItem) => {
    const name = (roleNameDraftByKey[roleItem.key] || '').trim()
    const description = (roleDescDraftByKey[roleItem.key] || '').trim()
    if (!name) {
      setRoleNotice(`Podaj nazwe dla roli ${roleItem.key}.`)
      return
    }

    setSavingRoleMetaByKey((prev) => ({ ...prev, [roleItem.key]: true }))
    setRoleNotice('')
    void (async () => {
      try {
        await updateAdminRole(roleItem.key, {
          name,
          description: description || '',
        })
        setRoleNotice(`Rola ${roleItem.key} zostala zaktualizowana.`)
        await loadRoles()
      } catch (requestError) {
        setRoleNotice(`Nie udalo sie zaktualizowac roli: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingRoleMetaByKey((prev) => ({ ...prev, [roleItem.key]: false }))
      }
    })()
  }

  const submitDeleteRole = (roleItem: AdminRoleItem) => {
    if (roleItem.is_system) {
      setRoleNotice('Roli systemowej nie mozna usunac.')
      return
    }

    const confirmed = window.confirm(`Usunac role ${roleItem.key}?`)
    if (!confirmed) return

    setSavingRoleMetaByKey((prev) => ({ ...prev, [roleItem.key]: true }))
    setRoleNotice('')
    void (async () => {
      try {
        await deleteAdminRole(roleItem.key)
        setRoleNotice(`Rola ${roleItem.key} zostala usunieta.`)
        await loadRoles()
      } catch (requestError) {
        setRoleNotice(`Nie udalo sie usunac roli: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingRoleMetaByKey((prev) => ({ ...prev, [roleItem.key]: false }))
      }
    })()
  }

  if (!canManage) {
    return (
      <section className="card admin-page">
        <h1 style={{ marginTop: 0 }}>Role</h1>
        <p className="muted">Ten obszar jest dostepny tylko dla roli admin lub owner.</p>
      </section>
    )
  }

  return (
    <section className="card admin-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/neuronetix-logo.png" alt="Admin" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Role</h1>
        </div>
        <small className="muted">Tworzenie, edycja i usuwanie ról</small>
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <h2 style={{ marginTop: 0 }}>Nowa rola</h2>

        <form className="row" style={{ flexWrap: 'wrap', marginBottom: 10 }} onSubmit={submitCreateRole}>
          <input className="admin-field" value={newRoleKey} onChange={(event) => setNewRoleKey(event.target.value)} placeholder="Klucz roli (np. editor)" style={{ minWidth: 170 }} />
          <input className="admin-field" value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Nazwa roli" style={{ minWidth: 170 }} />
          <input className="admin-field" value={newRoleDescription} onChange={(event) => setNewRoleDescription(event.target.value)} placeholder="Opis (opcjonalnie)" style={{ minWidth: 240 }} />
          <button type="submit" className="btn btn-primary" disabled={roleCreateSaving}>{roleCreateSaving ? 'Tworzenie...' : 'Utworz role'}</button>
        </form>

        {roleNotice && <p className="muted" style={{ marginBottom: 0, color: '#bfdbfe' }}>{roleNotice}</p>}
      </div>

      <div className="card" style={{ marginTop: 12, marginBottom: 0 }}>
        <h2 style={{ marginTop: 0 }}>Lista ról</h2>

        {loading && <p className="muted">Ladowanie rol...</p>}
        {error && <p className="muted" style={{ color: '#fca5a5' }}>Blad: {error}</p>}

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Klucz</th>
                <th>Nazwa</th>
                <th>Opis</th>
                <th>Systemowa</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((roleItem) => {
                const isSaving = !!savingRoleMetaByKey[roleItem.key]
                return (
                  <tr key={roleItem.key}>
                    <td><strong>{roleItem.key}</strong></td>
                    <td>
                      <input
                        className="admin-field"
                        value={roleNameDraftByKey[roleItem.key] ?? roleItem.name}
                        onChange={(event) => setRoleNameDraftByKey((prev) => ({ ...prev, [roleItem.key]: event.target.value }))}
                        style={{ minWidth: 180 }}
                      />
                    </td>
                    <td>
                      <input
                        className="admin-field"
                        value={roleDescDraftByKey[roleItem.key] ?? (roleItem.description || '')}
                        onChange={(event) => setRoleDescDraftByKey((prev) => ({ ...prev, [roleItem.key]: event.target.value }))}
                        style={{ minWidth: 220 }}
                      />
                    </td>
                    <td>{roleItem.is_system ? 'Tak' : 'Nie'}</td>
                    <td>
                      <div className="row">
                        <button type="button" className="btn btn-ghost" disabled={isSaving} onClick={() => submitUpdateRole(roleItem)}>Zapisz</button>
                        <button type="button" className="btn btn-ghost" disabled={isSaving || roleItem.is_system} onClick={() => submitDeleteRole(roleItem)}>Usun</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
