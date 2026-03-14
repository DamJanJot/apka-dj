import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createTaskoraProject, createTaskoraTask, listTaskoraProjects, listTaskoraTasks, TaskoraProject, TaskoraTask } from '@/lib/taskoraApi'

export default function TaskoraProjects() {
  const [projects, setProjects] = useState<TaskoraProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<TaskoraTask[]>([])
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [notice, setNotice] = useState('')

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  )

  const loadProjects = async () => {
    const rows = await listTaskoraProjects()
    setProjects(rows)
    if (selectedProjectId && rows.some((row) => row.id === selectedProjectId)) return
    setSelectedProjectId(rows[0]?.id || null)
  }

  const loadTasks = async (projectId: number) => {
    setTasks(await listTaskoraTasks(projectId))
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadProjects()
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Brak odpowiedzi API Taskory')
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([])
      return
    }

    void (async () => {
      try {
        await loadTasks(selectedProjectId)
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Nie udalo sie pobrac taskow')
      }
    })()
  }, [selectedProjectId])

  const handleCreateProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = projectTitle.trim()
    if (!title) return

    void (async () => {
      try {
        const projectId = await createTaskoraProject(title, projectDescription)
        setProjectTitle('')
        setProjectDescription('')
        await loadProjects()
        setSelectedProjectId(projectId)
        setNotice('Projekt utworzony w Taskorze.')
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Nie udalo sie utworzyc projektu')
      }
    })()
  }

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedProjectId || !taskTitle.trim()) return

    void (async () => {
      try {
        await createTaskoraTask({
          title: taskTitle.trim(),
          description: taskDescription,
          projectId: selectedProjectId,
          status: 'ready',
        })
        setTaskTitle('')
        setTaskDescription('')
        await loadTasks(selectedProjectId)
        await loadProjects()
        setNotice('Task utworzony.')
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Nie udalo sie utworzyc taska')
      }
    })()
  }

  return (
    <section className="card">
      <div className="row-between">
        <h1 style={{ margin: 0 }}>Taskora Projekty</h1>
        {selectedProject && (
          <button type="button" className="btn btn-ghost" onClick={() => setSelectedProjectId(null)}>
            Powrot do listy
          </button>
        )}
      </div>

      {notice && <p className="muted">{notice}</p>}

      <div className="taskora-shell-grid">
        <aside className="taskora-projects-panel">
          <form className="optivio-project-form" onSubmit={handleCreateProject}>
            <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Nowy projekt" />
            <input value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Opis projektu" />
            <button type="submit" className="btn btn-primary">Dodaj projekt</button>
          </form>

          <div className="optivio-project-list" style={{ marginTop: 10 }}>
            {projects.map((project) => (
              <button key={project.id} type="button" className={`optivio-project-pill ${project.id === selectedProjectId ? 'active' : ''}`} onClick={() => setSelectedProjectId(project.id)}>
                <span>{project.title}</span>
                <small>{project.total_count || 0} taskow</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="taskora-tasks-panel">
          {!selectedProject && <div className="optivio-empty">Wybierz projekt z listy po lewej.</div>}
          {selectedProject && (
            <>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedProject.title}</h2>
                  <small className="muted">{selectedProject.description || 'Brak opisu'}</small>
                </div>
              </div>

              <form className="optivio-task-form" onSubmit={handleCreateTask}>
                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Nowy task" />
                <input value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Opis taska" />
                <button type="submit" className="btn btn-primary">Dodaj task</button>
              </form>

              <div className="taskora-task-columns">
                {['ready', 'progress', 'review', 'done'].map((status) => (
                  <article key={status} className="taskora-task-column">
                    <h3>{status === 'ready' ? 'To do' : status === 'progress' ? 'In progress' : status === 'review' ? 'Review' : 'Done'}</h3>
                    <div className="taskora-task-list">
                      {tasks.filter((task) => task.status === status).map((task) => (
                        <div key={task.id} className="taskora-task-card">
                          <strong>{task.title}</strong>
                          <small className="muted">{task.description || 'Bez opisu'}</small>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
