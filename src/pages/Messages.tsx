import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChatMessage,
  ChatUser,
  getChatThread,
  listChatUsers,
  sendChatMessage,
  sendChatMessageWithImage,
} from '@/api/client'

const DEFAULT_AVATAR = '/dj-api/public/uploads/default.png'
const QUICK_EMOJIS = ['😀', '😂', '🙂', '😉', '😍', '😎', '🤝', '👍', '🔥', '🎉', '❤️', '🙏']

function formatUserName(user?: Pick<ChatUser, 'imie' | 'nazwisko' | 'email' | 'id'> | null) {
  if (!user) return 'Wybierz rozmowe'
  const full = `${user.imie || ''} ${user.nazwisko || ''}`.trim()
  return full || user.email || `Uzytkownik #${user.id}`
}

function resolveAssetUrl(path?: string | null) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `http://localhost:8000/${path.replace(/^\/+/, '')}`
}

function renderMessageBody(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/gi)

  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a key={`lnk-${index}`} href={part} target="_blank" rel="noreferrer noopener" className="chat-link">
          {part}
        </a>
      )
    }

    const mentionParts = part.split(/(@[^\s@]+)/g)
    return mentionParts.map((chunk, mentionIndex) => {
      if (/^@[^\s@]+$/.test(chunk)) {
        return (
          <span key={`m-${index}-${mentionIndex}`} className="chat-mention">
            {chunk}
          </span>
        )
      }

      return <span key={`t-${index}-${mentionIndex}`}>{chunk}</span>
    })
  })
}

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
  const [userQuery, setUserQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number>(selectedFromUrl)
  const [thread, setThread] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)

  const selectedUser = useMemo(
    () => users.find((u) => Number(u.id) === Number(selectedUserId)),
    [users, selectedUserId]
  )

  const normalizedQuery = userQuery.trim().toLowerCase()

  const visibleUsers = useMemo(() => {
    if (normalizedQuery.length >= 2) {
      return users.filter((u) => {
        const name = (u.imie || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        return name.includes(normalizedQuery) || email.includes(normalizedQuery)
      })
    }

    if (!selectedUser) return []
    return [selectedUser]
  }, [normalizedQuery, selectedUser, users])

  const selectedAvatarUrl = useMemo(() => {
    if (!selectedUser?.zdjecie_profilowe) return DEFAULT_AVATAR
    if (selectedUser.zdjecie_profilowe.startsWith('http')) return selectedUser.zdjecie_profilowe
    return `http://localhost:8000/${selectedUser.zdjecie_profilowe.replace(/^\/+/, '')}`
  }, [selectedUser])

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

    const load = (showLoader: boolean) => {
      if (showLoader) setLoadingThread(true)
      setThreadError(null)

      getChatThread(selectedUserId)
        .then((data) => {
          if (!mounted) return
          setThread(data)
        })
        .catch((err) => {
          if (!mounted) return

          const status = Number(err?.response?.status || 0)
          if (status === 403) {
            setThreadError('Rozmowa dostepna tylko dla znajomych.')
          } else {
            setThreadError('Nie udalo sie pobrac rozmowy.')
          }
        })
        .finally(() => {
          if (showLoader && mounted) {
            setLoadingThread(false)
          }
        })
    }

    setThread([])
    load(true)
    const id = window.setInterval(() => load(false), 5000)

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
    if ((!text && !selectedImage) || !selectedUserId) return

    try {
      const created = selectedImage
        ? await sendChatMessageWithImage(selectedUserId, text, selectedImage)
        : await sendChatMessage(selectedUserId, text)

      setThread((prev) => [...prev, created])
      setDraft('')
      setSelectedImage(null)
      setEmojiOpen(false)

      // cichy refresh po wyslaniu, bez migania loadera
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

          <input
            className="chat-user-search"
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Szukaj po imieniu lub e-mailu..."
          />

          {normalizedQuery.length < 2 && (
            <div className="small muted">Wpisz min. 2 znaki, aby wyszukac uzytkownika.</div>
          )}

          {loadingUsers && <div className="small muted">Ladowanie listy...</div>}

          {!loadingUsers && users.length === 0 && <div className="small muted">Brak innych uzytkownikow.</div>}
          {!loadingUsers && normalizedQuery.length >= 2 && visibleUsers.length === 0 && (
            <div className="small muted">Brak wynikow dla podanej frazy.</div>
          )}

          {visibleUsers.map((u) => {
            const avatarUrl = !u.zdjecie_profilowe
              ? DEFAULT_AVATAR
              : u.zdjecie_profilowe.startsWith('http')
                ? u.zdjecie_profilowe
                : `http://localhost:8000/${u.zdjecie_profilowe.replace(/^\/+/, '')}`

            return (
              <button
                key={u.id}
                className={`chat-user-btn ${Number(u.id) === Number(selectedUserId) ? 'active' : ''}`}
                onClick={() => selectUser(Number(u.id))}
                type="button"
              >
                <div className="chat-user-top">
                  <img className="chat-user-avatar" src={avatarUrl} alt="Avatar uzytkownika" />
                  <span className="chat-user-name">{formatUserName(u)}</span>
                </div>

                <div className="chat-user-main">
                  {u.is_online ? <span className="chat-online-dot" /> : <span className="chat-offline-dot" />}
                </div>
                <div className="small muted">
                  {u.is_online ? 'online' : `ostatnio: ${formatLastSeen(u.last_seen_at)}`}
                </div>
              </button>
            )
          })}
        </aside>

        <section className="chat-thread-wrap">
          <div className="chat-thread-header">
            {selectedUser ? (
              <div className="chat-thread-user">
                <img className="chat-thread-avatar" src={selectedAvatarUrl} alt="Avatar rozmowcy" />
                <div className="chat-thread-user-meta">
                  <strong>{formatUserName(selectedUser)}</strong>
                  <span className="small muted">{selectedUser.email || ''}</span>
                </div>
              </div>
            ) : (
              <strong>Wybierz rozmowe</strong>
            )}
          </div>

          <div className="chat-thread">
            {loadingThread && <div className="small muted">Ladowanie rozmowy...</div>}
            {!loadingThread && threadError && <div className="small" style={{ color: '#fca5a5' }}>{threadError}</div>}

            {!loadingThread && !threadError && thread.length === 0 && (
              <div className="small muted">Brak wiadomosci. Napisz pierwsza.</div>
            )}

            {thread.map((m) => {
              const mine = Number(m.to_user_id) === Number(selectedUserId)
              const imageUrl = resolveAssetUrl(m.image_path)

              return (
                <div key={m.id} className={`chat-bubble ${mine ? 'mine' : 'their'}`}>
                  {m.body && <div className="chat-body-text">{renderMessageBody(m.body)}</div>}
                  {imageUrl && (
                    <a href={imageUrl} target="_blank" rel="noreferrer noopener" className="chat-image-link">
                      <img className="chat-image" src={imageUrl} alt="Zalaczone zdjecie" />
                    </a>
                  )}
                  <div className="chat-bubble-time">{new Date(m.created_at).toLocaleTimeString('pl-PL')}</div>
                </div>
              )
            })}
          </div>

          <form className="chat-compose" onSubmit={onSubmit}>
            {selectedImage && (
              <div className="chat-image-pill">
                <span>{selectedImage.name}</span>
                <button type="button" className="chat-image-pill-remove" onClick={() => setSelectedImage(null)}>
                  Usun
                </button>
              </div>
            )}

            <input
              className="chat-compose-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Napisz wiadomosc..."
            />

            <div className="chat-emoji-wrap">
              <button
                type="button"
                className="chat-emoji-btn"
                onClick={() => setEmojiOpen((v) => !v)}
                aria-label="Wstaw emotke"
                title="Wstaw emotke"
              >
                😊
              </button>

              {emojiOpen && (
                <div className="chat-emoji-picker">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="chat-emoji-item"
                      onClick={() => {
                        setDraft((prev) => `${prev}${emoji}`)
                        setEmojiOpen(false)
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="chat-attach-btn" htmlFor="chat-image-input">
              Dodaj zdjecie
            </label>
            <input
              id="chat-image-input"
              className="chat-image-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setSelectedImage(file)
                e.currentTarget.value = ''
              }}
            />

            <button className="chat-compose-send" type="submit" disabled={!selectedUserId || (!draft.trim() && !selectedImage)}>
              Wyslij
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
