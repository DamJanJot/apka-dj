import { useEffect, useMemo, useState } from 'react'
import { getOptivioOverview } from '@/api/client'

type Deadline = {
  id: string
  date: string
  title: string
  type: 'project' | 'task'
  projectName: string
}

function toDateKey(value: Date): string {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}-${`${value.getDate()}`.padStart(2, '0')}`
}

function monthLabel(value: Date): string {
  return value.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
}

function buildCalendarDays(baseMonth: Date): Date[] {
  const first = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1)
  const start = new Date(first)
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1
  start.setDate(first.getDate() - offset)

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return day
  })
}

export default function OrbitumCalendar() {
  const [activeMonth, setActiveMonth] = useState(() => new Date())
  const [deadlines, setDeadlines] = useState<Deadline[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const overview = await getOptivioOverview()
        setDeadlines(overview.deadlines as Deadline[])
      } catch {
        setDeadlines([])
      }
    })()
  }, [])

  const days = useMemo(() => buildCalendarDays(activeMonth), [activeMonth])
  const deadlineMap = useMemo(() => {
    const map = new Map<string, Deadline[]>()
    deadlines.forEach((item) => {
      const list = map.get(item.date) || []
      list.push(item)
      map.set(item.date, list)
    })
    return map
  }, [deadlines])

  return (
    <section className="card orbitum-calendar-page">
      <div className="orbitum-calendar-head">
        <h1>Kalendarz</h1>
        <div className="row">
          <button className="btn btn-ghost" type="button" onClick={() => setActiveMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>Poprzedni</button>
          <strong>{monthLabel(activeMonth)}</strong>
          <button className="btn btn-ghost" type="button" onClick={() => setActiveMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Nastepny</button>
        </div>
      </div>

      <div className="orbitum-calendar-grid orbitum-calendar-weekdays">
        {['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Ndz'].map((label) => <div key={label} className="weekday">{label}</div>)}
      </div>

      <div className="orbitum-calendar-grid orbitum-calendar-days">
        {days.map((day) => {
          const key = toDateKey(day)
          const items = deadlineMap.get(key) || []
          const inMonth = day.getMonth() === activeMonth.getMonth()
          return (
            <div key={key} className={`calendar-day ${inMonth ? '' : 'muted-day'}`}>
              <span className="calendar-day-number">{day.getDate()}</span>
              <div className="calendar-day-items">
                {items.slice(0, 3).map((item) => (
                  <small key={item.id} className={`calendar-chip ${item.type}`}>
                    {item.type === 'project' ? 'P' : 'T'} {item.projectName}
                  </small>
                ))}
                {items.length > 3 && <small className="calendar-chip more">+{items.length - 3}</small>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
