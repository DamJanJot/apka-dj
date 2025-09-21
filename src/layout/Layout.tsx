// dj/src/layout/Layout.tsx
import { Outlet } from 'react-router-dom'
import Topbar from '@/components/Topbar'
import Sidebar from '@/components/Sidebar'

export default function Layout() {
  return (
    <div className="layout">
      {/* Sidebar renderuje <aside id="sidebar" className="sidebar" /> wewnątrz siebie */}
      <Sidebar />

      <div className="main">
        <Topbar />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
