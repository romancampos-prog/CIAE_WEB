import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import DengueHeader from './Header';
import DengueSidebar from './Sidebar';
// propios
import { IconoMenu } from '@/components/icons';
import '@/styles/epidemiologia.css';
import './dengue.css';

/**
 * Layout raíz del módulo Epidemiología.
 * Combina el topbar, el sidebar colapsable y el Outlet de React Router.
 *
 * En mobile (ver media query en epi.css) el sidebar deja de reservar ancho
 * de forma permanente: colapsado queda oculto del todo y aparece un botón
 * flotante para abrirlo; abierto se despliega como overlay sobre el
 * contenido (con backdrop), en vez de apachurrarlo. Arranca colapsado en
 * pantallas angostas. Desktop no cambia (riel colapsable de siempre).
 */
export default function DengueLayout() {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  )

  return (
    <div className="epi-root">
      <div className="epi-blob epi-blob-1" />
      <div className="epi-blob epi-blob-2" />
      <div className="epi-blob epi-blob-3" />
      <div className="epi-grid" />

      <DengueHeader />

      <div className="epi-body">
        {collapsed && (
          <button
            type="button"
            className="epi-sidebar-fab"
            onClick={() => setCollapsed(false)}
            aria-label="Abrir módulos"
          >
            <IconoMenu />
          </button>
        )}
        {!collapsed && (
          <div className="epi-sidebar-backdrop" onClick={() => setCollapsed(true)} />
        )}
        <DengueSidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        <main className={`epi-main${collapsed ? ' epi-main--expanded' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
