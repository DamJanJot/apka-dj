import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  createTeacherQuiz,
  createTeacherTask,
  deleteTeacherQuiz,
  deleteTeacherTask,
  deleteTeacherQuizWhiteboardNote,
  getTeacherOverview,
  getTeacherQuizDetail,
  listTeacherNotifications,
  listTeacherQuizzes,
  listTeacherQuizWhiteboardNotes,
  listTeacherTasks,
  markTeacherNotificationRead,
  markTeacherNotificationsReadAll,
  saveTeacherQuizWhiteboardNote,
  submitTeacherQuiz,
  TeacherNotificationItem,
  TeacherOverviewStudent,
  TeacherQuizListItem,
  TeacherTaskItem,
  TeacherTaskStatus,
  TeacherWhiteboardNote,
  updateTeacherTaskStatus,
} from '@/api/client'
import { useAuth } from '@/context/AuthContext'

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

function formatTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('pl-PL')
}

function displayStudentName(item: TeacherOverviewStudent): string {
  return item.student.imie || item.student.nick || item.student.email || `#${item.student.id}`
}

export default function TeacherPanel() {
  const { user } = useAuth()
  const role = (user?.rola || '').toLowerCase()

  const [tab, setTab] = useState<'overview' | 'tasks' | 'notifications' | 'quizzes'>('overview')
  const [items, setItems] = useState<TeacherOverviewStudent[]>([])
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [notifications, setNotifications] = useState<TeacherNotificationItem[]>([])
  const [quizzes, setQuizzes] = useState<TeacherQuizListItem[]>([])
  const [whiteboardNotes, setWhiteboardNotes] = useState<TeacherWhiteboardNote[]>([])
  const [whiteboardQuizId, setWhiteboardQuizId] = useState('')
  const [whiteboardQuestionId, setWhiteboardQuestionId] = useState('')
  const [whiteboardText, setWhiteboardText] = useState('')
  const [whiteboardColor, setWhiteboardColor] = useState('#fff59d')
  const [whiteboardPosX, setWhiteboardPosX] = useState('80')
  const [whiteboardPosY, setWhiteboardPosY] = useState('80')

  const [taskStatusFilter, setTaskStatusFilter] = useState<TeacherTaskStatus | ''>('')
  const [taskStudentId, setTaskStudentId] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskHasWhiteboard, setTaskHasWhiteboard] = useState(false)
  const [taskDraftById, setTaskDraftById] = useState<Record<number, TeacherTaskStatus>>({})

  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [quizDueDate, setQuizDueDate] = useState('')
  const [quizStudentIds, setQuizStudentIds] = useState<number[]>([])
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    question_text: string
    question_type: 'text' | 'single_choice' | 'open_with_whiteboard'
    options: string
    correct_answer: string
    points: number
  }>>([{ question_text: '', question_type: 'text', options: '', correct_answer: '', points: 1 }])
  const [quizToSolveId, setQuizToSolveId] = useState('')
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizQuestionsToSolve, setQuizQuestionsToSolve] = useState<Array<{ id: number; question_text: string; question_type: 'text' | 'single_choice' | 'open_with_whiteboard'; options: string[] }>>([])

  const [loading, setLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [quizzesLoading, setQuizzesLoading] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [savingWhiteboard, setSavingWhiteboard] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [stats, setStats] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    setWarning('')

    void (async () => {
      try {
        const response = await getTeacherOverview()
        if (!mounted) return

        setItems(response.students || [])
        setStats(response.meta?.by_type || {})
        setWarning(response.warning || '')
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
        setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const loadTasks = async () => {
    const response = await listTeacherTasks({
      status: taskStatusFilter || undefined,
      studentUserId: taskStudentId ? Number(taskStudentId) : undefined,
    })
    setTasks(response.data || [])
    setTaskDraftById((prev) => {
      const next = { ...prev }
      for (const t of response.data || []) {
        if (!next[t.id]) next[t.id] = t.status
      }
      return next
    })
  }

  useEffect(() => {
    let mounted = true
    setTasksLoading(true)

    void (async () => {
      try {
        const response = await listTeacherTasks({
          status: taskStatusFilter || undefined,
          studentUserId: taskStudentId ? Number(taskStudentId) : undefined,
        })
        if (!mounted) return
        setTasks(response.data || [])
        setTaskDraftById((prev) => {
          const next = { ...prev }
          for (const t of response.data || []) {
            if (!next[t.id]) next[t.id] = t.status
          }
          return next
        })
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
      } finally {
        if (mounted) setTasksLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [taskStatusFilter, taskStudentId])

  useEffect(() => {
    let mounted = true
    setNotificationsLoading(true)
    void (async () => {
      try {
        const response = await listTeacherNotifications()
        if (!mounted) return
        setNotifications(response.data || [])
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
      } finally {
        if (mounted) setNotificationsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setQuizzesLoading(true)
    void (async () => {
      try {
        const response = await listTeacherQuizzes()
        if (!mounted) return
        setQuizzes(response.data || [])
      } catch (requestError) {
        if (!mounted) return
        setError(getRequestErrorMessage(requestError))
      } finally {
        if (mounted) setQuizzesLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const assignedTo = Number(taskStudentId)
    if (!Number.isInteger(assignedTo) || assignedTo <= 0) {
      setNotice('Wybierz ucznia do przypisania zadania.')
      return
    }
    if (!taskTitle.trim()) {
      setNotice('Podaj tytul zadania.')
      return
    }

    setSavingTask(true)
    setNotice('')
    void (async () => {
      try {
        await createTeacherTask({
          assigned_to_user_id: assignedTo,
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          due_date: taskDueDate || null,
          status: 'todo',
          has_whiteboard: taskHasWhiteboard,
        })
        setTaskTitle('')
        setTaskDescription('')
        setTaskDueDate('')
        setTaskHasWhiteboard(false)
        await loadTasks()
        setNotice('Zadanie zostalo utworzone i wyslano powiadomienie do ucznia.')
      } catch (requestError) {
        setNotice(`Nie udalo sie utworzyc zadania: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingTask(false)
      }
    })()
  }

  const changeTaskStatus = (task: TeacherTaskItem) => {
    const next = taskDraftById[task.id] || task.status
    void (async () => {
      try {
        await updateTeacherTaskStatus(task.id, next)
        await loadTasks()
        setNotice('Status zadania zostal zaktualizowany.')
      } catch (requestError) {
        setNotice(`Nie udalo sie zaktualizowac statusu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const removeTask = (task: TeacherTaskItem) => {
    const confirmed = window.confirm(`Usunac zadanie ${task.title}?`)
    if (!confirmed) return

    void (async () => {
      try {
        await deleteTeacherTask(task.id)
        await loadTasks()
        setNotice('Zadanie zostalo usuniete.')
      } catch (requestError) {
        setNotice(`Nie udalo sie usunac zadania: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const markOneNotificationRead = (notificationId: number) => {
    void (async () => {
      try {
        await markTeacherNotificationRead(notificationId)
        const response = await listTeacherNotifications()
        setNotifications(response.data || [])
      } catch (requestError) {
        setNotice(`Nie udalo sie oznaczyc powiadomienia: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const markAllNotificationsRead = () => {
    void (async () => {
      try {
        await markTeacherNotificationsReadAll()
        const response = await listTeacherNotifications()
        setNotifications(response.data || [])
      } catch (requestError) {
        setNotice(`Nie udalo sie oznaczyc powiadomien: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const toggleQuizStudent = (studentId: number) => {
    setQuizStudentIds((prev) => prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId])
  }

  const addQuizQuestion = () => {
    setQuizQuestions((prev) => [...prev, { question_text: '', question_type: 'text', options: '', correct_answer: '', points: 1 }])
  }

  const submitQuizCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!quizTitle.trim()) {
      setNotice('Podaj tytul quizu.')
      return
    }
    if (quizQuestions.some((q) => !q.question_text.trim())) {
      setNotice('Kazde pytanie musi miec tresc.')
      return
    }

    const payloadQuestions = quizQuestions.map((question) => ({
      question_text: question.question_text.trim(),
      question_type: question.question_type,
      options: question.question_type === 'single_choice'
        ? question.options.split('\n').map((line) => line.trim()).filter(Boolean)
        : undefined,
      correct_answer: question.correct_answer.trim() || undefined,
      points: Math.max(1, question.points || 1),
    }))

    setSavingQuiz(true)
    setNotice('')
    void (async () => {
      try {
        await createTeacherQuiz({
          title: quizTitle.trim(),
          description: quizDescription.trim() || undefined,
          due_date: quizDueDate || null,
          student_user_ids: quizStudentIds,
          questions: payloadQuestions,
        })
        setQuizTitle('')
        setQuizDescription('')
        setQuizDueDate('')
        setQuizStudentIds([])
        setQuizQuestions([{ question_text: '', question_type: 'text', options: '', correct_answer: '', points: 1 }])

        const response = await listTeacherQuizzes()
        setQuizzes(response.data || [])
        setNotice('Quiz zostal utworzony i przypisany uczniom.')
      } catch (requestError) {
        setNotice(`Nie udalo sie utworzyc quizu: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingQuiz(false)
      }
    })()
  }

  const removeQuiz = (quiz: TeacherQuizListItem) => {
    const confirmed = window.confirm(`Usunac quiz ${quiz.title}?`)
    if (!confirmed) return

    void (async () => {
      try {
        await deleteTeacherQuiz(quiz.id)
        const response = await listTeacherQuizzes()
        setQuizzes(response.data || [])
        setNotice('Quiz zostal usuniety.')
      } catch (requestError) {
        setNotice(`Nie udalo sie usunac quizu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const loadQuizForSolve = () => {
    const quizId = Number(quizToSolveId)
    if (!Number.isInteger(quizId) || quizId <= 0) {
      setNotice('Wybierz quiz do rozwiazania.')
      return
    }

    void (async () => {
      try {
        const response = await getTeacherQuizDetail(quizId)
        setQuizQuestionsToSolve(response.quiz.questions.map((question) => ({
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.options,
        })))
        setQuizAnswers({})
      } catch (requestError) {
        setNotice(`Nie udalo sie pobrac pytan quizu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const submitQuizAnswers = () => {
    const quizId = Number(quizToSolveId)
    if (!Number.isInteger(quizId) || quizId <= 0) return

    void (async () => {
      try {
        const result = await submitTeacherQuiz(quizId, quizAnswers)
        setNotice(`Quiz wyslany. Wynik: ${result.score}/${result.max_score}.`)
      } catch (requestError) {
        setNotice(`Nie udalo sie wyslac quizu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const submitWhiteboardNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const quizId = Number(whiteboardQuizId)
    if (!Number.isInteger(quizId) || quizId <= 0) {
      setNotice('Podaj ID quizu dla notatki tablicowej.')
      return
    }

    setSavingWhiteboard(true)
    setNotice('')
    void (async () => {
      try {
        await saveTeacherQuizWhiteboardNote(quizId, {
          question_id: whiteboardQuestionId ? Number(whiteboardQuestionId) : undefined,
          text: whiteboardText || undefined,
          pos_x: Number(whiteboardPosX) || 80,
          pos_y: Number(whiteboardPosY) || 80,
          color: whiteboardColor || '#fff59d',
        })

        const response = await listTeacherQuizWhiteboardNotes(quizId, whiteboardQuestionId ? Number(whiteboardQuestionId) : undefined)
        setWhiteboardNotes(response.data || [])
        setNotice('Notatka tablicowa zapisana.')
      } catch (requestError) {
        setNotice(`Nie udalo sie zapisac notatki: ${getRequestErrorMessage(requestError)}`)
      } finally {
        setSavingWhiteboard(false)
      }
    })()
  }

  const loadWhiteboardNotes = () => {
    const quizId = Number(whiteboardQuizId)
    if (!Number.isInteger(quizId) || quizId <= 0) {
      setNotice('Podaj ID quizu do odczytu notatek.')
      return
    }

    void (async () => {
      try {
        const response = await listTeacherQuizWhiteboardNotes(quizId, whiteboardQuestionId ? Number(whiteboardQuestionId) : undefined)
        setWhiteboardNotes(response.data || [])
      } catch (requestError) {
        setNotice(`Nie udalo sie pobrac notatek: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const removeWhiteboardNote = (note: TeacherWhiteboardNote) => {
    void (async () => {
      try {
        await deleteTeacherQuizWhiteboardNote(note.quiz_id, note.id)
        await loadWhiteboardNotes()
      } catch (requestError) {
        setNotice(`Nie udalo sie usunac notatki: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const total = useMemo(() => items.length, [items])

  return (
    <section className="card admin-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/neuronetix-logo.png" alt="Neuronetix" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Panel nauczyciela</h1>
        </div>
        <small className="muted">Podglad uczniow i relacji opiekunczych</small>
      </div>

      <div className="row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className={`btn ${tab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('overview')}>Podopieczni</button>
        <button type="button" className={`btn ${tab === 'tasks' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('tasks')}>Zadania</button>
        <button type="button" className={`btn ${tab === 'notifications' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('notifications')}>Powiadomienia</button>
        <button type="button" className={`btn ${tab === 'quizzes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('quizzes')}>Testy i quizy</button>
      </div>

      {notice && <p className="muted" style={{ color: '#bfdbfe', marginTop: 0 }}>{notice}</p>}

      {tab === 'overview' && <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="row-between">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Twoi podopieczni</h2>
            <p className="muted" style={{ margin: 0 }}>
              Lista budowana na bazie relacji nadrzedny-podrzedny z modułu Admin Relacje.
            </p>
          </div>
          <div className="muted small">Lacznie: {total}</div>
        </div>

        {warning && <p className="muted" style={{ color: '#fbbf24', marginTop: 10 }}>{warning}</p>}
        {error && <p className="muted" style={{ color: '#fca5a5', marginTop: 10 }}>Blad: {error}</p>}

        <div className="row" style={{ flexWrap: 'wrap', marginTop: 10, marginBottom: 4 }}>
          {Object.entries(stats).map(([type, count]) => (
            <span key={type} className="assignment-chip active" style={{ cursor: 'default' }}>
              {type}: {count}
            </span>
          ))}
        </div>
      </div>}

      {tab === 'overview' && <div className="card" style={{ marginBottom: 0 }}>
        <h2 style={{ marginTop: 0 }}>Relacje uczniow</h2>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Uczen</th>
                <th>Email</th>
                <th>Typ relacji</th>
                <th>Zakres</th>
                <th>Notatka</th>
                <th>Aktualizacja</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="muted">Ladowanie danych panelu nauczyciela...</td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">Brak przypisanych uczniow.</td>
                </tr>
              )}

              {!loading && items.map((item) => (
                <tr key={item.relation_id}>
                  <td>
                    <div>{displayStudentName(item)}</div>
                    <small className="muted">#{item.student.id}</small>
                  </td>
                  <td>{item.student.email || '-'}</td>
                  <td><strong>{item.relation_type}</strong></td>
                  <td>{item.activity_scope || '-'}</td>
                  <td>{item.notes || '-'}</td>
                  <td className="small">{formatTimestamp(item.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {tab === 'tasks' && <>
        {(role === 'nauczyciel' || role === 'teacher' || role === 'admin' || role === 'owner') && <div className="card" style={{ marginBottom: 12 }}>
          <h2 style={{ marginTop: 0 }}>Nowe zadanie</h2>
          <form className="row" style={{ flexWrap: 'wrap' }} onSubmit={submitTask}>
            <select className="admin-field" value={taskStudentId} onChange={(event) => setTaskStudentId(event.target.value)} style={{ minWidth: 220 }}>
              <option value="">Wybierz ucznia</option>
              {items.map((item) => (
                <option key={item.student.id} value={item.student.id}>{displayStudentName(item)}</option>
              ))}
            </select>
            <input className="admin-field" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Tytul zadania" style={{ minWidth: 220 }} />
            <input className="admin-field" value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Opis" style={{ minWidth: 260 }} />
            <input className="admin-field" type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} />
            <label className="row" style={{ padding: '8px 10px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}>
              <input type="checkbox" checked={taskHasWhiteboard} onChange={(event) => setTaskHasWhiteboard(event.target.checked)} />
              <span>Tablica do zadania otwartego</span>
            </label>
            <button type="submit" className="btn btn-primary" disabled={savingTask}>{savingTask ? 'Zapisywanie...' : 'Utworz zadanie'}</button>
          </form>
        </div>}

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Lista zadan</h2>
            <div className="row">
              <select className="admin-field" value={taskStatusFilter} onChange={(event) => setTaskStatusFilter((event.target.value || '') as TeacherTaskStatus | '')}>
                <option value="">Wszystkie statusy</option>
                <option value="todo">todo</option>
                <option value="workflow">workflow</option>
                <option value="submitted">submitted</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tytul</th>
                  <th>Uczen</th>
                  <th>Termin</th>
                  <th>Status</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {tasksLoading && <tr><td colSpan={5} className="muted">Ladowanie zadan...</td></tr>}
                {!tasksLoading && tasks.length === 0 && <tr><td colSpan={5} className="muted">Brak zadan.</td></tr>}
                {!tasksLoading && tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div>{task.title}</div>
                      <small className="muted">{task.description || '-'} {task.has_whiteboard ? '| tablica' : ''}</small>
                    </td>
                    <td>{task.assignee.imie || task.assignee.nick || task.assignee.email || `#${task.assigned_to_user_id}`}</td>
                    <td>{task.due_date || '-'}</td>
                    <td>
                      <select className="admin-field" value={taskDraftById[task.id] || task.status} onChange={(event) => setTaskDraftById((prev) => ({ ...prev, [task.id]: event.target.value as TeacherTaskStatus }))}>
                        <option value="todo">todo</option>
                        <option value="workflow">workflow</option>
                        <option value="submitted">submitted</option>
                      </select>
                    </td>
                    <td>
                      <div className="row">
                        <button type="button" className="btn btn-ghost" onClick={() => changeTaskStatus(task)}>Zmien status</button>
                        {(role === 'nauczyciel' || role === 'teacher' || role === 'admin' || role === 'owner') && <button type="button" className="btn btn-ghost" onClick={() => removeTask(task)}>Usun</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {tab === 'notifications' && <div className="card" style={{ marginBottom: 0 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Powiadomienia nauczyciel-uczen</h2>
          <button type="button" className="btn btn-ghost" onClick={markAllNotificationsRead}>Oznacz wszystkie jako przeczytane</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Tytul</th>
                <th>Wiadomosc</th>
                <th>Od</th>
                <th>Data</th>
                <th>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {notificationsLoading && <tr><td colSpan={6} className="muted">Ladowanie powiadomien...</td></tr>}
              {!notificationsLoading && notifications.length === 0 && <tr><td colSpan={6} className="muted">Brak powiadomien.</td></tr>}
              {!notificationsLoading && notifications.map((item) => (
                <tr key={item.id}>
                  <td>{item.type}</td>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.message || '-'}</td>
                  <td>{item.from.imie || item.from.nick || item.from.email || '-'}</td>
                  <td>{formatTimestamp(item.created_at)}</td>
                  <td>
                    {!item.read_at && <button type="button" className="btn btn-ghost" onClick={() => markOneNotificationRead(item.id)}>Oznacz jako przeczytane</button>}
                    {item.read_at && <span className="muted">Przeczytane</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {tab === 'quizzes' && <>
        {(role === 'nauczyciel' || role === 'teacher' || role === 'admin' || role === 'owner') && <div className="card" style={{ marginBottom: 12 }}>
          <h2 style={{ marginTop: 0 }}>Nowy test/quiz</h2>
          <form onSubmit={submitQuizCreate}>
            <div className="row" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <input className="admin-field" value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="Tytul quizu" style={{ minWidth: 220 }} />
              <input className="admin-field" value={quizDescription} onChange={(event) => setQuizDescription(event.target.value)} placeholder="Opis" style={{ minWidth: 260 }} />
              <input className="admin-field" type="date" value={quizDueDate} onChange={(event) => setQuizDueDate(event.target.value)} />
            </div>

            <div className="assignment-grid" style={{ marginBottom: 10 }}>
              {items.map((item) => {
                const studentId = item.student.id
                const active = quizStudentIds.includes(studentId)
                return (
                  <button key={studentId} type="button" className={`assignment-chip${active ? ' active' : ''}`} onClick={() => toggleQuizStudent(studentId)}>
                    {displayStudentName(item)}
                  </button>
                )
              })}
            </div>

            {quizQuestions.map((question, index) => (
              <div key={index} className="assignment-section" style={{ marginBottom: 8 }}>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <input className="admin-field" value={question.question_text} onChange={(event) => setQuizQuestions((prev) => prev.map((q, i) => i === index ? { ...q, question_text: event.target.value } : q))} placeholder={`Pytanie ${index + 1}`} style={{ minWidth: 280 }} />
                  <select className="admin-field" value={question.question_type} onChange={(event) => setQuizQuestions((prev) => prev.map((q, i) => i === index ? { ...q, question_type: event.target.value as 'text' | 'single_choice' | 'open_with_whiteboard' } : q))}>
                    <option value="text">Otwarta</option>
                    <option value="single_choice">Jednokrotnego wyboru</option>
                    <option value="open_with_whiteboard">Otwarta + tablica</option>
                  </select>
                  <input className="admin-field" type="number" min={1} max={100} value={question.points} onChange={(event) => setQuizQuestions((prev) => prev.map((q, i) => i === index ? { ...q, points: Number(event.target.value) || 1 } : q))} placeholder="Punkty" style={{ width: 120 }} />
                </div>
                {question.question_type === 'single_choice' && <textarea className="admin-field" value={question.options} onChange={(event) => setQuizQuestions((prev) => prev.map((q, i) => i === index ? { ...q, options: event.target.value } : q))} placeholder="Opcje odpowiedzi (kazda w nowej linii)" style={{ width: '100%', minHeight: 90, marginTop: 8 }} />}
                <input className="admin-field" value={question.correct_answer} onChange={(event) => setQuizQuestions((prev) => prev.map((q, i) => i === index ? { ...q, correct_answer: event.target.value } : q))} placeholder="Poprawna odpowiedz (opcjonalnie)" style={{ marginTop: 8, minWidth: 300 }} />
              </div>
            ))}

            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={addQuizQuestion}>Dodaj pytanie</button>
              <button type="submit" className="btn btn-primary" disabled={savingQuiz}>{savingQuiz ? 'Zapisywanie...' : 'Utworz quiz'}</button>
            </div>
          </form>
        </div>}

        <div className="card" style={{ marginBottom: 12 }}>
          <h2 style={{ marginTop: 0 }}>Lista quizow</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tytul</th>
                  <th>Termin</th>
                  <th>Pytania</th>
                  <th>Przypisani</th>
                  <th>Status</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {quizzesLoading && <tr><td colSpan={6} className="muted">Ladowanie quizow...</td></tr>}
                {!quizzesLoading && quizzes.length === 0 && <tr><td colSpan={6} className="muted">Brak quizow.</td></tr>}
                {!quizzesLoading && quizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>
                      <div>{quiz.title}</div>
                      <small className="muted">{quiz.description || '-'}</small>
                    </td>
                    <td>{quiz.due_date || '-'}</td>
                    <td>{quiz.questions_count ?? '-'}</td>
                    <td>{quiz.assigned_count ?? '-'}</td>
                    <td>{quiz.assignment_status || (quiz.is_active ? 'aktywny' : 'nieaktywny')}</td>
                    <td>
                      {(role === 'nauczyciel' || role === 'teacher' || role === 'admin' || role === 'owner') && <button type="button" className="btn btn-ghost" onClick={() => removeQuiz(quiz)}>Usun</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(role === 'uczen' || role === 'student') && <div className="card" style={{ marginBottom: 12 }}>
          <h2 style={{ marginTop: 0 }}>Rozwiaz quiz</h2>
          <div className="row" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
            <select className="admin-field" value={quizToSolveId} onChange={(event) => setQuizToSolveId(event.target.value)} style={{ minWidth: 220 }}>
              <option value="">Wybierz quiz</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
              ))}
            </select>
            <button type="button" className="btn btn-ghost" onClick={loadQuizForSolve}>Pobierz pytania</button>
          </div>

          {quizQuestionsToSolve.map((question) => (
            <div key={question.id} className="assignment-section" style={{ marginBottom: 8 }}>
              <strong>{question.question_text}</strong>
              {question.question_type === 'single_choice' ? (
                <select className="admin-field" value={quizAnswers[String(question.id)] || ''} onChange={(event) => setQuizAnswers((prev) => ({ ...prev, [String(question.id)]: event.target.value }))} style={{ marginTop: 8, minWidth: 220 }}>
                  <option value="">Wybierz odpowiedz</option>
                  {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input className="admin-field" value={quizAnswers[String(question.id)] || ''} onChange={(event) => setQuizAnswers((prev) => ({ ...prev, [String(question.id)]: event.target.value }))} placeholder="Twoja odpowiedz" style={{ marginTop: 8, minWidth: 320 }} />
              )}
            </div>
          ))}

          {quizQuestionsToSolve.length > 0 && <button type="button" className="btn btn-primary" onClick={submitQuizAnswers}>Wyslij quiz</button>}
        </div>}

        <div className="card" style={{ marginBottom: 0 }}>
          <h2 style={{ marginTop: 0 }}>Tablica do quizu (wirnote)</h2>
          <p className="muted" style={{ marginTop: 0 }}>Notatki tablicowe zapisane per quiz/pytanie, zgodnie z dostarczonym schematem whiteboard.</p>
          <form className="row" style={{ flexWrap: 'wrap', marginBottom: 8 }} onSubmit={submitWhiteboardNote}>
            <input className="admin-field" value={whiteboardQuizId} onChange={(event) => setWhiteboardQuizId(event.target.value)} placeholder="ID quizu" style={{ width: 120 }} />
            <input className="admin-field" value={whiteboardQuestionId} onChange={(event) => setWhiteboardQuestionId(event.target.value)} placeholder="ID pytania (opcjonalnie)" style={{ width: 200 }} />
            <input className="admin-field" value={whiteboardPosX} onChange={(event) => setWhiteboardPosX(event.target.value)} placeholder="X" style={{ width: 90 }} />
            <input className="admin-field" value={whiteboardPosY} onChange={(event) => setWhiteboardPosY(event.target.value)} placeholder="Y" style={{ width: 90 }} />
            <input className="admin-field" value={whiteboardColor} onChange={(event) => setWhiteboardColor(event.target.value)} placeholder="#fff59d" style={{ width: 120 }} />
            <input className="admin-field" value={whiteboardText} onChange={(event) => setWhiteboardText(event.target.value)} placeholder="Tresc notatki" style={{ minWidth: 280 }} />
            <button type="submit" className="btn btn-primary" disabled={savingWhiteboard}>{savingWhiteboard ? 'Zapisywanie...' : 'Zapisz notatke'}</button>
            <button type="button" className="btn btn-ghost" onClick={loadWhiteboardNotes}>Odswiez notatki</button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Quiz</th>
                  <th>Pytanie</th>
                  <th>Pozycja</th>
                  <th>Kolor</th>
                  <th>Tresc</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {whiteboardNotes.length === 0 && <tr><td colSpan={7} className="muted">Brak notatek tablicowych.</td></tr>}
                {whiteboardNotes.map((note) => (
                  <tr key={note.id}>
                    <td>{note.id}</td>
                    <td>{note.quiz_id}</td>
                    <td>{note.question_id || '-'}</td>
                    <td>{note.pos_x}, {note.pos_y}</td>
                    <td>{note.color}</td>
                    <td>{note.text || '-'}</td>
                    <td><button type="button" className="btn btn-ghost" onClick={() => removeWhiteboardNote(note)}>Usun</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}
    </section>
  )
}
