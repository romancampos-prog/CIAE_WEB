// react
import { Routes, Route } from 'react-router-dom'
// propios
import HubIndicadoresMedicos from '../ftp/paginas/FTPPage'
import GraficasUnificadas    from '../ftp/paginas/GraficasUnificadasPage'
import GenerarHub            from '../ftp/paginas/GenerarHub'
import FTPRoutes             from '../ftp/routes/FTPRoutes'
import IAASRoutes            from '../iaas/routes/IAASRoutes'
import GraficaRoutes         from '../reportes_grafica/routes/GraficaRoutes'

export default function IndicadoresRoutes() {
  return (
    <Routes>
      <Route index           element={<HubIndicadoresMedicos />} />
      <Route path="Graficas" element={<GraficasUnificadas />} />
      <Route path="Generar"  element={<GenerarHub />} />
      <Route path="FTP/*"    element={<FTPRoutes />} />
      <Route path="IAAS/*"   element={<IAASRoutes />} />
      <Route path="Grafica/*" element={<GraficaRoutes />} />
    </Routes>
  )
}
