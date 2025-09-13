// dj/src/layout/Layout.tsx
import { Outlet } from 'react-router-dom'
import Topbar from '@/components/Topbar'

export default function Layout() {
  return (
    <div className="app">
      {/* ważne: id="sidebar" – Topbar tego szuka przy zwijaniu */}
      <aside id="sidebar" className="sidebar">{/* tutaj masz swój Sidebar */}</aside>

      <main className="content">
        <Topbar />
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
