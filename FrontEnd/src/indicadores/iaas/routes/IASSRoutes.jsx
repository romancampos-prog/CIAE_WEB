// react
import { Routes, Route } from 'react-router-dom'
// propios
import IASSMenu    from '../paginas/IASSLanding'
import IASSReporte from '../paginas/IASSPage'

export default function IASSRoutes() {
  return (
    <Routes>
      <Route index          element={<IASSMenu />} />
      <Route path="Reporte" element={<IASSReporte />} />
    </Routes>
  )
}
