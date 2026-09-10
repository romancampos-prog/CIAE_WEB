// react
import { Routes, Route } from 'react-router-dom'
// propios
import ExtractorGenerar  from '../paginas/ExtractorPage'

// Extractor solo tiene un destino (subir meses), a diferencia de FTP/IAAS que
// tienen "ver datos" + "nuevo reporte" -- no hace falta una landing de por medio.
export default function ExtractorRoutes() {
  return (
    <Routes>
      <Route index          element={<ExtractorGenerar />} />
      <Route path="Generar" element={<ExtractorGenerar />} />
    </Routes>
  )
}
