// dj/src/layout/Layout.tsx
// import { Outlet } from 'react-router-dom'
// import Topbar from '@/components/Topbar'
// import Sidebar from '@/components/Sidebar'

// export default function Layout() {
//   return (
//     <div className="app"><Topbar />
//       {/* ważne: id="sidebar" – Topbar tego szuka przy zwijaniu */}
//       <aside id="sidebar" className="sidebar"><Sidebar /></aside>

//       <main className="content">
        
//         <div className="page">
//           <Outlet />
//         </div>
//       </main>
//     </div>
//   )
// }


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
