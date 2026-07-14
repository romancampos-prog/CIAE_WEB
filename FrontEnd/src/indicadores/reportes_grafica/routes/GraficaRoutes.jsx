// react
import { Routes, Route } from 'react-router-dom'
// propios
import ConfiguracionReporte from '../paginas/ConfigPage'
import GraficaReporte       from '../paginas/pageGraficas'
import ReporteRestricciones from '../../../paginas/restricciones/Restriciones'

export default function GraficaRoutes() {
  return (
    <Routes>
      <Route path="Config"        element={<ConfiguracionReporte />} />
      <Route path="GraficaReporte" element={<GraficaReporte />} />
      <Route path="Restricciones" element={<ReporteRestricciones />} />
    </Routes>
  )
}
