import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChatMessage,
  ChatUser,
  getChatThread,
  listChatUsers,
  sendChatMessage,
} from '@/api/client'

function formatLastSeen(value?: string | null) {
  if (!value) return 'brak danych'
  const date = new Date(value)
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedFromUrl = Number(searchParams.get('user') || 0)

  const [users, setUsers] = useState<ChatUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number>(selectedFromUrl)
  const [thread, setThread] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)

  const selectedUser = useMemo(
    () => users.find((u) => Number(u.id) === Number(selectedUserId)),
    [users, selectedUserId]
  )

  useEffect(() => {
    let mounted = true
    setLoadingUsers(true)

    listChatUsers()
      .then((data) => {
        if (!mounted) return
        setUsers(data)

        if (selectedFromUrl && data.some((u) => Number(u.id) === selectedFromUrl)) {
          setSelectedUserId(selectedFromUrl)
          return
        }

        if (!selectedFromUrl && data.length > 0) {
          const first = Number(data[0].id)
          setSelectedUserId(first)
          setSearchParams({ user: String(first) })
        }
      })
      .finally(() => mounted && setLoadingUsers(false))

    return () => {
      mounted = false
    }
  }, [selectedFromUrl, setSearchParams])

  useEffect(() => {
    if (!selectedUserId) return

    let mounted = true

    const load = () => {
      setLoadingThread(true)
      getChatThread(selectedUserId)
        .then((data) => {
          if (!mounted) return
          setThread(data)
        })
        .finally(() => mounted && setLoadingThread(false))
    }

    load()
    const id = window.setInterval(load, 5000)

    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [selectedUserId])

  const selectUser = (userId: number) => {
    setSelectedUserId(userId)
    setSearchParams({ user: String(userId) })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !selectedUserId) return

    try {
      await sendChatMessage(selectedUserId, text)
      setDraft('')
      const updated = await getChatThread(selectedUserId)
      setThread(updated)
    } catch {
      // noop
    }
  }

  return (
    <div className="card chat-card">
      <h1 className="chat-title">Wiadomosci</h1>

      <div className="chat-layout">
        <aside className="chat-users">
          <h3 className="chat-section-title">Uzytkownicy</h3>

          {loadingUsers && <div className="small muted">Ladowanie listy...</div>}

          {!loadingUsers && users.length === 0 && <div className="small muted">Brak innych uzytkownikow.</div>}

          {users.map((u) => (
            <button
              key={u.id}
              className={`chat-user-btn ${Number(u.id) === Number(selectedUserId) ? 'active' : ''}`}
              onClick={() => selectUser(Number(u.id))}
              type="button"
            >
              <div className="chat-user-main">
                <span>{u.imie || u.email || `Uzytkownik #${u.id}`}</span>
                {u.is_online ? <span className="chat-online-dot" /> : <span className="chat-offline-dot" />}
              </div>
              <div className="small muted">
                {u.is_online ? 'online' : `ostatnio: ${formatLastSeen(u.last_seen_at)}`}
              </div>
            </button>
          ))}
        </aside>

        <section className="chat-thread-wrap">
          <div className="chat-thread-header">
            <strong>{selectedUser ? selectedUser.imie || selectedUser.email : 'Wybierz rozmowe'}</strong>
          </div>

          <div className="chat-thread">
            {loadingThread && <div className="small muted">Ladowanie rozmowy...</div>}

            {!loadingThread && thread.length === 0 && (
              <div className="small muted">Brak wiadomosci. Napisz pierwsza.</div>
            )}

            {thread.map((m) => {
              const mine = Number(m.to_user_id) === Number(selectedUserId)
              return (
                <div key={m.id} className={`chat-bubble ${mine ? 'mine' : 'their'}`}>
                  <div>{m.body}</div>
                  <div className="chat-bubble-time">{new Date(m.created_at).toLocaleTimeString('pl-PL')}</div>
                </div>
              )
            })}
          </div>

          <form className="chat-compose" onSubmit={onSubmit}>
            <input
              className="chat-compose-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Napisz wiadomosc..."
            />
            <button className="chat-compose-send" type="submit" disabled={!selectedUserId || !draft.trim()}>
              Wyslij
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
