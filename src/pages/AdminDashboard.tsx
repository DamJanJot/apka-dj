import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  const adminPanels = user?.access?.panels?.admin || []
  const showUsers = adminPanels.length === 0 || adminPanels.includes('users')
  const showRoles = adminPanels.length === 0 || adminPanels.includes('roles')
  const showAssignments = adminPanels.length === 0 || adminPanels.includes('assignments')

  return (
    <section className="card admin-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/neuronetix-logo.png" alt="Admin" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Admin Panel</h1>
        </div>
        <small className="muted">Modul centralny dla zmian i podgladow administracyjnych</small>
      </div>

      <div className="admin-hub-grid">
        {showUsers && <article className="card" style={{ marginBottom: 0 }}>
          <h2 style={{ marginTop: 0 }}>Uzytkownicy</h2>
          <p className="muted">Tworzenie kont, wyszukiwanie i szybka zmiana roli.</p>
          <Link to="/admin/users" className="btn btn-primary">Przejdz do Uzytkownikow</Link>
        </article>}

        {showRoles && <article className="card" style={{ marginBottom: 0 }}>
          <h2 style={{ marginTop: 0 }}>Role</h2>
          <p className="muted">Tworzenie, edycja i usuwanie ról aplikacyjnych.</p>
          <Link to="/admin/roles" className="btn btn-primary">Przejdz do Rol</Link>
        </article>}

        {showAssignments && <article className="card" style={{ marginBottom: 0 }}>
          <h2 style={{ marginTop: 0 }}>Przypisania</h2>
          <p className="muted">Obszar pod przypisania rola-aplikacja i rola-panel + historia zmian.</p>
          <Link to="/admin/assignments" className="btn btn-primary">Przejdz do Przypisan</Link>
        </article>}
      </div>
    </section>
  )
}
