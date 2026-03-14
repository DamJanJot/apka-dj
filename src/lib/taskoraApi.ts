import { api } from '@/api/client'

export type TaskoraProject = {
  id: number
  title: string
  description: string
  progress_percent?: number
  total_count?: number
  done_count?: number
}

export type TaskoraTask = {
  id: number
  title: string
  description: string
  status: 'ready' | 'progress' | 'review' | 'done'
  project_id: number | null
}

type TaskoraResponse = {
  success?: boolean
  error?: string
  message?: string
  id?: string | number
}

export async function listTaskoraProjects(): Promise<TaskoraProject[]> {
  const r = await api.get('/api/taskora-bridge/projects')
  return r.data
}

export async function listTaskoraTasks(projectId: number): Promise<TaskoraTask[]> {
  const r = await api.get(`/api/taskora-bridge/projects/${projectId}/tasks`)
  return r.data
}

export async function createTaskoraProject(title: string, description: string): Promise<number> {
  const r = await api.post('/api/taskora-bridge/projects', { title, description })
  const data = r.data as TaskoraResponse
  if (!data.success || !data.id) throw new Error(data.error || 'Nie udalo sie utworzyc projektu')
  return Number(data.id)
}

export async function createTaskoraTask(payload: {
  title: string
  description: string
  projectId: number
  status?: 'ready' | 'progress' | 'review' | 'done'
}): Promise<number> {
  const r = await api.post(`/api/taskora-bridge/projects/${payload.projectId}/tasks`, {
    title: payload.title,
    description: payload.description,
    status: payload.status || 'ready',
  })
  const data = r.data as TaskoraResponse

  if (!data.success || !data.id) throw new Error(data.error || 'Nie udalo sie utworzyc taska')
  return Number(data.id)
}
