import { FormEvent, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import {
  getTeacherQuizDetail,
  listTeacherQuizWhiteboardNotes,
  listTeacherQuizzes,
  saveTeacherQuizWhiteboardNote,
  submitTeacherQuiz,
  TeacherQuizDetail,
  TeacherQuizListItem,
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

function formatDate(value: string | null): string {
  if (!value) return 'Brak terminu'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('pl-PL')
}

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<TeacherQuizListItem[]>([])
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null)
  const [activeQuiz, setActiveQuiz] = useState<TeacherQuizDetail['quiz'] | null>(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [scoreInfo, setScoreInfo] = useState<{ score: number; maxScore: number } | null>(null)
  const [whiteboardNotes, setWhiteboardNotes] = useState<TeacherWhiteboardNote[]>([])
  const [whiteboardText, setWhiteboardText] = useState('')
  const [whiteboardColor, setWhiteboardColor] = useState('#fff59d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadQuizzes = async () => {
    const response = await listTeacherQuizzes()
    setQuizzes(response.data || [])
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)

    void (async () => {
      try {
        await loadQuizzes()
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
  }, [])

  const openQuiz = (quizId: number) => {
    setNotice('')
    setScoreInfo(null)
    setActiveQuestionIndex(0)
    setAnswers({})
    setActiveQuizId(quizId)

    void (async () => {
      try {
        const detail = await getTeacherQuizDetail(quizId)
        setActiveQuiz(detail.quiz)
        const firstQuestionId = detail.quiz.questions[0]?.id
        const notes = await listTeacherQuizWhiteboardNotes(quizId, firstQuestionId)
        setWhiteboardNotes(notes.data || [])
      } catch (requestError) {
        setNotice(`Nie mozna otworzyc quizu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const activeQuestion = activeQuiz?.questions?.[activeQuestionIndex] || null

  useEffect(() => {
    if (!activeQuizId || !activeQuestion?.id) {
      setWhiteboardNotes([])
      return
    }

    void (async () => {
      try {
        const notes = await listTeacherQuizWhiteboardNotes(activeQuizId, activeQuestion.id)
        setWhiteboardNotes(notes.data || [])
      } catch {
        setWhiteboardNotes([])
      }
    })()
  }, [activeQuizId, activeQuestion?.id])

  const completion = useMemo(() => {
    if (!activeQuiz) return { answered: 0, total: 0 }
    const total = activeQuiz.questions.length
    const answered = activeQuiz.questions.filter((question) => {
      const val = answers[String(question.id)]
      return Boolean((val || '').trim())
    }).length
    return { answered, total }
  }, [activeQuiz, answers])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeQuizId) return

    setNotice('')
    void (async () => {
      try {
        const result = await submitTeacherQuiz(activeQuizId, answers)
        setScoreInfo({ score: result.score, maxScore: result.max_score })
        setNotice('Quiz zostal automatycznie oceniony.')
        await loadQuizzes()
      } catch (requestError) {
        setNotice(`Nie mozna wyslac quizu: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  const saveWhiteboard = () => {
    if (!activeQuizId || !activeQuestion?.id) return

    void (async () => {
      try {
        await saveTeacherQuizWhiteboardNote(activeQuizId, {
          question_id: activeQuestion.id,
          text: whiteboardText,
          color: whiteboardColor,
        })
        const response = await listTeacherQuizWhiteboardNotes(activeQuizId, activeQuestion.id)
        setWhiteboardNotes(response.data || [])
        setWhiteboardText('')
      } catch (requestError) {
        setNotice(`Nie mozna zapisac notatki: ${getRequestErrorMessage(requestError)}`)
      }
    })()
  }

  return (
    <section className="card student-quiz-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Quizy ucznia</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>Czytelny tryb rozwiazywania: najpierw wybierz quiz z listy po lewej.</p>
        </div>
      </div>

      {error && <p style={{ color: '#fca5a5' }}>{error}</p>}
      {notice && <p className="muted">{notice}</p>}
      {loading && <p className="muted">Ladowanie...</p>}

      {!loading && (
        <div className="student-quiz-layout">
          <aside className="student-quiz-list">
            {quizzes.length === 0 && <p className="muted">Brak przypisanych quizow.</p>}
            {quizzes.map((quiz) => (
              <button
                key={quiz.id}
                type="button"
                className={`student-quiz-list-item ${activeQuizId === quiz.id ? 'active' : ''}`}
                onClick={() => openQuiz(quiz.id)}
              >
                <strong>{quiz.title}</strong>
                <span className="muted">Termin: {formatDate(quiz.due_date)}</span>
                <span className="muted">Status: {quiz.assignment_status || 'assigned'}</span>
              </button>
            ))}
          </aside>

          <div className="student-quiz-workspace">
            {!activeQuiz && <p className="muted">Wybierz quiz z listy, aby rozpocząc rozwiazywanie.</p>}

            {activeQuiz && (
              <form onSubmit={handleSubmit} className="student-quiz-form">
                <div className="student-quiz-header">
                  <h2>{activeQuiz.title}</h2>
                  <p className="muted">Termin: {formatDate(activeQuiz.due_date)}</p>
                  <p className="muted">Postep: {completion.answered}/{completion.total}</p>
                  {scoreInfo && <p className="student-score-badge">Wynik: {scoreInfo.score}/{scoreInfo.maxScore}</p>}
                </div>

                {activeQuestion && (
                  <article className="student-question-card">
                    <div className="row-between" style={{ alignItems: 'center', gap: 10 }}>
                      <h3 style={{ margin: 0 }}>Pytanie {activeQuestionIndex + 1} z {activeQuiz.questions.length}</h3>
                      <span className="muted">{activeQuestion.points} pkt</span>
                    </div>
                    <p>{activeQuestion.question_text}</p>

                    {activeQuestion.question_type === 'single_choice' && (
                      <div className="student-choice-grid">
                        {activeQuestion.options.map((option) => {
                          const selected = (answers[String(activeQuestion.id)] || '') === option
                          return (
                            <button
                              key={option}
                              type="button"
                              className={`student-choice-btn ${selected ? 'active' : ''}`}
                              onClick={() => setAnswers((prev) => ({ ...prev, [String(activeQuestion.id)]: option }))}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {(activeQuestion.question_type === 'text' || activeQuestion.question_type === 'open_with_whiteboard') && (
                      <textarea
                        rows={4}
                        className="student-text-answer"
                        value={answers[String(activeQuestion.id)] || ''}
                        onChange={(event) => setAnswers((prev) => ({ ...prev, [String(activeQuestion.id)]: event.target.value }))}
                        placeholder="Wpisz odpowiedz..."
                      />
                    )}

                    {activeQuestion.question_type === 'open_with_whiteboard' && (
                      <div className="student-whiteboard-box">
                        <h4 style={{ marginTop: 0 }}>Tablica do pytania otwartego</h4>
                        <div className="student-whiteboard-editor">
                          <textarea
                            rows={3}
                            value={whiteboardText}
                            onChange={(event) => setWhiteboardText(event.target.value)}
                            placeholder="Notatka/tablica do tego pytania..."
                          />
                          <input type="color" value={whiteboardColor} onChange={(event) => setWhiteboardColor(event.target.value)} />
                          <button type="button" className="btn btn-primary" onClick={saveWhiteboard}>Dodaj notatke</button>
                        </div>

                        <div className="student-whiteboard-notes">
                          {whiteboardNotes.length === 0 && <p className="muted">Brak notatek dla tego pytania.</p>}
                          {whiteboardNotes.map((note) => (
                            <article key={note.id} className="student-note" style={{ background: note.color || '#fff59d' }}>
                              <div>{note.text || '(pusta notatka)'}</div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                )}

                <div className="student-question-nav">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!activeQuiz || activeQuestionIndex <= 0}
                    onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                  >
                    Poprzednie
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!activeQuiz || activeQuestionIndex >= activeQuiz.questions.length - 1}
                    onClick={() => setActiveQuestionIndex((prev) => Math.min((activeQuiz?.questions.length || 1) - 1, prev + 1))}
                  >
                    Nastepne
                  </button>
                  <button type="submit" className="btn btn-primary">Wyslij i ocen</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
