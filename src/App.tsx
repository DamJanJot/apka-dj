import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'

import Layout from '@/layout/Layout' // Twój układ z Sidebar + Topbar


import Dashboard from '@/pages/Dashboard'
import News from '@/pages/News'
import Markets from '@/pages/Markets'
import Docs from '@/pages/Docs'
import Login from '@/pages/Login'

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="content">Ładowanie…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App(){
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>} />
          <Route element={
            <Protected>
              <Layout />
            </Protected>
          }>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/news" element={<News />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/docs" element={<Docs />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

