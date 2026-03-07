import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BoardPost,
  createBoardPost,
  FriendUser,
  getBoardFeed,
  getPostAudienceFriends,
  PostVisibility,
} from '@/api/client'

const DEFAULT_AVATAR = '/dj-api/public/uploads/default.png'

function fullName(u?: { imie?: string | null; nazwisko?: string | null; email?: string | null }) {
  const value = `${u?.imie || ''} ${u?.nazwisko || ''}`.trim()
  return value || u?.email || 'Uzytkownik'
}

function assetUrl(path?: string | null) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `http://localhost:8000/${path.replace(/^\/+/, '')}`
}

function visibilityLabel(v: PostVisibility) {
  if (v === 'public') return 'Publiczny'
  if (v === 'friends') return 'Dla znajomych'
  return 'Dla wybranych'
}

export default function Board() {
  const [feed, setFeed] = useState<BoardPost[]>([])
  const [friends, setFriends] = useState<FriendUser[]>([])

  const [visibility, setVisibility] = useState<PostVisibility>('public')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [selectedAudience, setSelectedAudience] = useState<number[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    if (saving) return false
    if (!body.trim() && !image) return false
    if (visibility === 'selected' && selectedAudience.length === 0) return false
    return true
  }, [body, image, saving, selectedAudience, visibility])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      try {
        const [feedData, friendsData] = await Promise.all([getBoardFeed(), getPostAudienceFriends()])
        if (!mounted) return
        setFeed(feedData)
        setFriends(friendsData)
      } catch {
        if (!mounted) return
        setMessage('Nie udalo sie pobrac tablicy.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const refreshFeed = async () => {
    const data = await getBoardFeed()
    setFeed(data)
  }

  const toggleAudience = (id: number) => {
    setSelectedAudience((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setMessage(null)
    setSaving(true)

    try {
      await createBoardPost({
        visibility,
        body: body.trim(),
        image,
        selectedUserIds: visibility === 'selected' ? selectedAudience : [],
      })

      setBody('')
      setImage(null)
      setSelectedAudience([])
      await refreshFeed()
      setMessage('Post zostal opublikowany.')
    } catch {
      setMessage('Nie udalo sie opublikowac posta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card board-card">
      <h1 className="board-title">Tablica</h1>

      {message && <div className="small" style={{ color: '#7dd3fc', marginBottom: 10 }}>{message}</div>}

      <section className="board-compose">
        <h3 className="board-section-title">Dodaj post</h3>

        <form className="board-compose-form" onSubmit={onSubmit}>
          <textarea
            className="board-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Napisz co nowego..."
            rows={4}
          />

          <div className="board-compose-row">
            <label className="board-label">Widocznosc</label>
            <select
              className="board-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            >
              <option value="public">Publiczny</option>
              <option value="friends">Dla znajomych</option>
              <option value="selected">Dla wybranych znajomych</option>
            </select>
          </div>

          {visibility === 'selected' && (
            <div className="board-audience-wrap">
              <div className="small muted">Wybierz znajomych ({selectedAudience.length})</div>
              <div className="board-audience-grid">
                {friends.map((f) => (
                  <label key={f.id} className="board-audience-item">
                    <input
                      type="checkbox"
                      checked={selectedAudience.includes(Number(f.id))}
                      onChange={() => toggleAudience(Number(f.id))}
                    />
                    <span>{fullName(f)}</span>
                  </label>
                ))}
                {friends.length === 0 && <div className="small muted">Brak znajomych do wyboru.</div>}
              </div>
            </div>
          )}

          <div className="board-compose-row">
            <label className="chat-attach-btn" htmlFor="board-image-input">Dodaj zdjecie</label>
            <input
              id="board-image-input"
              className="chat-image-input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setImage(file)
                e.currentTarget.value = ''
              }}
            />
            {image && <span className="small muted">{image.name}</span>}
          </div>

          <button className="board-submit" type="submit" disabled={!canSubmit}>
            {saving ? 'Publikowanie...' : 'Opublikuj'}
          </button>
        </form>
      </section>

      <section className="board-feed">
        <h3 className="board-section-title">Aktualnosci</h3>

        {loading && <div className="small muted">Ladowanie tablicy...</div>}
        {!loading && feed.length === 0 && <div className="small muted">Brak postow do wyswietlenia.</div>}

        <div className="board-feed-list">
          {feed.map((post) => {
            const avatar = assetUrl(post.author_avatar) || DEFAULT_AVATAR
            const imageUrl = assetUrl(post.image_path)

            return (
              <article key={post.id} className="board-post-item">
                <div className="board-post-head">
                  <img className="friend-avatar" src={avatar} alt="Avatar autora" />
                  <div className="friend-meta">
                    <strong>
                      {fullName({
                        imie: post.author_imie,
                        nazwisko: post.author_nazwisko,
                        email: post.author_email,
                      })}
                    </strong>
                    <span className="small muted">
                      {new Date(post.created_at).toLocaleString('pl-PL')} • {visibilityLabel(post.visibility)}
                    </span>
                  </div>
                </div>

                {!!post.body && <div className="board-post-body">{post.body}</div>}

                {imageUrl && (
                  <a href={imageUrl} target="_blank" rel="noreferrer noopener" className="chat-image-link">
                    <img className="chat-image" src={imageUrl} alt="Zdjecie posta" />
                  </a>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
