import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router-dom'

export default function Neuronetix() {
  const { user } = useAuth()
  const role = (user?.rola || '').toLowerCase()
  const adminApps = user?.access?.apps || []
  const adminPanels = user?.access?.panels?.admin || []
  const canManageRoles = (role === 'admin' || role === 'owner')
    && (adminApps.length === 0 || adminApps.includes('admin'))
    && (adminPanels.length === 0 || adminPanels.includes('dashboard'))

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <img src="/neuronetix-logo.png" alt="NeuroNetix" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        <h1 style={{ margin: 0 }}>Neuronetix</h1>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        To jest startowy panel projektu edukacyjnego. Trzon aplikacji (topbar, sidebar, logowanie,
        powiadomienia) jest wspolny z Orbitum.
      </p>

      <div style={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        padding: 12,
        marginTop: 12,
      }}>
        <strong>Plan na kolejne etapy</strong>
        <ul style={{ marginBottom: 0 }}>
          <li>Dashboard edukacyjny z metrykami postepu</li>
          <li>Modul zaproszen i relacji opiekun-uczen</li>
          <li>Testy startowe i paszport uzytkownika</li>
          <li>Integracja z Taskora jako osobnym projektem w tym samym hubie</li>
        </ul>
      </div>

      {canManageRoles && (
        <div className="card" style={{ marginTop: 14, marginBottom: 0 }}>
          <h2 style={{ marginTop: 0 }}>Panel administracyjny</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Dla roli admin/owner przygotowalismy osobny obszar z narzedziami i logami.
          </p>
          <Link to="/admin/dashboard" className="btn btn-primary">
            Otworz Admin Panel
          </Link>
        </div>
      )}
    </div>
  )
}
