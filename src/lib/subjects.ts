export type SubjectDef = {
  key: string
  name: string
  shortDescription: string
}

export const SUBJECTS: SubjectDef[] = [
  {
    key: 'matematyka',
    name: 'Matematyka',
    shortDescription: 'Algebra, geometria, zadania rachunkowe i powtorki pod testy.',
  },
  {
    key: 'jezyk-polski',
    name: 'Jezyk polski',
    shortDescription: 'Lektury, gramatyka, pisanie prac i materialy do egzaminu.',
  },
  {
    key: 'jezyk-angielski',
    name: 'Jezyk angielski',
    shortDescription: 'Slownictwo, gramatyka, listening i speaking.',
  },
  {
    key: 'informatyka',
    name: 'Informatyka',
    shortDescription: 'Programowanie, systemy, sieci i zadania praktyczne.',
  },
]

export type SubjectSection = {
  id: string
  title: string
  description: string
  createdAt: string
}

export type SubjectMaterial = {
  id: string
  sectionId: string
  title: string
  description: string
  materialType: 'notatka' | 'link' | 'plik'
  linkUrl: string
  fileName: string
  createdAt: string
}

const STORAGE_PREFIX = 'neuronetix.subjects.v1'

export function getSubjectStorageKey(subjectKey: string): string {
  return `${STORAGE_PREFIX}.${subjectKey}`
}
