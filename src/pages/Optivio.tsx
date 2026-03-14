import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { createTaskoraProject, createTaskoraTask, listTaskoraProjects } from '@/lib/taskoraApi'
import {
  createOptivioProject,
  createOptivioTask,
  linkOptivioProjectToTaskora,
  listOptivioProjects,
  OptivioProject,
  OptivioTask,
  OptivioTaskStatus,
  updateOptivioTaskoraSync,
  updateOptivioTaskStatus,
} from '@/api/client'

function getRequestErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string; error?: string }>(error)) {
    const apiMessage = error.response?.data?.message || error.response?.data?.error
    if (apiMessage) return apiMessage
    if (error.response?.status) return `HTTP ${error.response.status}`
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Brak odpowiedzi serwera'
}

function getStatusLabel(status: OptivioTaskStatus): string {
  if (status === 'ready') return 'Ready'
  if (status === 'progress') return 'W toku'
  if (status === 'review') return 'Review'
  return 'Done'
}


export default function Optivio() {
  const [projects, setProjects] = useState<OptivioProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectDueDate, setProjectDueDate] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskStatus, setTaskStatus] = useState<OptivioTaskStatus>('ready')
  const [databaseBindingByProject, setDatabaseBindingByProject] = useState<Record<number, string>>({})
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const items = await listOptivioProjects()
        if (!mounted) return
        setProjects(items)
        setActiveProjectId(items[0]?.id ?? null)

        // Jednorazowo po zaladowaniu podpinamy starsze projekty bez mapowania do Taskora.
        void reconcileTaskoraMapping(items)
      } catch (error) {
        if (!mounted) return
        setNotice(`Nie udalo sie pobrac projektow Optivio z API: ${getRequestErrorMessage(error)}`)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  const reconcileTaskoraMapping = async (items: OptivioProject[]) => {
    const missing = items.filter((project) => !project.taskora_project_id)
    if (!missing.length) return

    try {
      const existing = await listTaskoraProjects()
      const byTitle = new Map(existing.map((project) => [project.title.trim().toLowerCase(), project.id]))

      let fixedCount = 0
      for (const project of missing) {
        const key = project.name.trim().toLowerCase()
        const found = byTitle.get(key)
        const taskoraId = found || await createTaskoraProject(project.name, project.description || '')
        if (!found) byTitle.set(key, taskoraId)

        const linked = await linkOptivioProjectToTaskora(project.id, taskoraId)
        setProjects((prev) => prev.map((row) => (row.id === linked.id ? linked : row)))
        fixedCount += 1
      }

      if (fixedCount > 0) {
        setNotice(`Polaczono z Taskora: ${fixedCount} projekt(ow).`)
      }
    } catch (error) {
      setNotice(`Nie udalo sie automatycznie podpiac starszych projektow do Taskora: ${getRequestErrorMessage(error)}`)
    }
  }

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [projects, activeProjectId],
  )

  const totalTasks = useMemo(
    () => activeProject?.tasks.length || 0,
    [activeProject],
  )

  const syncedTasks = useMemo(
    () => activeProject?.tasks.filter((task) => task.taskora_sync.synced).length || 0,
    [activeProject],
  )

  const createProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = projectName.trim()
    if (!name) {
      setNotice('Podaj nazwe projektu.')
      return
    }

    void (async () => {
      try {
        const created = await createOptivioProject({
          name,
          description: projectDescription,
          dueDate: projectDueDate || null,
        })

        setProjects((prev) => [created, ...prev])
        setActiveProjectId(created.id)
        setProjectName('')
        setProjectDescription('')
        setProjectDueDate('')

        try {
          const taskoraProjectId = await createTaskoraProject(created.name, created.description || '')
          const linked = await linkOptivioProjectToTaskora(created.id, taskoraProjectId)
          setProjects((prev) => prev.map((project) => (project.id === linked.id ? linked : project)))
          setNotice(`Projekt #${name} zostal utworzony i polaczony z Taskora.`)
        } catch (taskoraError) {
          setNotice(`Projekt #${name} utworzony, ale bez mapowania Taskora: ${getRequestErrorMessage(taskoraError)}`)
        }
      } catch (error) {
        setNotice(`Nie udalo sie utworzyc projektu w API: ${getRequestErrorMessage(error)}`)
      }
    })()
  }

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeProjectId) {
      setNotice('Najpierw utworz projekt.')
      return
    }

    const title = taskTitle.trim()
    if (!title) {
      setNotice('Podaj tytul taska.')
      return
    }

    try {
      const created = await createOptivioTask(activeProjectId, {
        title,
        description: taskDescription,
        dueDate: taskDueDate || null,
        status: taskStatus,
      })

      setProjects((prev) => prev.map((project) => {
        if (project.id !== activeProjectId) return project
        return {
          ...project,
          tasks: [created, ...project.tasks],
        }
      }))
      setTaskTitle('')
      setTaskDescription('')
      setTaskDueDate('')
      setTaskStatus('ready')

      let taskoraProjectId = activeProject?.taskora_project_id ?? null
      if (!taskoraProjectId && activeProject) {
        try {
          const createdTaskoraProjectId = await createTaskoraProject(activeProject.name, activeProject.description || '')
          const linked = await linkOptivioProjectToTaskora(activeProject.id, createdTaskoraProjectId)
          taskoraProjectId = linked.taskora_project_id
          setProjects((prev) => prev.map((project) => (project.id === linked.id ? linked : project)))
        } catch (taskoraProjectError) {
          setNotice(`Task zapisany, ale nie udalo sie utworzyc projektu w Taskorze: ${getRequestErrorMessage(taskoraProjectError)}`)
        }
      }

      try {
        if (!taskoraProjectId) {
          throw new Error('Brak mapowania projektu Optivio do Taskora')
        }

        const taskoraTaskId = await createTaskoraTask({
          title: created.title,
          description: created.description || `Task utworzony z Optivio: ${created.title}`,
          status: created.status,
          projectId: taskoraProjectId,
        })
        const syncedTask = await updateOptivioTaskoraSync(activeProjectId, created.id, {
          synced: true,
          taskId: String(taskoraTaskId),
        })

        setProjects((prev) => prev.map((project) => {
          if (project.id !== activeProjectId) return project
          return {
            ...project,
            tasks: project.tasks.map((task) => (task.id === created.id ? syncedTask : task)),
          }
        }))
        setNotice('Task utworzony i wyslany do Taskory.')
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Brak odpowiedzi z Taskory'
        const erroredTask = await updateOptivioTaskoraSync(activeProjectId, created.id, {
          synced: false,
          error: reason,
        })

        setProjects((prev) => prev.map((project) => {
          if (project.id !== activeProjectId) return project
          return {
            ...project,
            tasks: project.tasks.map((task) => (task.id === created.id ? erroredTask : task)),
          }
        }))
        setNotice(`Task zapisany w Optivio, ale bez sync z Taskora: ${reason}`)
      }
    } catch (error) {
      setNotice(`Nie udalo sie zapisac taska w API Optivio: ${getRequestErrorMessage(error)}`)
    }
  }

  const changeStatus = (taskId: number, status: OptivioTaskStatus) => {
    if (!activeProjectId) return
    void (async () => {
      try {
        const updatedTask = await updateOptivioTaskStatus(activeProjectId, taskId, status)
        setProjects((prev) => prev.map((project) => {
          if (project.id !== activeProjectId) return project
          return {
            ...project,
            tasks: project.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
          }
        }))
      } catch (error) {
        setNotice(`Nie udalo sie zaktualizowac statusu taska: ${getRequestErrorMessage(error)}`)
      }
    })()
  }

  return (
    <div className="optivio-shell">
      <aside className="optivio-projects card">
        <div className="optivio-brand">
          <img src="/optivio-logo.png" alt="Optivio" />
          <div>
            <h1>Optivio</h1>
            <p className="muted">Panel projektow i workflow.</p>
          </div>
        </div>

        <form className="optivio-project-form" onSubmit={createProject}>
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Nazwa projektu"
          />
          <input
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder="Opis (opcjonalnie)"
          />
          <input
            type="date"
            value={projectDueDate}
            onChange={(event) => setProjectDueDate(event.target.value)}
          />
          <button type="submit" className="btn btn-primary">Utworz projekt</button>
        </form>

        <div className="optivio-project-list">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`optivio-project-pill ${project.id === activeProjectId ? 'active' : ''}`}
              onClick={() => setActiveProjectId(project.id)}
            >
              <span># {project.name}</span>
              <small>{project.tasks.length} taskow</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="optivio-workspace card">
        {!activeProject && (
          <div className="optivio-empty">
            <h2>Utworz pierwszy projekt</h2>
            <p className="muted">Po lewej dodaj projekt. Potem otworzy sie widok podobny do panelu Railway.</p>
          </div>
        )}

        {activeProject && (
          <>
            <header className="optivio-workspace-head">
              <div>
                <h2>{activeProject.name}</h2>
                <p className="muted">{activeProject.description || 'Projekt bez opisu'}</p>
              </div>
              <div className="optivio-metrics">
                <div>
                  <span>Taski</span>
                  <strong>{totalTasks}</strong>
                </div>
                <div>
                  <span>W Taskorze</span>
                  <strong>{syncedTasks}</strong>
                </div>
                <div>
                  <span>Deadline</span>
                  <strong>{activeProject.due_date || '-'}</strong>
                </div>
              </div>
            </header>

            <div className="optivio-flow-grid">
              <article className="optivio-flow-node">
                <small className="muted">Service</small>
                <strong>Optivio Project Runtime</strong>
                <small className="muted">Workflow + automatyzacje</small>
              </article>
              <div className="optivio-flow-arrow">{'->'}</div>
              <article className="optivio-flow-node">
                <small className="muted">Database Binding</small>
                <strong>{databaseBindingByProject[activeProject.id] || 'uzytkownicy'}</strong>
                <select
                  value={databaseBindingByProject[activeProject.id] || 'uzytkownicy'}
                  onChange={(event) => setDatabaseBindingByProject((prev) => ({
                    ...prev,
                    [activeProject.id]: event.target.value,
                  }))}
                >
                  <option value="uzytkownicy">uzytkownicy (logowanie)</option>
                  <option value="orbitum_friendships">orbitum_friendships</option>
                  <option value="orbitum_chat_messages">orbitum_chat_messages</option>
                  <option value="taskora_tasks">taskora_tasks</option>
                </select>
              </article>
              <div className="optivio-flow-arrow">{'->'}</div>
              <article className="optivio-flow-node">
                <small className="muted">Output</small>
                <strong>Taskora Sync + Orbitum Stats</strong>
                <small className="muted">taski, terminy, statusy</small>
              </article>
            </div>

            <form className="optivio-task-form" onSubmit={createTask}>
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Nowy task"
              />
              <input
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                placeholder="Opis taska"
              />
              <input
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
              />
              <select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value as OptivioTaskStatus)}>
                <option value="ready">Ready</option>
                <option value="progress">W toku</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
              <button type="submit" className="btn btn-primary">Dodaj task + sync do Taskory</button>
            </form>

            <div className="optivio-railway-canvas">
              {activeProject.tasks.length === 0 && (
                <div className="optivio-empty-rail">
                  Brak taskow. Dodaj pierwszy task, aby uruchomic przeplyw.
                </div>
              )}

              {activeProject.tasks.map((task) => (
                <article key={task.id} className="optivio-node">
                  <div className="optivio-node-head">
                    <h3>{task.title}</h3>
                    <span className={`sync-badge ${task.taskora_sync.synced ? 'ok' : 'warn'}`}>
                      {task.taskora_sync.synced ? 'Taskora OK' : 'Sync pending'}
                    </span>
                  </div>
                  <p className="muted">{task.description || 'Bez opisu'}</p>
                  <div className="optivio-node-foot">
                    <label>
                      Status
                      <select
                        value={task.status}
                        onChange={(event) => changeStatus(task.id, event.target.value as OptivioTaskStatus)}
                      >
                        <option value="ready">Ready</option>
                        <option value="progress">W toku</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    </label>
                    <div>
                      <span>{getStatusLabel(task.status)}</span>
                      <small className="muted">{task.due_date || 'brak terminu'}</small>
                    </div>
                  </div>
                  {!task.taskora_sync.synced && task.taskora_sync.error && (
                    <small className="optivio-sync-error">Taskora: {task.taskora_sync.error}</small>
                  )}
                </article>
              ))}
            </div>
          </>
        )}

        {notice && <p className="optivio-notice">{notice}</p>}
      </section>
    </div>
  )
}
