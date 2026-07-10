import { Routes, Route } from 'react-router-dom'
import { PipelineProvider } from '../contexto/PipelineContext'
import DengueLayout from '../componentes/plantilla/Layout'
import EpiLandingPage from './EpiLandingPage'
import CargaPage from './CargaPage'
import CanalPage from './CanalPage'
import MapaPage from './MapaPage'
import AlertasSiscepPage from './AlertasSiscepPage'
import DuplicadosPage from './DuplicadosPage'
import '../epi.css';
import '../dengue.css';

/**
 * Punto de entrada del módulo Epidemiología.
 * El índice muestra la landing de selección de enfermedad.
 * Las rutas de dengue viven bajo /dengue para dar espacio a futuros sub-módulos.
 */
export default function EpidemiologiaApp() {
  return (
    <PipelineProvider>
      <Routes>
        <Route index element={<EpiLandingPage />} />
        <Route path="dengue" element={<DengueLayout />}>
          <Route index element={<CargaPage />} />
          <Route path="canal" element={<CanalPage />} />
          <Route path="mapa/:tipo" element={<MapaPage />} />
          <Route path="alertas" element={<AlertasSiscepPage />} />
          <Route path="duplicados" element={<DuplicadosPage />} />
        </Route>
      </Routes>
    </PipelineProvider>
  )
}
