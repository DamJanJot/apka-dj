import { useEffect, useMemo, useState } from 'react'
import SunClockWidget from '../components/sun-clock-widget'
import WeatherWidget from '@/components/weather_widget'
import WeatherForecast from '@/components/weather-forecast'
import { getChatNotifications, getFriendsOverview, getOptivioOverview, OptivioDeadlineEvent, OptivioOverview } from '@/api/client'
import { Link } from 'react-router-dom'

const weatherApiKey = import.meta.env.VITE_WEATHER_API_KEY ?? ''

type OrbitumSnapshot = {
  friendsCount: number
  pendingFriendsCount: number
  unreadMessagesCount: number
}

function toDateKey(value: Date): string {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

function buildQuickDays(): Date[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<OrbitumSnapshot>({
    friendsCount: 0,
    pendingFriendsCount: 0,
    unreadMessagesCount: 0,
  })

  const [optivio, setOptivio] = useState<OptivioOverview>({
    projectsCount: 0,
    tasksCount: 0,
    doneTasksCount: 0,
    syncPendingCount: 0,
    deadlines: [],
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const [friends, notifications, optivioOverview] = await Promise.all([
          getFriendsOverview(),
          getChatNotifications(),
          getOptivioOverview(),
        ])

        if (!mounted) return

        setSnapshot({
          friendsCount: friends.friends.length,
          pendingFriendsCount: friends.incoming.length,
          unreadMessagesCount: notifications.unread_count,
        })

        setOptivio(optivioOverview)
      } catch {
        // keep default values when api is unavailable
      }
    }

    load()

    const events = ['focus', 'visibilitychange'] as const
    events.forEach((eventName) => window.addEventListener(eventName, load))

    return () => {
      mounted = false
      events.forEach((eventName) => window.removeEventListener(eventName, load))
    }
  }, [])

  const days = useMemo(() => buildQuickDays(), [])

  const deadlineMap = useMemo(() => {
    const map = new Map<string, OptivioDeadlineEvent[]>()
    optivio.deadlines.forEach((item) => {
      const key = item.date
      const list = map.get(key) || []
      list.push(item)
      map.set(key, list)
    })
    return map
  }, [optivio.deadlines])

  const nextDeadlines = useMemo(() => optivio.deadlines.slice(0, 6), [optivio.deadlines])

  return (
    <div className="content">
      <div className='card'>
        <div className='grid'>
          <SunClockWidget />
          <WeatherWidget city="Warszawa" apiKey={weatherApiKey} />
        </div> 
        <WeatherForecast city="Warszawa" apiKey={weatherApiKey} />       
      </div>

      <div className="card orbitum-overview-card">
        <div className="orbitum-overview-head">
          <h2>Orbitum + Optivio Dashboard</h2>
          <p className="muted">Podsumowanie ekosystemu i terminy projektow/taskow.</p>
        </div>

        <div className="orbitum-overview-metrics">
          <div className="stat">
            <div className="label">Znajomi</div>
            <div className="value">{snapshot.friendsCount}</div>
          </div>
          <div className="stat">
            <div className="label">Zaproszenia</div>
            <div className="value">{snapshot.pendingFriendsCount}</div>
          </div>
          <div className="stat">
            <div className="label">Nieprzeczytane wiadomosci</div>
            <div className="value">{snapshot.unreadMessagesCount}</div>
          </div>
          <div className="stat">
            <div className="label">Projekty Optivio</div>
            <div className="value">{optivio.projectsCount}</div>
          </div>
          <div className="stat">
            <div className="label">Taski Optivio</div>
            <div className="value">{optivio.tasksCount}</div>
          </div>
          <div className="stat">
            <div className="label">Taski niezsynchronizowane</div>
            <div className="value">{optivio.syncPendingCount}</div>
          </div>
        </div>

        <div className="orbitum-calendar-wrap">
          <div className="orbitum-calendar-head">
            <h3>Szybki kalendarz (7 dni)</h3>
            <Link className="btn btn-ghost" to="/calendar">Pelny kalendarz</Link>
          </div>

          <div className="orbitum-calendar-grid orbitum-calendar-days">
            {days.map((day) => {
              const key = toDateKey(day)
              const items = deadlineMap.get(key) || []
              return (
                <div key={key} className="calendar-day">
                  <span className="calendar-day-number">{day.getDate()}</span>
                  <div className="calendar-day-items">
                    {items.slice(0, 1).map((item) => (
                      <small key={item.id} className={`calendar-chip ${item.type}`}>
                        {item.type === 'project' ? 'P' : 'T'} {item.projectName}
                      </small>
                    ))}
                    {items.length > 1 && <small className="calendar-chip more">+{items.length - 1}</small>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="orbitum-next-deadlines">
          <h3>Nadchodzace terminy</h3>
          <ul className="list">
            {nextDeadlines.length === 0 && <li className="muted">Brak terminow.</li>}
            {nextDeadlines.map((item) => (
              <li key={item.id} className="deadline-row">
                <strong>{shortDate(item.date)}</strong>
                <span>{item.title}</span>
                <small className="muted">{item.projectName}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
