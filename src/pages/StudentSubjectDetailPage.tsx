import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  getSubjectStorageKey,
  SUBJECTS,
  SubjectMaterial,
  SubjectSection,
} from '@/lib/subjects'

type SubjectStorage = {
  sections: SubjectSection[]
  materials: SubjectMaterial[]
}

function defaultStorage(): SubjectStorage {
  return {
    sections: [],
    materials: [],
  }
}

function readStorage(subjectKey: string): SubjectStorage {
  try {
    const raw = localStorage.getItem(getSubjectStorageKey(subjectKey))
    if (!raw) return defaultStorage()
    const parsed = JSON.parse(raw) as SubjectStorage
    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
    }
  } catch {
    return defaultStorage()
  }
}

function writeStorage(subjectKey: string, data: SubjectStorage): void {
  localStorage.setItem(getSubjectStorageKey(subjectKey), JSON.stringify(data))
}

export default function StudentSubjectDetailPage() {
  const { subjectKey = '' } = useParams()
  const { user } = useAuth()
  const role = (user?.rola || '').toLowerCase()
  const canEdit = ['nauczyciel', 'teacher', 'admin', 'owner'].includes(role)

  const subject = useMemo(() => SUBJECTS.find((item) => item.key === subjectKey), [subjectKey])

  const [sections, setSections] = useState<SubjectSection[]>([])
  const [materials, setMaterials] = useState<SubjectMaterial[]>([])

  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionDescription, setSectionDescription] = useState('')

  const [materialSectionId, setMaterialSectionId] = useState('')
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialDescription, setMaterialDescription] = useState('')
  const [materialType, setMaterialType] = useState<'notatka' | 'link' | 'plik'>('notatka')
  const [materialLinkUrl, setMaterialLinkUrl] = useState('')
  const [materialFileName, setMaterialFileName] = useState('')

  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!subjectKey) return
    const data = readStorage(subjectKey)
    setSections(data.sections)
    setMaterials(data.materials)
  }, [subjectKey])

  const grouped = useMemo(() => {
    const map = new Map<string, SubjectMaterial[]>()
    for (const section of sections) {
      map.set(section.id, [])
    }

    for (const material of materials) {
      const arr = map.get(material.sectionId) || []
      arr.push(material)
      map.set(material.sectionId, arr)
    }

    return map
  }, [sections, materials])

  const saveAll = (nextSections: SubjectSection[], nextMaterials: SubjectMaterial[]) => {
    setSections(nextSections)
    setMaterials(nextMaterials)
    if (subjectKey) {
      writeStorage(subjectKey, {
        sections: nextSections,
        materials: nextMaterials,
      })
    }
  }

  const submitSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) return
    if (!sectionTitle.trim()) {
      setNotice('Podaj nazwe dzialu.')
      return
    }

    const nextSection: SubjectSection = {
      id: String(Date.now()),
      title: sectionTitle.trim(),
      description: sectionDescription.trim(),
      createdAt: new Date().toISOString(),
    }

    saveAll([nextSection, ...sections], materials)
    setSectionTitle('')
    setSectionDescription('')
    setNotice('Dzial zostal dodany.')
  }

  const submitMaterial = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) return
    if (!materialSectionId) {
      setNotice('Wybierz dzial dla materialu.')
      return
    }
    if (!materialTitle.trim()) {
      setNotice('Podaj tytul materialu.')
      return
    }
    if (materialType === 'link' && !materialLinkUrl.trim()) {
      setNotice('Podaj URL dla materialu typu link.')
      return
    }

    const nextMaterial: SubjectMaterial = {
      id: String(Date.now()),
      sectionId: materialSectionId,
      title: materialTitle.trim(),
      description: materialDescription.trim(),
      materialType,
      linkUrl: materialLinkUrl.trim(),
      fileName: materialFileName.trim(),
      createdAt: new Date().toISOString(),
    }

    saveAll(sections, [nextMaterial, ...materials])
    setMaterialTitle('')
    setMaterialDescription('')
    setMaterialType('notatka')
    setMaterialLinkUrl('')
    setMaterialFileName('')
    setNotice('Material zostal dodany.')
  }

  if (!subject) {
    return (
      <section className="card" style={{ padding: 20 }}>
        <h1 style={{ marginTop: 0 }}>Nie znaleziono przedmiotu</h1>
        <Link to="/neuronetix/subjects" className="btn btn-primary">Wroc do listy przedmiotow</Link>
      </section>
    )
  }

  return (
    <section className="card subject-detail-page" style={{ padding: 20 }}>
      <div className="row-between" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>{subject.name}</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>{subject.shortDescription}</p>
        </div>
        <Link to="/neuronetix/subjects" className="btn btn-ghost">Wszystkie przedmioty</Link>
      </div>

      {notice && <p className="muted">{notice}</p>}

      {canEdit && (
        <div className="subject-edit-grid">
          <article className="card" style={{ margin: 0 }}>
            <h2 style={{ marginTop: 0 }}>Dodaj dzial</h2>
            <form onSubmit={submitSection} className="subject-form-grid">
              <input className="admin-field" value={sectionTitle} onChange={(event) => setSectionTitle(event.target.value)} placeholder="Np. Dzial 1 - Funkcje" />
              <textarea className="admin-field" value={sectionDescription} onChange={(event) => setSectionDescription(event.target.value)} placeholder="Opis dzialu" rows={3} />
              <button type="submit" className="btn btn-primary">Dodaj dzial</button>
            </form>
          </article>

          <article className="card" style={{ margin: 0 }}>
            <h2 style={{ marginTop: 0 }}>Dodaj material</h2>
            <form onSubmit={submitMaterial} className="subject-form-grid">
              <select className="admin-field" value={materialSectionId} onChange={(event) => setMaterialSectionId(event.target.value)}>
                <option value="">Wybierz dzial</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.title}</option>
                ))}
              </select>
              <input className="admin-field" value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} placeholder="Tytul materialu" />
              <textarea className="admin-field" value={materialDescription} onChange={(event) => setMaterialDescription(event.target.value)} placeholder="Opis" rows={3} />

              <select className="admin-field" value={materialType} onChange={(event) => setMaterialType(event.target.value as 'notatka' | 'link' | 'plik')}>
                <option value="notatka">Notatka</option>
                <option value="link">Link</option>
                <option value="plik">Plik</option>
              </select>

              {materialType === 'link' && (
                <input className="admin-field" value={materialLinkUrl} onChange={(event) => setMaterialLinkUrl(event.target.value)} placeholder="https://..." />
              )}

              {materialType === 'plik' && (
                <input className="admin-field" value={materialFileName} onChange={(event) => setMaterialFileName(event.target.value)} placeholder="Nazwa pliku (np. notatki.pdf)" />
              )}

              <button type="submit" className="btn btn-primary">Dodaj material</button>
            </form>
          </article>
        </div>
      )}

      <div className="subject-sections-list">
        {sections.length === 0 && <p className="muted">Brak dzialow. {canEdit ? 'Dodaj pierwszy dzial.' : ''}</p>}

        {sections.map((section) => (
          <article key={section.id} className="subject-section-card">
            <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0 }}>{section.title}</h2>
              <span className="muted small">{new Date(section.createdAt).toLocaleString('pl-PL')}</span>
            </div>
            {section.description && <p className="muted" style={{ marginTop: 8 }}>{section.description}</p>}

            <div className="subject-materials-list">
              {(grouped.get(section.id) || []).length === 0 && <p className="muted">Brak materialow w tym dziale.</p>}
              {(grouped.get(section.id) || []).map((material) => (
                <article key={material.id} className="subject-material-card">
                  <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <strong>{material.title}</strong>
                    <span className="assignment-chip" style={{ cursor: 'default' }}>{material.materialType}</span>
                  </div>
                  {material.description && <p style={{ marginBottom: 8 }}>{material.description}</p>}
                  {material.materialType === 'link' && material.linkUrl && (
                    <a href={material.linkUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">Otworz link</a>
                  )}
                  {material.materialType === 'plik' && material.fileName && (
                    <p className="muted" style={{ margin: 0 }}>Plik: {material.fileName}</p>
                  )}
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
