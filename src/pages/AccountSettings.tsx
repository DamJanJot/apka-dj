export default function AccountSettings() {
  return (
    <section className="card" style={{ padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>Ustawienia konta</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        To sa ustawienia profilu i konta (nie panelu bocznego).
      </p>

      <div
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          padding: 12,
        }}
      >
        <div className="small muted">Szybkie akcje</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <a className="friend-link-btn" href="/profile">Profil</a>
          <a className="friend-link-btn" href="/profile/edit">Edytuj profil</a>
        </div>
      </div>
    </section>
  )
}
