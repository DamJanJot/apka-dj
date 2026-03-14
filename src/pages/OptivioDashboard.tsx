import { useEffect, useMemo, useState } from 'react'
import { linkOptivioProjectToTaskora, listOptivioProjects, OptivioProject } from '@/api/client'
import { createTaskoraProject, listTaskoraProjects } from '@/lib/taskoraApi'
import { Link } from 'react-router-dom'

export default function OptivioDashboard() {
  const [projects, setProjects] = useState<OptivioProject[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const rows = await listOptivioProjects()
        setProjects(rows)

        const missing = rows.filter((project) => !project.taskora_project_id)
        if (!missing.length) return

        const taskoraProjects = await listTaskoraProjects()
        const byTitle = new Map(taskoraProjects.map((project) => [project.title.trim().toLowerCase(), project.id]))

        for (const project of missing) {
          const key = project.name.trim().toLowerCase()
          const existingId = byTitle.get(key)
          const taskoraId = existingId || await createTaskoraProject(project.name, project.description || '')
          if (!existingId) byTitle.set(key, taskoraId)
          const linked = await linkOptivioProjectToTaskora(project.id, taskoraId)

          setProjects((prev) => prev.map((row) => (row.id === linked.id ? linked : row)))
        }
      } catch {
        setProjects([])
      }
    })()
  }, [])

  const stats = useMemo(() => {
    const totalTasks = projects.reduce((sum, project) => sum + project.tasks.length, 0)
    const done = projects.reduce((sum, project) => sum + project.tasks.filter((task) => task.status === 'done').length, 0)
    const syncPending = projects.reduce((sum, project) => sum + project.tasks.filter((task) => !task.taskora_sync.synced).length, 0)
    const progress = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0
    return { totalTasks, done, syncPending, progress }
  }, [projects])

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <h1 style={{ margin: 0 }}>Optivio Dashboard</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>Szybki przeglad projektow i postepu workflow.</p>
        </div>
        <Link className="btn btn-primary" to="/optivio/projects">Przejdz do panelu projektow</Link>
      </div>

      <div className="orbitum-overview-metrics" style={{ marginTop: 12 }}>
        <div className="stat"><div className="label">Projekty</div><div className="value">{projects.length}</div></div>
        <div className="stat"><div className="label">Taski</div><div className="value">{stats.totalTasks}</div></div>
        <div className="stat"><div className="label">Done</div><div className="value">{stats.done}</div></div>
        <div className="stat"><div className="label">Postep calosci</div><div className="value">{stats.progress}%</div></div>
        <div className="stat"><div className="label">Niezsynchronizowane</div><div className="value">{stats.syncPending}</div></div>
      </div>

      <div className="optivio-dashboard-list">
        {projects.map((project) => {
          const total = project.tasks.length
          const done = project.tasks.filter((task) => task.status === 'done').length
          const progress = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <article key={project.id} className="optivio-dashboard-item">
              <div className="row-between">
                <strong>{project.name}</strong>
                <small className="muted">{progress}%</small>
              </div>
              <p className="muted">{project.description || 'Brak opisu'}</p>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <small className="muted">{done}/{total} done • deadline: {project.due_date || '-'}</small>
            </article>
          )
        })}
      </div>
    </section>
  )
}
