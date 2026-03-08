type AppScopedModuleProps = {
  appLabel: string
  moduleLabel: string
}

export default function AppScopedModule({ appLabel, moduleLabel }: AppScopedModuleProps) {
  return (
    <section className="card" style={{ padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>{moduleLabel} - {appLabel}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Ten modul jest odseparowany od Orbitum. Tu beda tylko dane {appLabel}.
      </p>

      <div
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          padding: 12,
        }}
      >
        <strong>Status integracji</strong>
        <ul style={{ marginBottom: 0 }}>
          <li>Dedykowana trasa i osobny widok dla tej aplikacji.</li>
          <li>Docelowo osobne API i osobne relacje znajomych.</li>
          <li>Powiadomienia z innych aplikacji beda tylko sygnalizowane.</li>
        </ul>
      </div>
    </section>
  )
}
