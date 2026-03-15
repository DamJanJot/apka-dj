import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  deleteTeacherTaskWhiteboardNote,
  listTeacherTaskWhiteboardNotes,
  listTeacherTasks,
  saveTeacherTaskWhiteboardNote,
  TeacherTaskItem,
  TeacherTaskStatus,
  TeacherTaskWhiteboardNote,
  updateTeacherTaskStatus,
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

function statusLabel(status: TeacherTaskStatus): string {
  if (status === 'todo') return 'Do zrobienia'
  if (status === 'workflow') return 'Workflow'
  return 'Przeslany'
}

function formatDate(value: string | null): string {
  if (!value) return 'Brak terminu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pl-PL')
}

const STATUS_ORDER: TeacherTaskStatus[] = ['todo', 'workflow', 'submitted']

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [filter, setFilter] = useState<TeacherTaskStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [savingTaskId, setSavingTaskId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [activeWhiteboardTaskId, setActiveWhiteboardTaskId] = useState<number | null>(null)
  const [whiteboardNotes, setWhiteboardNotes] = useState<TeacherTaskWhiteboardNote[]>([])
  const [whiteboardText, setWhiteboardText] = useState('')
  const [whiteboardColor, setWhiteboardColor] = useState('#fff59d')

  const loadTasks = async () => {
    const response = await listTeacherTasks(filter === 'all' ? undefined : { status: filter })
    setTasks(response.data || [])
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)

    void (async () => {
      try {
        await loadTasks()
        if (!mounted) return
        setError('')
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [filter])

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks
    return tasks.filter((task) => task.status === filter)
  }, [tasks, filter])

  const setTaskStatus = (task: TeacherTaskItem, status: TeacherTaskStatus) => {
    setSavingTaskId(task.id)
    setNotice('')

    void (async () => {
      try {
        await updateTeacherTaskStatus(task.id, status)
        await loadTasks()
        setNotice('Status zadania zostal zapisany.')
      } catch (requestError) {
        setNotice(`Nie udalo sie zapisac statusu: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingTaskId(null)
      }
    })()
  }

  const openTaskWhiteboard = (taskId: number) => {
    setActiveWhiteboardTaskId(taskId)
    setWhiteboardText('')
    void (async () => {
      try {
        const response = await listTeacherTaskWhiteboardNotes(taskId)
        setWhiteboardNotes(response.data || [])
      } catch (requestError) {
        setNotice(`Nie mozna pobrac tablicy: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const saveWhiteboard = () => {
    if (!activeWhiteboardTaskId) return

    void (async () => {
      try {
        await saveTeacherTaskWhiteboardNote(activeWhiteboardTaskId, {
          text: whiteboardText,
          color: whiteboardColor,
        })
        const response = await listTeacherTaskWhiteboardNotes(activeWhiteboardTaskId)
        setWhiteboardNotes(response.data || [])
        setWhiteboardText('')
      } catch (requestError) {
        setNotice(`Nie mozna zapisac notatki: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const removeWhiteboardNote = (noteId: number) => {
    if (!activeWhiteboardTaskId) return

    void (async () => {
      try {
        await deleteTeacherTaskWhiteboardNote(activeWhiteboardTaskId, noteId)
        const response = await listTeacherTaskWhiteboardNotes(activeWhiteboardTaskId)
        setWhiteboardNotes(response.data || [])
      } catch (requestError) {
        setNotice(`Nie mozna usunac notatki: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  return (
    <section className="card student-task-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Zadania ucznia</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>Pracuj w prostym flow: do zrobienia {'>'} workflow {'>'} przeslany.</p>
        </div>
      </div>

      <div className="student-status-filter-row">
        <button type="button" className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>Wszystkie</button>
        <button type="button" className={`btn ${filter === 'todo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('todo')}>Do zrobienia</button>
        <button type="button" className={`btn ${filter === 'workflow' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('workflow')}>Workflow</button>
        <button type="button" className={`btn ${filter === 'submitted' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('submitted')}>Przeslane</button>
      </div>

      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
      {notice && <p className="muted">{notice}</p>}
      {loading && <p className="muted">Ladowanie...</p>}

      {!loading && filtered.length === 0 && <p className="muted">Brak zadan dla wybranego filtra.</p>}

      <div className="student-task-list">
        {filtered.map((task) => (
          <article key={task.id} className="student-task-card">
            <div className="row-between" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div>
                <h2>{task.title}</h2>
                {task.description && <p>{task.description}</p>}
                <div className="muted small">Termin: {formatDate(task.due_date)}</div>
              </div>
              {task.has_whiteboard && <span className="assignment-chip active" style={{ cursor: 'default' }}>Tablica</span>}
            </div>

            <div className="student-task-status-row">
              {STATUS_ORDER.map((status) => (
                <button
                  key={`${task.id}-${status}`}
                  type="button"
                  className={`student-status-btn ${task.status === status ? 'active' : ''}`}
                  disabled={savingTaskId === task.id}
                  onClick={() => setTaskStatus(task, status)}
                >
                  {statusLabel(status)}
                </button>
              ))}
            </div>

            {task.has_whiteboard && (
              <div className="student-task-whiteboard-toggle">
                <button type="button" className="btn btn-ghost" onClick={() => openTaskWhiteboard(task.id)}>
                  Otworz tablice zadania
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {activeWhiteboardTaskId && (
        <section className="student-whiteboard-box">
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Tablica zadania #{activeWhiteboardTaskId}</h3>
            <button type="button" className="btn btn-ghost" onClick={() => setActiveWhiteboardTaskId(null)}>Zamknij</button>
          </div>

          <div className="student-whiteboard-editor">
            <textarea
              rows={3}
              value={whiteboardText}
              onChange={(event) => setWhiteboardText(event.target.value)}
              placeholder="Wpisz notatke do zadania..."
            />
            <input type="color" value={whiteboardColor} onChange={(event) => setWhiteboardColor(event.target.value)} />
            <button type="button" className="btn btn-primary" onClick={saveWhiteboard}>Dodaj notatke</button>
          </div>

          <div className="student-whiteboard-notes">
            {whiteboardNotes.length === 0 && <p className="muted">Brak notatek.</p>}
            {whiteboardNotes.map((note) => (
              <article key={note.id} className="student-note" style={{ background: note.color || '#fff59d' }}>
                <div>{note.text || '(pusta notatka)'}</div>
                <button type="button" className="btn btn-ghost" onClick={() => removeWhiteboardNote(note.id)}>Usun</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
