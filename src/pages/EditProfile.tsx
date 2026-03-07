import { useEffect, useMemo, useState } from 'react'

export default function EditProfile() {
  const [form, setForm] = useState({
    imie: '',
    email: '',
    zdjecie_profilowe: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const avatarUrl = useMemo(() => {
    if (!form.zdjecie_profilowe.trim()) return '/dj-api/public/uploads/default.png'
    if (form.zdjecie_profilowe.startsWith('http')) return form.zdjecie_profilowe
    return `http://localhost:8000/${form.zdjecie_profilowe.replace(/^\/+/, '')}`
  }, [form.zdjecie_profilowe])

  useEffect(() => {
    fetch('http://localhost:8000/api/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) =>
        setForm({
          imie: data.imie,
          email: data.email,
          zdjecie_profilowe: data.zdjecie_profilowe || '',
        })
      )
      .catch(() => setMessage('Nie udalo sie pobrac danych profilu.'))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (message) setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('http://localhost:8000/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        throw new Error('save_failed')
      }

      setMessage('Profil zostal zaktualizowany.')
    } catch {
      setMessage('Nie udalo sie zapisac zmian. Sprobuj ponownie.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card profile-edit-card">
      <h1 className="profile-edit-title">Edytuj profil</h1>

      <div className="profile-edit-layout">
        <div className="profile-edit-preview">
          <img src={avatarUrl} alt="Podglad avatara" className="profile-edit-avatar" />
          <div className="muted small">Podglad avatara</div>
        </div>

        <form onSubmit={handleSubmit} className="profile-edit-form">
          <label className="profile-edit-label" htmlFor="imie">Imie</label>
          <input
            id="imie"
            type="text"
            name="imie"
            value={form.imie}
            onChange={handleChange}
            placeholder="Twoje imie"
            className="profile-edit-input"
            required
          />

          <label className="profile-edit-label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="twoj@email.pl"
            className="profile-edit-input"
            required
          />

          <label className="profile-edit-label" htmlFor="zdjecie_profilowe">Sciezka lub URL avatara</label>
          <input
            id="zdjecie_profilowe"
            type="text"
            name="zdjecie_profilowe"
            value={form.zdjecie_profilowe}
            onChange={handleChange}
            placeholder="np. uploads/avatar.jpg lub https://..."
            className="profile-edit-input"
          />

          <button type="submit" className="profile-edit-submit" disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>

          {message && <div className="small muted">{message}</div>}
        </form>
      </div>
    </div>
  )
}
