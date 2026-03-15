import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import OrbitumCalendar from '@/pages/OrbitumCalendar'
import News from '@/pages/News'
import Markets from '@/pages/Markets'
import Messages from '@/pages/Messages'
import Friends from '@/pages/Friends'
import Board from '@/pages/Board'
import Makao from '@/pages/Makao'
import Neuronetix from '@/pages/Neuronetix'
import TeacherPanel from '@/pages/TeacherPanel'
import StudentPanel from '@/pages/StudentPanel'
import AdminDashboard from '@/pages/AdminDashboard'
import AdminUsers from '@/pages/AdminUsers'
import AdminRoles from '@/pages/AdminRoles'
import AdminAssignments from '@/pages/AdminAssignments'
import AdminRelations from '@/pages/AdminRelations'
import Taskora from '@/pages/Taskora'
import Optivio from '@/pages/Optivio'
import TaskoraDashboard from '@/pages/TaskoraDashboard'
import TaskoraProjects from '@/pages/TaskoraProjects'
import OptivioDashboard from '@/pages/OptivioDashboard'
import ChicPlanner from '@/pages/ChicPlanner'
import Docs from '@/pages/Docs'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Profile from '@/pages/Profile'
import EditProfile from '@/pages/EditProfile'
import Settings from '@/pages/Settings'
import AccountSettings from '@/pages/AccountSettings'
import AppScopedModule from '@/pages/AppScopedModule'

// komponent chroniący dostęp do podstron wymagających zalogowania

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Ładowanie…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminOnly({ children, requiredPanel }: { children: JSX.Element; requiredPanel?: string }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Ładowanie…</div>

  const role = (user?.rola || '').toLowerCase()
  if (role !== 'admin' && role !== 'owner') {
    return <Navigate to="/dashboard" replace />
  }

  const apps = user?.access?.apps || []
  const adminPanels = user?.access?.panels?.admin || []
  if (requiredPanel && apps.length > 0) {
    const hasAdminApp = apps.includes('admin')
    const hasPanel = adminPanels.includes(requiredPanel)
    if (!hasAdminApp || !hasPanel) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

function AppPanelOnly({
  children,
  app,
  panel,
  allowedRoles,
}: {
  children: JSX.Element
  app: string
  panel: string
  allowedRoles: string[]
}) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Ładowanie…</div>

  const role = (user?.rola || '').toLowerCase()
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  const apps = user?.access?.apps || []
  const appPanels = user?.access?.panels?.[app] || []
  if (apps.length > 0) {
    const hasApp = apps.includes(app)
    const hasPanel = appPanels.includes(panel)
    if (!hasApp || !hasPanel) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/:userId" element={<Profile />} />
        <Route path="profile/edit" element={<EditProfile />} />
        <Route path="settings" element={<AccountSettings />} />
        <Route path="sidebar-settings" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calendar" element={<OrbitumCalendar />} />
        <Route path="news" element={<News />} />
        <Route path="markets" element={<Markets />} />
        <Route path="messages" element={<Messages />} />
        <Route path="friends" element={<Friends />} />
        <Route path="board" element={<Board />} />
        <Route path="makao" element={<Makao />} />
        <Route path="neuronetix" element={<Navigate to="/neuronetix/dashboard" replace />} />
        <Route path="neuronetix/dashboard" element={<Neuronetix />} />
        <Route path="neuronetix/messages" element={<AppScopedModule appLabel="Neuronetix" moduleLabel="Wiadomosci" />} />
        <Route path="neuronetix/friends" element={<AppScopedModule appLabel="Neuronetix" moduleLabel="Znajomi" />} />
        <Route
          path="neuronetix/teacher"
          element={
            <AppPanelOnly app="neuronetix" panel="teacher" allowedRoles={['nauczyciel', 'admin', 'owner']}>
              <TeacherPanel />
            </AppPanelOnly>
          }
        />
        <Route
          path="neuronetix/student"
          element={
            <AppPanelOnly app="neuronetix" panel="student" allowedRoles={['uczen', 'student', 'admin', 'owner']}>
              <StudentPanel />
            </AppPanelOnly>
          }
        />
        <Route path="neuronetix/docs" element={<Docs />} />

        <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="admin/dashboard"
          element={
            <AdminOnly requiredPanel="dashboard">
              <AdminDashboard />
            </AdminOnly>
          }
        />
        <Route
          path="admin/users"
          element={
            <AdminOnly requiredPanel="users">
              <AdminUsers />
            </AdminOnly>
          }
        />
        <Route
          path="admin/roles"
          element={
            <AdminOnly requiredPanel="roles">
              <AdminRoles />
            </AdminOnly>
          }
        />
        <Route
          path="admin/assignments"
          element={
            <AdminOnly requiredPanel="assignments">
              <AdminAssignments />
            </AdminOnly>
          }
        />
        <Route
          path="admin/relations"
          element={
            <AdminOnly requiredPanel="relations">
              <AdminRelations />
            </AdminOnly>
          }
        />
        <Route
          path="admin/docs"
          element={
            <AdminOnly requiredPanel="docs">
              <Docs />
            </AdminOnly>
          }
        />
        <Route
          path="admin/sidebar-settings"
          element={
            <AdminOnly requiredPanel="sidebar_settings">
              <Settings />
            </AdminOnly>
          }
        />

        <Route path="taskora" element={<Navigate to="/taskora/dashboard" replace />} />
        <Route path="taskora/dashboard" element={<TaskoraDashboard />} />
        <Route path="taskora/projects" element={<TaskoraProjects />} />
        <Route path="taskora/board" element={<Taskora />} />
        <Route path="taskora/messages" element={<Messages />} />
        <Route path="taskora/friends" element={<Friends />} />
        <Route path="taskora/docs" element={<Docs />} />

        <Route path="optivio" element={<Navigate to="/optivio/dashboard" replace />} />
        <Route path="optivio/dashboard" element={<OptivioDashboard />} />
        <Route path="optivio/projects" element={<Optivio />} />
        <Route path="optivio/messages" element={<Messages />} />
        <Route path="optivio/friends" element={<Friends />} />
        <Route path="optivio/docs" element={<Docs />} />

        <Route path="chic" element={<Navigate to="/grafiki/dashboard" replace />} />
        <Route path="chic/*" element={<Navigate to="/grafiki/dashboard" replace />} />

        <Route path="grafiki" element={<Navigate to="/grafiki/dashboard" replace />} />
        <Route path="grafiki/dashboard" element={<ChicPlanner module="dashboard" />} />
        <Route path="grafiki/week" element={<ChicPlanner module="week" />} />
        <Route path="grafiki/month" element={<ChicPlanner module="month" />} />
        <Route path="grafiki/summary" element={<ChicPlanner module="summary" />} />
        <Route path="grafiki/workplan" element={<ChicPlanner module="workplan" />} />
        <Route path="grafiki/messages" element={<ChicPlanner module="work" />} />
        <Route path="grafiki/friends" element={<ChicPlanner module="advisors" />} />
        <Route path="grafiki/docs" element={<ChicPlanner module="locations" />} />
        <Route path="docs" element={<Docs />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}


