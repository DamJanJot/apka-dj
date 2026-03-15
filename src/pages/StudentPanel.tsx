import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  listTeacherNotifications,
  listTeacherQuizzes,
  listTeacherTasks,
  TeacherNotificationItem,
  TeacherQuizListItem,
  TeacherTaskItem,
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

export default function StudentPanel() {
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [quizzes, setQuizzes] = useState<TeacherQuizListItem[]>([])
  const [notifications, setNotifications] = useState<TeacherNotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)

    void (async () => {
      try {
        const [tasksData, quizzesData, notificationsData] = await Promise.all([
          listTeacherTasks(),
          listTeacherQuizzes(),
          listTeacherNotifications(),
        ])

        if (!mounted) return
        setTasks(tasksData.data || [])
        setQuizzes(quizzesData.data || [])
        setNotifications(notificationsData.data || [])
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
  }, [])

  const summary = useMemo(() => {
    const pendingTasks = tasks.filter((task) => task.status !== 'submitted').length
    const submittedTasks = tasks.filter((task) => task.status === 'submitted').length
    const pendingQuizzes = quizzes.filter((quiz) => quiz.assignment_status !== 'submitted').length
    const unreadNotifications = notifications.filter((notification) => !notification.read_at).length

    return {
      pendingTasks,
      submittedTasks,
      pendingQuizzes,
      unreadNotifications,
    }
  }, [tasks, quizzes, notifications])

  return (
    <section className="card student-hub" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Panel ucznia</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>Szybki start: przejdz do zadan albo quizow.</p>
        </div>
      </div>

      {error && <p style={{ color: '#fca5a5', marginTop: 0 }}>{error}</p>}
      {loading && <p className="muted" style={{ marginTop: 0 }}>Ladowanie danych...</p>}

      {!loading && (
        <>
          <div className="student-summary-grid">
            <article className="student-summary-card">
              <span className="muted">Zadania aktywne</span>
              <strong>{summary.pendingTasks}</strong>
            </article>
            <article className="student-summary-card">
              <span className="muted">Zadania przeslane</span>
              <strong>{summary.submittedTasks}</strong>
            </article>
            <article className="student-summary-card">
              <span className="muted">Quizy do rozwiazania</span>
              <strong>{summary.pendingQuizzes}</strong>
            </article>
            <article className="student-summary-card">
              <span className="muted">Nowe powiadomienia</span>
              <strong>{summary.unreadNotifications}</strong>
            </article>
          </div>

          <div className="student-hub-actions">
            <Link to="/neuronetix/student/tasks" className="student-hub-link">
              <h2>Zadania</h2>
              <p>Pracuj na statusach: do zrobienia, workflow, przeslany. Dla zadan otwartych masz tablice notatek.</p>
              <span className="btn btn-primary">Przejdz do zadan</span>
            </Link>

            <Link to="/neuronetix/student/quizzes" className="student-hub-link">
              <h2>Quizy i testy</h2>
              <p>Czytelny tryb rozwiazywania, pytania krok po kroku, szybkie zaznaczanie odpowiedzi i punktacja od razu po wyslaniu.</p>
              <span className="btn btn-primary">Przejdz do quizow</span>
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
