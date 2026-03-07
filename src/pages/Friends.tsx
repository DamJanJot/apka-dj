import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  acceptFriendRequest,
  cancelOutgoingFriendRequest,
  FriendSearchItem,
  FriendUser,
  IncomingFriendRequest,
  listFriends,
  listIncomingFriendRequests,
  listOutgoingFriendRequests,
  OutgoingFriendRequest,
  rejectFriendRequest,
  searchUsersForFriendship,
  sendFriendRequest,
} from '@/api/client'

const DEFAULT_AVATAR = '/dj-api/public/uploads/default.png'

function fullName(user?: { imie?: string; nazwisko?: string; email?: string; id?: number }) {
  if (!user) return 'Uzytkownik'
  const value = `${user.imie || ''} ${user.nazwisko || ''}`.trim()
  return value || user.email || `Uzytkownik #${user.id || '?'}`
}

function avatarUrl(path?: string | null) {
  if (!path) return DEFAULT_AVATAR
  if (path.startsWith('http')) return path
  return `http://localhost:8000/${path.replace(/^\/+/, '')}`
}

export default function Friends() {
  const [query, setQuery] = useState('')
  const [searchItems, setSearchItems] = useState<FriendSearchItem[]>([])
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [incoming, setIncoming] = useState<IncomingFriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<OutgoingFriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSearch, setLoadingSearch] = useState(false)

  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const canSearch = useMemo(() => query.trim().length >= 2, [query])

  const refreshLists = async () => {
    const [friendsData, incomingData, outgoingData] = await Promise.all([
      listFriends(),
      listIncomingFriendRequests(),
      listOutgoingFriendRequests(),
    ])

    setFriends(friendsData)
    setIncoming(incomingData)
    setOutgoing(outgoingData)
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      try {
        const [friendsData, incomingData, outgoingData] = await Promise.all([
          listFriends(),
          listIncomingFriendRequests(),
          listOutgoingFriendRequests(),
        ])

        if (!mounted) return
        setFriends(friendsData)
        setIncoming(incomingData)
        setOutgoing(outgoingData)
      } catch {
        if (!mounted) return
        setMessage('Nie udalo sie pobrac listy znajomych.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!canSearch) {
        setSearchItems([])
        return
      }

      setLoadingSearch(true)
      try {
        const items = await searchUsersForFriendship(query.trim())
        if (!mounted) return
        setSearchItems(items)
      } catch {
        if (!mounted) return
        setSearchItems([])
      } finally {
        if (mounted) setLoadingSearch(false)
      }
    }

    const id = window.setTimeout(load, 250)
    return () => {
      mounted = false
      window.clearTimeout(id)
    }
  }, [canSearch, query])

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
  }

  const runAction = async (key: string, action: () => Promise<void>) => {
    setMessage(null)
    setBusyKey(key)

    try {
      await action()
      await refreshLists()
      if (canSearch) {
        const items = await searchUsersForFriendship(query.trim())
        setSearchItems(items)
      }
    } catch {
      setMessage('Operacja nie powiodla sie. Sprobuj ponownie.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="card friends-card">
      <h1 className="friends-title">Znajomi</h1>

      {message && <div className="small" style={{ color: '#fca5a5', marginBottom: 10 }}>{message}</div>}

      <div className="friends-layout">
        <section className="friends-panel">
          <h3 className="friends-section-title">Szukaj osob</h3>
          <form onSubmit={onSearchSubmit}>
            <input
              className="friends-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Wpisz min. 2 znaki (imie, nazwisko, e-mail)"
            />
          </form>

          {!canSearch && <div className="small muted">Podaj min. 2 znaki.</div>}
          {loadingSearch && <div className="small muted">Szukanie...</div>}
          {canSearch && !loadingSearch && searchItems.length === 0 && (
            <div className="small muted">Brak wynikow.</div>
          )}

          <div className="friends-list">
            {searchItems.map((item) => {
              const key = `search-${item.id}`
              const busy = busyKey === key

              return (
                <div key={item.id} className="friend-row">
                  <div className="friend-row-user">
                    <img className="friend-avatar" src={avatarUrl(item.zdjecie_profilowe)} alt="Avatar" />
                    <div className="friend-meta">
                      <strong>{fullName(item)}</strong>
                      <span className="small muted">{item.email || '-'}</span>
                    </div>
                  </div>

                  {item.friend_state === 'none' && (
                    <button
                      className="friend-action-btn"
                      disabled={busy}
                      onClick={() => runAction(key, () => sendFriendRequest(Number(item.id)))}
                    >
                      Zapros
                    </button>
                  )}

                  {item.friend_state === 'incoming' && <span className="friend-state-pill incoming">Zaprosil Cie</span>}
                  {item.friend_state === 'outgoing' && <span className="friend-state-pill outgoing">Oczekuje</span>}
                  {item.friend_state === 'friend' && (
                    <Link to={`/profile/${item.id}`} className="friend-link-btn">Profil</Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="friends-panel">
          <h3 className="friends-section-title">Zaproszenia do Ciebie</h3>

          {loading && <div className="small muted">Ladowanie...</div>}
          {!loading && incoming.length === 0 && <div className="small muted">Brak zaproszen.</div>}

          <div className="friends-list">
            {incoming.map((req) => {
              const acceptKey = `incoming-accept-${req.id}`
              const rejectKey = `incoming-reject-${req.id}`

              return (
                <div key={req.id} className="friend-row">
                  <div className="friend-row-user">
                    <img className="friend-avatar" src={avatarUrl(req.zdjecie_profilowe)} alt="Avatar" />
                    <div className="friend-meta">
                      <strong>{fullName(req)}</strong>
                      <span className="small muted">{req.email || '-'}</span>
                    </div>
                  </div>

                  <div className="friend-actions-inline">
                    <Link to={`/profile/${req.from_user_id}`} className="friend-link-btn">Profil</Link>
                    <button
                      className="friend-action-btn"
                      disabled={busyKey === acceptKey}
                      onClick={() => runAction(acceptKey, () => acceptFriendRequest(Number(req.id)))}
                    >
                      Akceptuj
                    </button>
                    <button
                      className="friend-action-btn ghost"
                      disabled={busyKey === rejectKey}
                      onClick={() => runAction(rejectKey, () => rejectFriendRequest(Number(req.id)))}
                    >
                      Odrzuc
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="friends-panel">
          <h3 className="friends-section-title">Twoje wyslane zaproszenia</h3>

          {loading && <div className="small muted">Ladowanie...</div>}
          {!loading && outgoing.length === 0 && <div className="small muted">Brak wyslanych zaproszen.</div>}

          <div className="friends-list">
            {outgoing.map((req) => {
              const cancelKey = `outgoing-cancel-${req.id}`
              return (
                <div key={req.id} className="friend-row">
                  <div className="friend-row-user">
                    <img className="friend-avatar" src={avatarUrl(req.zdjecie_profilowe)} alt="Avatar" />
                    <div className="friend-meta">
                      <strong>{fullName(req)}</strong>
                      <span className="small muted">{req.email || '-'}</span>
                    </div>
                  </div>

                  <button
                    className="friend-action-btn ghost"
                    disabled={busyKey === cancelKey}
                    onClick={() => runAction(cancelKey, () => cancelOutgoingFriendRequest(Number(req.id)))}
                  >
                    Cofnij
                  </button>
                  <Link to={`/profile/${req.to_user_id}`} className="friend-link-btn">Profil</Link>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <section className="friends-panel" style={{ marginTop: 12 }}>
        <h3 className="friends-section-title">Twoi znajomi ({friends.length})</h3>

        {loading && <div className="small muted">Ladowanie...</div>}
        {!loading && friends.length === 0 && <div className="small muted">Brak znajomych.</div>}

        <div className="friends-grid">
          {friends.map((f) => (
            <div key={f.id} className="friend-card-mini">
              <img className="friend-avatar" src={avatarUrl(f.zdjecie_profilowe)} alt="Avatar" />
              <div className="friend-meta">
                <strong>{fullName(f)}</strong>
                <span className="small muted">{f.email || '-'}</span>
              </div>
              <Link to={`/profile/${f.id}`} className="friend-link-btn">Profil</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
