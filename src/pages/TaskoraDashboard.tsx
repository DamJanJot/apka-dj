import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TaskoraProject, listTaskoraProjects } from '@/lib/taskoraApi'

export default function TaskoraDashboard() {
  const [projects, setProjects] = useState<TaskoraProject[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        setProjects(await listTaskoraProjects())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Brak odpowiedzi API Taskory')
      }
    })()
  }, [])

  const stats = useMemo(() => {
    const totalTasks = projects.reduce((sum, p) => sum + (p.total_count || 0), 0)
    const totalDone = projects.reduce((sum, p) => sum + (p.done_count || 0), 0)
    const progress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0
    return { totalTasks, totalDone, progress }
  }, [projects])

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <h1 style={{ margin: 0 }}>Taskora Dashboard</h1>
          <p className="muted" style={{ marginTop: 6 }}>Lista projektow i statystyki. Szczegoly taskow sa w panelu projektowym.</p>
        </div>
        <Link className="btn btn-primary" to="/taskora/projects">Otworz panel projektow</Link>
      </div>

      {error && <p className="optivio-sync-error">Taskora: {error}</p>}

      <div className="orbitum-overview-metrics" style={{ marginTop: 12 }}>
        <div className="stat"><div className="label">Projekty</div><div className="value">{projects.length}</div></div>
        <div className="stat"><div className="label">Taski</div><div className="value">{stats.totalTasks}</div></div>
        <div className="stat"><div className="label">Done</div><div className="value">{stats.totalDone}</div></div>
        <div className="stat"><div className="label">Postep</div><div className="value">{stats.progress}%</div></div>
      </div>

      <div className="optivio-dashboard-list">
        {projects.map((project) => (
          <article key={project.id} className="optivio-dashboard-item">
            <div className="row-between">
              <strong>{project.title}</strong>
              <small className="muted">{project.progress_percent || 0}%</small>
            </div>
            <p className="muted">{project.description || 'Brak opisu'}</p>
            <div className="progress-track"><span style={{ width: `${project.progress_percent || 0}%` }} /></div>
            <small className="muted">{project.done_count || 0}/{project.total_count || 0} done</small>
          </article>
        ))}
      </div>
    </section>
  )
}
