import { Link } from 'react-router-dom'
import { SUBJECTS } from '@/lib/subjects'

export default function StudentSubjectsPage() {
  return (
    <section className="card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Przedmioty</h1>
        <p className="muted" style={{ margin: '8px 0 0' }}>
          Wybierz przedmiot i przejdz do dzialow oraz materialow.
        </p>
      </div>

      <div className="subject-grid">
        {SUBJECTS.map((subject) => (
          <Link key={subject.key} to={`/neuronetix/subjects/${subject.key}`} className="subject-card-link">
            <h2>{subject.name}</h2>
            <p>{subject.shortDescription}</p>
            <span className="btn btn-primary">Otworz przedmiot</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
