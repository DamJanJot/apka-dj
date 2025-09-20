import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import News from '@/pages/News'
import Markets from '@/pages/Markets'
import Docs from '@/pages/Docs'
import Login from '@/pages/Login'
// import { ImportIcon } from 'lucidereact' 



function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 24 }}>Ładowanie…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
   <Routes> 
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="news" element={<News />} />
        <Route path="markets" element={<Markets />} />
        <Route path="docs" element={<Docs />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}


// return (
//   <div className="layout">
//     <Sidebar />
//     <div className="main">
//       <Topbar />
//       <div className="content">
//         <Routes>
//           <Route path="/" element={<Navigate to="/dashboard" replace />} />
//           <Route path="/dashboard" element={<Dashboard />} />
//           <Route path="/news" element={<News />} />
//           <Route path="/markets" element={<Markets />} />
//           <Route path="/docs" element={<Docs />} />
//         </Routes>
//       </div>
//     </div>
//   </div>
// )    