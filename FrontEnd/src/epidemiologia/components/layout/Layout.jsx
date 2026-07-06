import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import DengueHeader from './Header'
import DengueSidebar from './Sidebar'

export default function DengueLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="epi-root">
      <div className="epi-blob epi-blob-1" />
      <div className="epi-blob epi-blob-2" />
      <div className="epi-blob epi-blob-3" />
      <div className="epi-grid" />

      <DengueHeader />

      <div className="epi-body">
        <DengueSidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        <main className={`epi-main${collapsed ? ' epi-main--expanded' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
