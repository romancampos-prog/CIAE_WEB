import { Routes, Route } from 'react-router-dom'
import DengueLayout from '../../componentes/epidemiologia/layout/Layout'
import CargaPage from './CargaPage'
import CanalPage from './CanalPage'
import MapaPage from './MapaPage'
import AlertasSiscepPage from './AlertasSiscepPage'
import DuplicadosPage from './DuplicadosPage'
import '../../styles/dengue.css'

export default function EpidemiologiaApp() {
  return (
    <Routes>
      <Route element={<DengueLayout />}>
        <Route index element={<CargaPage />} />
        <Route path="canal" element={<CanalPage />} />
        <Route path="mapa/:tipo" element={<MapaPage />} />
        <Route path="alertas" element={<AlertasSiscepPage />} />
        <Route path="duplicados" element={<DuplicadosPage />} />
      </Route>
    </Routes>
  )
}
