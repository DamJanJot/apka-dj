export default function Optivio() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <img src="/optivio-logo.png" alt="Optivio" style={{ width: 34, height: 34, objectFit: 'contain' }} />
        <h1 style={{ margin: 0 }}>Optivio</h1>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Optivio jest podlaczone do wspolnego ekosystemu Orbitum: to samo logowanie,
        znajomi, wiadomosci i powiadomienia.
      </p>

      <div
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          padding: 12,
          marginTop: 12,
        }}
      >
        <strong>Plan modułu</strong>
        <ul style={{ marginBottom: 0 }}>
          <li>Widoki produktu Optivio.</li>
          <li>Integracje workflow i automatyzacji.</li>
          <li>Raportowanie i panel KPI.</li>
        </ul>
      </div>
    </div>
  )
}
