// react
import { Routes, Route } from 'react-router-dom'
// propios
import IAASMenu    from '../paginas/IAASLanding'
import IAASReporte from '../paginas/IAASPage'

export default function IAASRoutes() {
  return (
    <Routes>
      <Route index          element={<IAASMenu />} />
      <Route path="Reporte" element={<IAASReporte />} />
    </Routes>
  )
}
