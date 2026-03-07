import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  addBoardComment,
  BoardComment,
  BoardPost,
  createBoardPost,
  FriendUser,
  getBoardComments,
  getBoardFeed,
  getPostAudienceFriends,
  PostVisibility,
  setBoardReaction,
} from '@/api/client'

const DEFAULT_AVATAR = '/dj-api/public/uploads/default.png'
const REACTIONS = ['👍', '❤️', '🔥', '😂', '😮']

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

function renderRichText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/gi)

  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a key={`lnk-${idx}`} href={part} target="_blank" rel="noreferrer noopener" className="chat-link">
          {part}
        </a>
      )
    }

    const mentionParts = part.split(/(@[^\s@]+)/g)
    return mentionParts.map((chunk, mentionIdx) => {
      if (/^@[^\s@]+$/.test(chunk)) {
        return (
          <span key={`m-${idx}-${mentionIdx}`} className="chat-mention">
            {chunk}
          </span>
        )
      }

      return <span key={`t-${idx}-${mentionIdx}`}>{chunk}</span>
    })
  })
}

export default function Board() {
  const [feed, setFeed] = useState<BoardPost[]>([])
  const [friends, setFriends] = useState<FriendUser[]>([])

  const [visibility, setVisibility] = useState<PostVisibility>('public')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [selectedAudience, setSelectedAudience] = useState<number[]>([])

  const [openComments, setOpenComments] = useState<Record<number, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<number, BoardComment[]>>({})
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<number, string>>({})
  const [busyCommentPostId, setBusyCommentPostId] = useState<number | null>(null)
  const [busyReactionPostId, setBusyReactionPostId] = useState<number | null>(null)

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

  const toggleComments = async (postId: number) => {
    const isOpen = !!openComments[postId]
    setOpenComments((prev) => ({ ...prev, [postId]: !isOpen }))

    if (isOpen || commentsByPost[postId]) {
      return
    }

    try {
      const items = await getBoardComments(postId)
      setCommentsByPost((prev) => ({ ...prev, [postId]: items }))
    } catch {
      setMessage('Nie udalo sie pobrac komentarzy.')
    }
  }

  const onReaction = async (post: BoardPost, emoji: string) => {
    setBusyReactionPostId(Number(post.id))
    try {
      const next = post.my_reaction === emoji ? null : emoji
      await setBoardReaction(Number(post.id), next)
      await refreshFeed()
    } catch {
      setMessage('Nie udalo sie zapisac reakcji.')
    } finally {
      setBusyReactionPostId(null)
    }
  }

  const onCommentSubmit = async (postId: number) => {
    const text = (commentDraftByPost[postId] || '').trim()
    if (!text) return

    setBusyCommentPostId(postId)
    try {
      await addBoardComment(postId, text)
      const items = await getBoardComments(postId)
      setCommentsByPost((prev) => ({ ...prev, [postId]: items }))
      setCommentDraftByPost((prev) => ({ ...prev, [postId]: '' }))
      await refreshFeed()
    } catch {
      setMessage('Nie udalo sie dodac komentarza.')
    } finally {
      setBusyCommentPostId(null)
    }
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

                {!!post.body && <div className="board-post-body">{renderRichText(post.body)}</div>}

                {imageUrl && (
                  <a href={imageUrl} target="_blank" rel="noreferrer noopener" className="chat-image-link">
                    <img className="chat-image" src={imageUrl} alt="Zdjecie posta" />
                  </a>
                )}

                <div className="board-post-actions">
                  <div className="board-reactions-row">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={`${post.id}-${emoji}`}
                        type="button"
                        className={`board-reaction-btn ${post.my_reaction === emoji ? 'active' : ''}`}
                        disabled={busyReactionPostId === Number(post.id)}
                        onClick={() => onReaction(post, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                    <span className="small muted">Reakcje: {post.reactions_count || 0}</span>
                  </div>

                  <button
                    type="button"
                    className="friend-link-btn"
                    onClick={() => toggleComments(Number(post.id))}
                  >
                    Komentarze ({post.comments_count || 0})
                  </button>
                </div>

                {openComments[Number(post.id)] && (
                  <div className="board-comments-wrap">
                    <div className="board-comments-list">
                      {(commentsByPost[Number(post.id)] || []).map((comment) => (
                        <div key={comment.id} className="board-comment-item">
                          <img className="friend-avatar" src={assetUrl(comment.zdjecie_profilowe) || DEFAULT_AVATAR} alt="Avatar" />
                          <div className="board-comment-body">
                            <div className="board-comment-head">
                              <strong>{fullName(comment)}</strong>
                              <span className="small muted">{new Date(comment.created_at).toLocaleString('pl-PL')}</span>
                            </div>
                            <div className="board-post-body">{renderRichText(comment.body)}</div>
                          </div>
                        </div>
                      ))}

                      {(commentsByPost[Number(post.id)] || []).length === 0 && (
                        <div className="small muted">Brak komentarzy.</div>
                      )}
                    </div>

                    <div className="board-comment-compose">
                      <input
                        className="chat-compose-input"
                        value={commentDraftByPost[Number(post.id)] || ''}
                        onChange={(e) =>
                          setCommentDraftByPost((prev) => ({
                            ...prev,
                            [Number(post.id)]: e.target.value,
                          }))
                        }
                        placeholder="Napisz komentarz..."
                      />
                      <button
                        type="button"
                        className="friend-action-btn"
                        disabled={busyCommentPostId === Number(post.id)}
                        onClick={() => onCommentSubmit(Number(post.id))}
                      >
                        Dodaj
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
