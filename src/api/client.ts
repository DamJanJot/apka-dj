import axios from 'axios'

const rawEnvApiUrl = (import.meta.env.VITE_API_URL || '').trim()
const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : ''
const isLocalHost = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1'
const fallbackApiUrl = isLocalHost ? 'http://localhost:8000' : 'https://apka-dj-production.up.railway.app'
const resolvedApiUrl = rawEnvApiUrl || fallbackApiUrl

// mały helper do odczytu cookie XSRF-TOKEN (nie httpOnly)
function getCookie(name: string) {
  const value = document.cookie.split('; ').find(row => row.startsWith(name + '='))
  return value ? decodeURIComponent(value.split('=')[1]) : undefined
}

export const api = axios.create({
  baseURL: resolvedApiUrl,
  withCredentials: true,
  // jawnie ustaw nazwy dla axios
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// 🚑 dla pewności dołóż nagłówek ręcznie (nie zawsze axios sam go doda cross-origin)
api.interceptors.request.use((config) => {
  const token = getCookie('XSRF-TOKEN')
  if (token) config.headers['X-XSRF-TOKEN'] = token
  return config
})

export type Me = {
  id: number
  email: string
  name?: string
  imie?: string
  nazwisko?: string
  nick?: string
  rola?: string
  avatar?: string | null
  access?: {
    apps: string[]
    panels: Record<string, string[]>
  }
}

export type ChatUser = {
  id: number
  imie?: string
  nazwisko?: string
  email?: string
  zdjecie_profilowe?: string | null
  is_online?: boolean | null
  last_seen_at?: string | null
}

export type ChatMessage = {
  id: number
  from_user_id: number
  to_user_id: number
  body: string
  image_path?: string | null
  is_mention?: boolean
  read_at?: string | null
  created_at: string
  updated_at: string
}

export type ChatNotificationItem = {
  from_user_id: number
  latest_at: string
  unread_count: number
  mention_count?: number
  sender_name?: string | null
  sender_email?: string | null
}

export type ChatNotifications = {
  unread_count: number
  items: ChatNotificationItem[]
}

export type FriendState = 'none' | 'incoming' | 'outgoing' | 'friend'

export type FriendUser = {
  id: number
  imie?: string
  nazwisko?: string
  email?: string
  zdjecie_profilowe?: string | null
}

export type FriendSearchItem = FriendUser & {
  friend_state: FriendState
}

export type IncomingFriendRequest = {
  id: number
  from_user_id: number
  created_at: string
  imie?: string
  nazwisko?: string
  email?: string
  zdjecie_profilowe?: string | null
}

export type OutgoingFriendRequest = {
  id: number
  to_user_id: number
  created_at: string
  imie?: string
  nazwisko?: string
  email?: string
  zdjecie_profilowe?: string | null
}

export type FriendsOverview = {
  friends: FriendUser[]
  incoming: IncomingFriendRequest[]
  outgoing: OutgoingFriendRequest[]
}

export type ProfileDetails = {
  id: number
  imie?: string
  nazwisko?: string
  email?: string
  zdjecie_profilowe?: string | null
  is_self: boolean
  is_friend: boolean
}

export type PostVisibility = 'public' | 'friends' | 'selected'

export type BoardPost = {
  id: number
  author_user_id: number
  visibility: PostVisibility
  body?: string | null
  image_path?: string | null
  created_at: string
  author_imie?: string | null
  author_nazwisko?: string | null
  author_email?: string | null
  author_avatar?: string | null
  comments_count?: number
  reactions_count?: number
  my_reaction?: string | null
  reaction_groups?: Array<{
    emoji: string
    count: number
  }>
}

export type BoardComment = {
  id: number
  post_id: number
  user_id: number
  body: string
  created_at: string
  imie?: string | null
  nazwisko?: string | null
  email?: string | null
  zdjecie_profilowe?: string | null
}

export type PostMentionNotificationItem = {
  id: number
  mention_type?: 'post' | 'comment'
  post_id: number
  comment_id?: number | null
  token: string
  created_at: string
  by_imie?: string | null
  by_nazwisko?: string | null
  by_email?: string | null
  post_body?: string | null
}

export type PostMentionNotifications = {
  unread_count: number
  items: PostMentionNotificationItem[]
}

export type MakaoOnlineInvite = {
  id: number
  from_user_id?: number
  to_user_id?: number
  created_at: string
  imie?: string
  nazwisko?: string
  email?: string
  zdjecie_profilowe?: string | null
}

export type MakaoOnlineRoom = {
  id: number
  player_one_id: number
  player_two_id: number
  status: 'active' | 'finished'
  turn_user_id?: number | null
  last_action_by_user_id?: number | null
  state_json?: Record<string, unknown> | null
  action_version: number
  created_at: string
  updated_at: string
}

export type MakaoOnlineOverview = {
  friends: FriendUser[]
  incoming: MakaoOnlineInvite[]
  outgoing: MakaoOnlineInvite[]
  active_room?: MakaoOnlineRoom | null
}

export type OptivioTaskStatus = 'ready' | 'progress' | 'review' | 'done'

export type OptivioTask = {
  id: number
  project_id: number
  title: string
  description: string
  due_date: string | null
  status: OptivioTaskStatus
  created_at: string
  taskora_sync: {
    synced: boolean
    task_id?: string | null
    last_attempt_at?: string | null
    error?: string | null
  }
}

export type OptivioProject = {
  id: number
  name: string
  description: string
  due_date: string | null
  taskora_project_id: number | null
  created_at: string
  tasks: OptivioTask[]
}

export type OptivioDeadlineEvent = {
  id: string
  date: string
  title: string
  type: 'project' | 'task'
  projectName: string
  status?: OptivioTaskStatus
}

export type OptivioOverview = {
  projectsCount: number
  tasksCount: number
  doneTasksCount: number
  syncPendingCount: number
  deadlines: OptivioDeadlineEvent[]
}

export type RoleChangeLogPerson = {
  id: number
  email: string | null
  imie: string | null
  nick: string | null
}

export type RoleChangeLogItem = {
  id: number
  old_role: string | null
  new_role: string
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  actor: RoleChangeLogPerson
  target: RoleChangeLogPerson
}

export type RoleChangeLogsResponse = {
  data: RoleChangeLogItem[]
  meta: {
    page: number
    per_page: number
    total: number
    last_page: number
  }
}

export type AdminUserListItem = {
  id: number
  email: string
  imie: string | null
  nazwisko: string | null
  nick: string | null
  rola: string
}

export type AdminUsersResponse = {
  data: AdminUserListItem[]
  meta: {
    page: number
    per_page: number
    total: number
    last_page: number
  }
}

export type AdminRoleItem = {
  key: string
  name: string
  description: string | null
  is_system: boolean
}

export type AdminRolesResponse = {
  data: AdminRoleItem[]
}

export type CreateAdminUserPayload = {
  imie: string
  email: string
  password: string
  password_confirmation: string
  nick?: string
  role?: string
}

export type CreateAdminRolePayload = {
  key: string
  name: string
  description?: string
}

export type UpdateAdminRolePayload = {
  name?: string
  description?: string
}

export type AdminAssignmentsResponse = {
  roles: AdminRoleItem[]
  apps: string[]
  panels: Record<string, string[]>
  app_assignments: Record<string, string[]>
  panel_assignments: Record<string, Record<string, string[]>>
}

export type AdminRelationType = {
  key: string
  label: string
  description: string
}

export type AdminRelationPerson = {
  id: number
  imie: string | null
  nick: string | null
  email: string | null
}

export type AdminRelationActor = {
  id: number | null
  imie: string | null
  nick: string | null
  email: string | null
}

export type AdminRelationItem = {
  id: number
  relation_type: string
  activity_scope: string | null
  notes: string | null
  created_at: string
  updated_at: string
  supervisor: AdminRelationPerson
  subordinate: AdminRelationPerson
  actor: AdminRelationActor
}

export type AdminRelationsResponse = {
  data: AdminRelationItem[]
  relation_types: AdminRelationType[]
  meta: {
    page: number
    per_page: number
    total: number
    last_page: number
  }
  warning?: string
}

export type TeacherOverviewStudent = {
  relation_id: number
  relation_type: string
  activity_scope: string | null
  notes: string | null
  updated_at: string
  student: {
    id: number
    imie: string | null
    nick: string | null
    email: string | null
    rola: string | null
  }
}

export type TeacherOverview = {
  students: TeacherOverviewStudent[]
  meta: {
    total: number
    by_type: Record<string, number>
  }
  warning?: string
}

export type CreateAdminRelationPayload = {
  supervisor_user_id: number
  subordinate_user_id: number
  relation_type: string
  activity_scope?: string
  notes?: string
}

export async function getMe(): Promise<Me> {
  const r = await api.get('/api/me')
  return r.data
}

export async function getProfileById(userId: number): Promise<ProfileDetails> {
  const r = await api.get(`/api/profile/${userId}`)
  return r.data
}

export async function login(email: string, password: string): Promise<Me> {
  // 1) zainicjuj sesję + XSRF cookie
  await api.get('/sanctum/csrf-cookie')
  // 2) wyślij login (axios dołoży X-XSRF-TOKEN)
  await api.post('/api/login', { email, password })
  // 3) pobierz usera
  return getMe()
}

export async function register(payload: {
  imie: string
  email: string
  password: string
  password_confirmation: string
}): Promise<Me> {
  await api.get('/sanctum/csrf-cookie')
  await api.post('/api/register', payload)
  return getMe()
}

export async function logout() {
  await api.post('/api/logout')
}

export async function listChatUsers(): Promise<ChatUser[]> {
  const r = await api.get('/api/chat/users')
  return r.data
}

export async function getChatThread(userId: number): Promise<ChatMessage[]> {
  const r = await api.get(`/api/chat/thread/${userId}`)
  return r.data
}

export async function sendChatMessage(toUserId: number, body: string): Promise<ChatMessage> {
  const r = await api.post('/api/chat/send', { to_user_id: toUserId, body })
  return r.data
}

export async function sendChatMessageWithImage(toUserId: number, body: string, file: File): Promise<ChatMessage> {
  const form = new FormData()
  form.append('to_user_id', String(toUserId))
  form.append('body', body)
  form.append('image', file)

  const r = await api.post('/api/chat/send', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return r.data
}

export async function getChatNotifications(): Promise<ChatNotifications> {
  const r = await api.get('/api/chat/notifications')
  return r.data
}

export async function markChatNotificationsReadFromUser(fromUserId: number): Promise<void> {
  await api.post(`/api/chat/notifications/${fromUserId}/read`)
}

export async function pingChatActivity(): Promise<void> {
  await api.post('/api/chat/activity/ping')
}

export async function setChatOffline(): Promise<void> {
  await api.post('/api/chat/activity/offline')
}

export async function listFriends(): Promise<FriendUser[]> {
  const r = await api.get('/api/friends/list')
  return r.data
}

export async function getFriendsOverview(): Promise<FriendsOverview> {
  const r = await api.get('/api/friends/overview')
  return r.data
}

export async function listIncomingFriendRequests(): Promise<IncomingFriendRequest[]> {
  const r = await api.get('/api/friends/incoming')
  return r.data
}

export async function listOutgoingFriendRequests(): Promise<OutgoingFriendRequest[]> {
  const r = await api.get('/api/friends/outgoing')
  return r.data
}

export async function searchUsersForFriendship(query: string): Promise<FriendSearchItem[]> {
  const r = await api.get('/api/friends/search', { params: { q: query } })
  return r.data
}

export async function sendFriendRequest(toUserId: number): Promise<void> {
  await api.post('/api/friends/request', { to_user_id: toUserId })
}

export async function acceptFriendRequest(requestId: number): Promise<void> {
  await api.post(`/api/friends/incoming/${requestId}/accept`)
}

export async function rejectFriendRequest(requestId: number): Promise<void> {
  await api.post(`/api/friends/incoming/${requestId}/reject`)
}

export async function cancelOutgoingFriendRequest(requestId: number): Promise<void> {
  await api.post(`/api/friends/outgoing/${requestId}/cancel`)
}

export async function getBoardFeed(): Promise<BoardPost[]> {
  const r = await api.get('/api/posts/feed')
  return r.data
}

export async function getPostAudienceFriends(): Promise<FriendUser[]> {
  const r = await api.get('/api/posts/audience/friends')
  return r.data
}

export async function createBoardPost(payload: {
  visibility: PostVisibility
  body?: string
  image?: File | null
  selectedUserIds?: number[]
}): Promise<BoardPost> {
  const form = new FormData()
  form.append('visibility', payload.visibility)
  form.append('body', payload.body || '')

  if (payload.image) {
    form.append('image', payload.image)
  }

  if (payload.visibility === 'selected' && payload.selectedUserIds?.length) {
    payload.selectedUserIds.forEach((id) => {
      form.append('selected_user_ids[]', String(id))
    })
  }

  const r = await api.post('/api/posts/create', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return r.data
}

export async function updateBoardPost(postId: number, body: string): Promise<BoardPost> {
  const r = await api.patch(`/api/posts/${postId}`, { body })
  return r.data
}

export async function deleteBoardPost(postId: number): Promise<void> {
  await api.delete(`/api/posts/${postId}`)
}

export async function getBoardComments(postId: number): Promise<BoardComment[]> {
  const r = await api.get(`/api/posts/${postId}/comments`)
  return r.data
}

export async function addBoardComment(postId: number, body: string): Promise<BoardComment> {
  const r = await api.post(`/api/posts/${postId}/comments`, { body })
  return r.data
}

export async function updateBoardComment(commentId: number, body: string): Promise<BoardComment> {
  const r = await api.patch(`/api/posts/comments/${commentId}`, { body })
  return r.data
}

export async function deleteBoardComment(commentId: number): Promise<void> {
  await api.delete(`/api/posts/comments/${commentId}`)
}

export async function setBoardReaction(postId: number, emoji: string | null): Promise<void> {
  await api.post(`/api/posts/${postId}/reactions`, { emoji: emoji || '' })
}

export async function getPostMentionNotifications(): Promise<PostMentionNotifications> {
  const r = await api.get('/api/posts/notifications/mentions')
  return r.data
}

export async function markPostMentionsReadAll(): Promise<void> {
  await api.post('/api/posts/notifications/mentions/read-all')
}

export async function getMakaoOnlineOverview(): Promise<MakaoOnlineOverview> {
  const r = await api.get('/api/makao-online/overview')
  return r.data
}

export async function sendMakaoInvite(friendUserId: number): Promise<void> {
  await api.post('/api/makao-online/invite', { friend_user_id: friendUserId })
}

export async function acceptMakaoInvite(inviteId: number): Promise<MakaoOnlineRoom> {
  const r = await api.post(`/api/makao-online/incoming/${inviteId}/accept`)
  return r.data
}

export async function rejectMakaoInvite(inviteId: number): Promise<void> {
  await api.post(`/api/makao-online/incoming/${inviteId}/reject`)
}

export async function cancelMakaoInvite(inviteId: number): Promise<void> {
  await api.post(`/api/makao-online/outgoing/${inviteId}/cancel`)
}

export async function getMakaoRoom(roomId: number): Promise<MakaoOnlineRoom> {
  const r = await api.get(`/api/makao-online/room/${roomId}`)
  return r.data
}

export async function syncMakaoRoomState(payload: {
  roomId: number
  state: Record<string, unknown>
  turnUserId: number
  actionVersion: number
  winnerUserId?: number | null
}): Promise<MakaoOnlineRoom> {
  const r = await api.post(`/api/makao-online/room/${payload.roomId}/sync`, {
    state: payload.state,
    turn_user_id: payload.turnUserId,
    action_version: payload.actionVersion,
    winner_user_id: payload.winnerUserId || null,
  })
  return r.data
}

export async function leaveMakaoRoom(roomId: number): Promise<void> {
  await api.post(`/api/makao-online/room/${roomId}/leave`)
}

export async function listOptivioProjects(): Promise<OptivioProject[]> {
  const r = await api.get('/api/optivio/projects')
  return r.data
}

export async function createOptivioProject(payload: {
  name: string
  description?: string
  dueDate?: string | null
}): Promise<OptivioProject> {
  const r = await api.post('/api/optivio/projects', {
    name: payload.name,
    description: payload.description || '',
    due_date: payload.dueDate || null,
  })
  return r.data
}

export async function createOptivioTask(
  projectId: number,
  payload: { title: string; description?: string; dueDate?: string | null; status?: OptivioTaskStatus },
): Promise<OptivioTask> {
  const r = await api.post(`/api/optivio/projects/${projectId}/tasks`, {
    title: payload.title,
    description: payload.description || '',
    due_date: payload.dueDate || null,
    status: payload.status || 'ready',
  })
  return r.data
}

export async function linkOptivioProjectToTaskora(projectId: number, taskoraProjectId: number): Promise<OptivioProject> {
  const r = await api.patch(`/api/optivio/projects/${projectId}/taskora-link`, {
    taskora_project_id: taskoraProjectId,
  })
  return r.data
}

export async function updateOptivioTaskStatus(
  projectId: number,
  taskId: number,
  status: OptivioTaskStatus,
): Promise<OptivioTask> {
  const r = await api.patch(`/api/optivio/projects/${projectId}/tasks/${taskId}/status`, {
    status,
  })
  return r.data
}

export async function updateOptivioTaskoraSync(
  projectId: number,
  taskId: number,
  payload: { synced: boolean; taskId?: string; error?: string },
): Promise<OptivioTask> {
  const r = await api.patch(`/api/optivio/projects/${projectId}/tasks/${taskId}/taskora-sync`, {
    synced: payload.synced,
    task_id: payload.taskId || null,
    error: payload.error || null,
  })
  return r.data
}

export async function getOptivioOverview(): Promise<OptivioOverview> {
  const r = await api.get('/api/optivio/overview')
  return r.data
}

export async function listAdminRoleChangeLogs(params?: {
  page?: number
  perPage?: number
  actorUserId?: number
  targetUserId?: number
  newRole?: string
}): Promise<RoleChangeLogsResponse> {
  const r = await api.get('/api/admin/role-change-logs', {
    params: {
      page: params?.page,
      per_page: params?.perPage,
      actor_user_id: params?.actorUserId,
      target_user_id: params?.targetUserId,
      new_role: params?.newRole,
    },
  })
  return r.data
}

export async function listAdminUsers(params?: {
  page?: number
  perPage?: number
  q?: string
  role?: string
}): Promise<AdminUsersResponse> {
  const r = await api.get('/api/admin/users', {
    params: {
      page: params?.page,
      per_page: params?.perPage,
      q: params?.q,
      role: params?.role,
    },
  })
  return r.data
}

export async function listAdminRoles(): Promise<AdminRolesResponse> {
  const r = await api.get('/api/admin/roles')
  return r.data
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<void> {
  await api.post('/api/admin/users', payload)
}

export async function createAdminRole(payload: CreateAdminRolePayload): Promise<void> {
  await api.post('/api/admin/roles', payload)
}

export async function updateAdminRole(key: string, payload: UpdateAdminRolePayload): Promise<void> {
  await api.patch(`/api/admin/roles/${encodeURIComponent(key)}`, payload)
}

export async function deleteAdminRole(key: string): Promise<void> {
  await api.delete(`/api/admin/roles/${encodeURIComponent(key)}`)
}

export async function getAdminAssignments(): Promise<AdminAssignmentsResponse> {
  const r = await api.get('/api/admin/assignments')
  return r.data
}

export async function updateAdminRoleApps(key: string, apps: string[]): Promise<void> {
  await api.patch(`/api/admin/roles/${encodeURIComponent(key)}/app-assignments`, { apps })
}

export async function updateAdminRolePanels(key: string, panels: Record<string, string[]>): Promise<void> {
  await api.patch(`/api/admin/roles/${encodeURIComponent(key)}/panel-assignments`, { panels })
}

export async function listAdminRelations(params?: {
  page?: number
  perPage?: number
  relationType?: string
  q?: string
}): Promise<AdminRelationsResponse> {
  const r = await api.get('/api/admin/relations', {
    params: {
      page: params?.page,
      per_page: params?.perPage,
      relation_type: params?.relationType,
      q: params?.q,
    },
  })
  return r.data
}

export async function createAdminRelation(payload: CreateAdminRelationPayload): Promise<void> {
  await api.post('/api/admin/relations', payload)
}

export async function deleteAdminRelation(relationId: number): Promise<void> {
  await api.delete(`/api/admin/relations/${relationId}`)
}

export async function getTeacherOverview(): Promise<TeacherOverview> {
  const r = await api.get('/api/teacher/overview')
  return r.data
}

export async function listAdminUserRoleHistory(
  userId: number,
  params?: { page?: number; perPage?: number },
): Promise<RoleChangeLogsResponse> {
  const r = await api.get(`/api/admin/users/${userId}/role-history`, {
    params: {
      page: params?.page,
      per_page: params?.perPage,
    },
  })
  return r.data
}

export async function updateAdminUserRole(userId: number, role: string, reason?: string): Promise<void> {
  await api.patch(`/api/admin/users/${userId}/role`, {
    role,
    reason: reason || null,
  })
}
