import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  getTeacherQuizDetail,
  listTeacherNotifications,
  listTeacherQuizWhiteboardNotes,
  listTeacherQuizzes,
  listTeacherTasks,
  submitTeacherQuiz,
  TeacherNotificationItem,
  TeacherQuizListItem,
  TeacherTaskItem,
  TeacherTaskStatus,
  TeacherWhiteboardNote,
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

function formatTimestamp(value: string | null): string {
  if (!value) return 'Brak'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('pl-PL')
}

function taskStatusLabel(status: TeacherTaskStatus): string {
  if (status === 'todo') return 'Do zrobienia'
  if (status === 'in_progress') return 'W trakcie'
  if (status === 'done') return 'Zrobione'
  return 'Anulowane'
}

export default function StudentPanel() {
  const [tab, setTab] = useState<'overview' | 'tasks' | 'quizzes' | 'notifications'>('overview')
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [quizzes, setQuizzes] = useState<TeacherQuizListItem[]>([])
  const [notifications, setNotifications] = useState<TeacherNotificationItem[]>([])

  const [quizToSolveId, setQuizToSolveId] = useState('')
  const [quizQuestionsToSolve, setQuizQuestionsToSolve] = useState<Array<{
    id: number
    question_text: string
    question_type: 'text' | 'single_choice'
    options: string[]
  }>>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSolveNotice, setQuizSolveNotice] = useState('')
  const [quizWhiteboardNotes, setQuizWhiteboardNotes] = useState<TeacherWhiteboardNote[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = async () => {
    const [tasksResponse, quizzesResponse, notificationsResponse] = await Promise.all([
      listTeacherTasks(),
      listTeacherQuizzes(),
      listTeacherNotifications(),
    ])

    setTasks(tasksResponse.data || [])
    setQuizzes(quizzesResponse.data || [])
    setNotifications(notificationsResponse.data || [])
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')

    void (async () => {
      try {
        await loadAll()
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
  }, [])

  const summary = useMemo(() => {
    const done = tasks.filter((task) => task.status === 'done').length
    const overdue = tasks.filter((task) => {
      if (!task.due_date || task.status === 'done') return false
      const due = new Date(task.due_date)
      if (Number.isNaN(due.getTime())) return false
      return due.getTime() < Date.now()
    }).length
    const unread = notifications.filter((item) => !item.read_at).length
    const quizPending = quizzes.filter((quiz) => quiz.assignment_status !== 'submitted').length

    return {
      totalTasks: tasks.length,
      doneTasks: done,
      overdueTasks: overdue,
      unreadNotifications: unread,
      quizzesPending: quizPending,
    }
  }, [tasks, notifications, quizzes])

  const openQuizForSolve = (quizId: number) => {
    setQuizSolveNotice('')
    setQuizToSolveId(String(quizId))
    void (async () => {
      try {
        const detail = await getTeacherQuizDetail(quizId)
        setQuizQuestionsToSolve((detail.quiz?.questions || []).map((question) => ({
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.options || [],
        })))
        setQuizAnswers({})

        const notes = await listTeacherQuizWhiteboardNotes(quizId)
        setQuizWhiteboardNotes(notes.data || [])
      } catch (requestError) {
        setQuizSolveNotice(`Nie mozna pobrac quizu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const submitQuizSolve = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const quizId = Number(quizToSolveId)
    if (!Number.isInteger(quizId) || quizId <= 0) {
      setQuizSolveNotice('Wybierz quiz do rozwiazania.')
      return
    }

    void (async () => {
      try {
        const response = await submitTeacherQuiz(quizId, quizAnswers)
        setQuizSolveNotice(`Quiz wyslany. Wynik: ${response.score}/${response.max_score}.`)
        setQuizToSolveId('')
        setQuizQuestionsToSolve([])
        setQuizAnswers({})
        setQuizWhiteboardNotes([])
        await loadAll()
      } catch (requestError) {
        setQuizSolveNotice(`Nie mozna wyslac quizu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  return (
    <div className="card" style={{ padding: 20, display: 'grid', gap: 14 }}>
      <div>
        <h1 style={{ margin: 0 }}>Panel ucznia</h1>
        <p className="muted" style={{ marginTop: 8 }}>Twoje zadania, quizy i powiadomienia nauczyciela.</p>
      </div>

      {error && <p style={{ margin: 0, color: '#fca5a5' }}>{error}</p>}
      {loading && <p style={{ margin: 0 }} className="muted">Ladowanie danych...</p>}

      {!loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div className="card" style={{ margin: 0 }}><strong>Zadania</strong><div className="muted">{summary.totalTasks}</div></div>
            <div className="card" style={{ margin: 0 }}><strong>Zrobione</strong><div className="muted">{summary.doneTasks}</div></div>
            <div className="card" style={{ margin: 0 }}><strong>Po terminie</strong><div className="muted">{summary.overdueTasks}</div></div>
            <div className="card" style={{ margin: 0 }}><strong>Quizy do wyslania</strong><div className="muted">{summary.quizzesPending}</div></div>
            <div className="card" style={{ margin: 0 }}><strong>Nowe powiadomienia</strong><div className="muted">{summary.unreadNotifications}</div></div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={`btn ${tab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('overview')}>Podsumowanie</button>
            <button type="button" className={`btn ${tab === 'tasks' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('tasks')}>Zadania</button>
            <button type="button" className={`btn ${tab === 'quizzes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('quizzes')}>Quizy</button>
            <button type="button" className={`btn ${tab === 'notifications' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('notifications')}>Powiadomienia</button>
          </div>

          {tab === 'overview' && (
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginTop: 0 }}>Co jest najwazniejsze?</h2>
              <ul style={{ marginBottom: 0 }}>
                <li>Skoncz zadania oznaczone jako "Do zrobienia" lub "W trakcie".</li>
                <li>Sprawdz quizy z terminem i wyslij odpowiedzi przed deadlinem.</li>
                <li>Powiadomienia pomagaja szybko zobaczyc nowe zadania i terminy.</li>
              </ul>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginTop: 0 }}>Twoje zadania</h2>
              {tasks.length === 0 && <p className="muted" style={{ marginBottom: 0 }}>Brak przypisanych zadan.</p>}
              {tasks.length > 0 && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {tasks.map((task) => (
                    <article key={task.id} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12 }}>
                      <strong>{task.title}</strong>
                      {task.description && <p style={{ margin: '6px 0 0' }}>{task.description}</p>}
                      <p className="muted" style={{ margin: '8px 0 0' }}>
                        Status: {taskStatusLabel(task.status)} | Termin: {formatTimestamp(task.due_date)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'quizzes' && (
            <div className="card" style={{ margin: 0, display: 'grid', gap: 12 }}>
              <h2 style={{ margin: 0 }}>Twoje quizy</h2>
              {quizzes.length === 0 && <p className="muted" style={{ margin: 0 }}>Brak przypisanych quizow.</p>}
              {quizzes.length > 0 && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {quizzes.map((quiz) => (
                    <article key={quiz.id} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12 }}>
                      <strong>{quiz.title}</strong>
                      {quiz.description && <p style={{ margin: '6px 0 0' }}>{quiz.description}</p>}
                      <p className="muted" style={{ margin: '8px 0 0' }}>
                        Status: {quiz.assignment_status || 'assigned'} | Termin: {formatTimestamp(quiz.due_date)}
                      </p>
                      <button type="button" className="btn btn-ghost" onClick={() => openQuizForSolve(quiz.id)} style={{ marginTop: 8 }}>
                        Rozwiaz quiz
                      </button>
                    </article>
                  ))}
                </div>
              )}

              {quizToSolveId && (
                <form onSubmit={submitQuizSolve} style={{ display: 'grid', gap: 10, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12 }}>
                  <h3 style={{ margin: 0 }}>Rozwiazywanie quizu #{quizToSolveId}</h3>
                  {quizQuestionsToSolve.map((question) => (
                    <div key={question.id} style={{ display: 'grid', gap: 6 }}>
                      <label style={{ fontWeight: 600 }}>{question.question_text}</label>
                      {question.question_type === 'single_choice' ? (
                        <select
                          value={quizAnswers[String(question.id)] || ''}
                          onChange={(event) => setQuizAnswers((prev) => ({ ...prev, [String(question.id)]: event.target.value }))}
                        >
                          <option value="">Wybierz odpowiedz</option>
                          {question.options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <textarea
                          rows={2}
                          value={quizAnswers[String(question.id)] || ''}
                          onChange={(event) => setQuizAnswers((prev) => ({ ...prev, [String(question.id)]: event.target.value }))}
                        />
                      )}
                    </div>
                  ))}

                  {quizWhiteboardNotes.length > 0 && (
                    <div>
                      <h4 style={{ margin: '2px 0 8px' }}>Notatki do quizu</h4>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {quizWhiteboardNotes.map((note) => (
                          <article key={note.id} style={{ background: note.color || '#fff59d', color: '#111', borderRadius: 8, padding: 8 }}>
                            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Pytanie: {note.question_id || 'ogolne'}</div>
                            <div>{note.text || '(pusta notatka)'}</div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn-primary">Wyslij odpowiedzi</button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setQuizToSolveId('')
                        setQuizQuestionsToSolve([])
                        setQuizAnswers({})
                        setQuizWhiteboardNotes([])
                        setQuizSolveNotice('')
                      }}
                    >
                      Anuluj
                    </button>
                  </div>
                  {quizSolveNotice && <p className="muted" style={{ margin: 0 }}>{quizSolveNotice}</p>}
                </form>
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="card" style={{ margin: 0 }}>
              <h2 style={{ marginTop: 0 }}>Powiadomienia</h2>
              {notifications.length === 0 && <p className="muted" style={{ marginBottom: 0 }}>Brak powiadomien.</p>}
              {notifications.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {notifications.map((notification) => (
                    <article key={notification.id} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10 }}>
                      <strong>{notification.title}</strong>
                      {notification.message && <p style={{ margin: '6px 0 0' }}>{notification.message}</p>}
                      <p className="muted" style={{ margin: '8px 0 0' }}>
                        {notification.read_at ? 'Przeczytane' : 'Nowe'} | {formatTimestamp(notification.created_at)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
