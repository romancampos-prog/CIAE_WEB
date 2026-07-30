// react
import { Routes, Route } from 'react-router-dom'
// propios
import HubIndicadoresMedicos from '../ftp/paginas/FTPPage'
import GraficasUnificadas    from '../ftp/paginas/GraficasUnificadasPage'
import GenerarHub            from '../ftp/paginas/GenerarHub'
import FTPRoutes             from '../ftp/routes/FTPRoutes'
import IAASRoutes            from '../iaas/routes/IAASRoutes'
import GraficaRoutes         from '../reportes_grafica/routes/GraficaRoutes'
import RoleRoute             from '../../auth/componentes/RoleRoute'

// Visitante solo puede ver gráficas -- generar (FTP/IAAS) queda bloqueado
// a nivel de ruta, no solo oculto en la tarjeta, para que tampoco se
// pueda entrar escribiendo la URL directamente.
const ROLES_GENERAR = ['admin', 'trabajador_ftp', 'trabajador_IAAS']

export default function IndicadoresRoutes() {
  return (
    <Routes>
      <Route index           element={<HubIndicadoresMedicos />} />
      <Route path="Graficas" element={<GraficasUnificadas />} />
      <Route path="Generar"  element={<RoleRoute roles={ROLES_GENERAR}><GenerarHub /></RoleRoute>} />
      <Route path="FTP/*"    element={<RoleRoute roles={ROLES_GENERAR}><FTPRoutes /></RoleRoute>} />
      <Route path="IAAS/*"   element={<RoleRoute roles={ROLES_GENERAR}><IAASRoutes /></RoleRoute>} />
      <Route path="Grafica/*" element={<GraficaRoutes />} />
    </Routes>
  )
}
