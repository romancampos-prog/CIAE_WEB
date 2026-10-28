// react
import { Navigate, Route, Routes } from 'react-router-dom';
// propios
import type { Rol } from '@/types/api/auth';
import { DengueLayout, PipelineProvider } from '@/features/dengue';
import AuthLayout                   from '@/app/layouts/AuthLayout';
import MainLayout                   from '@/app/layouts/MainLayout';
import ProtectedRoute               from './ProtectedRoute';
import LoginPagina                  from '@/pages/login/LoginPagina';
import InicioPagina                 from '@/pages/inicio/InicioPagina';
import HubIndicadoresPagina         from '@/pages/indicadores/HubIndicadoresPagina';
import GenerarHubPagina             from '@/pages/indicadores/GenerarHubPagina';
import GraficasPagina               from '@/pages/indicadores/GraficasPagina';
import MenuFtpPagina                from '@/pages/indicadores/ftp/MenuFtpPagina';
import GenerarFtpPagina             from '@/pages/indicadores/ftp/GenerarFtpPagina';
import MenuIaasPagina               from '@/pages/indicadores/iaas/MenuIaasPagina';
import GenerarIaasPagina            from '@/pages/indicadores/iaas/GenerarIaasPagina';
import GenerarExtractorPagina       from '@/pages/indicadores/extractor/GenerarExtractorPagina';
import PortadaEpidemiologiaPagina   from '@/pages/epidemiologia/PortadaEpidemiologiaPagina';
import CargaPagina                  from '@/pages/epidemiologia/dengue/CargaPagina';
import CanalPagina                  from '@/pages/epidemiologia/dengue/CanalPagina';
import MapaPagina                   from '@/pages/epidemiologia/dengue/MapaPagina';
import AlertasSiscepPagina          from '@/pages/epidemiologia/dengue/AlertasSiscepPagina';
import DuplicadosPagina             from '@/pages/epidemiologia/dengue/DuplicadosPagina';
import AccionesPagina               from '@/pages/epidemiologia/acciones/AccionesPagina';

// Visitante solo puede ver gráficas: generar (FTP/IAAS/Extractor) queda bloqueado por ruta.
const ROLES_GENERAR: Rol[] = ['admin', 'trabajador_ftp', 'trabajador_IAAS'];
const ROLES_EPIDEMIOLOGIA: Rol[] = ['admin', 'unidad'];

/** Todas las rutas de la aplicación en un solo lugar. */
export default function AppRoutes() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="CIAE/LOGIN" element={<LoginPagina />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="CIAE/Inicio" element={<InicioPagina />} />

            {/* Indicadores Médicos (FTP, IAAS, Extractor y gráficas) */}
            <Route path="CIAE/IndicadoresMedicos">
              <Route index           element={<HubIndicadoresPagina />} />
              <Route path="Graficas" element={<GraficasPagina />} />
              <Route element={<ProtectedRoute roles={ROLES_GENERAR} />}>
                <Route path="Generar"           element={<GenerarHubPagina />} />
                <Route path="FTP"               element={<MenuFtpPagina />} />
                <Route path="FTP/Generar"       element={<GenerarFtpPagina />} />
                <Route path="IAAS"              element={<MenuIaasPagina />} />
                <Route path="IAAS/Reporte"      element={<GenerarIaasPagina />} />
                <Route path="Extractor"         element={<GenerarExtractorPagina />} />
                <Route path="Extractor/Generar" element={<GenerarExtractorPagina />} />
              </Route>
            </Route>

            {/* Epidemiología: portada y Acciones también para el usuario de unidad (el back solo le manda
                sus filas); Dengue solo admin, incluso por URL directa */}
            <Route path="CIAE/Epidemiologia">
              <Route element={<ProtectedRoute roles={ROLES_EPIDEMIOLOGIA} />}>
                <Route index           element={<PortadaEpidemiologiaPagina />} />
                <Route path="acciones" element={<AccionesPagina />} />
              </Route>
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="dengue" element={<PipelineProvider><DengueLayout /></PipelineProvider>}>
                  <Route index             element={<CargaPagina />} />
                  <Route path="canal"      element={<CanalPagina />} />
                  <Route path="mapa/:tipo" element={<MapaPagina />} />
                  <Route path="alertas"    element={<AlertasSiscepPagina />} />
                  <Route path="duplicados" element={<DuplicadosPagina />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/CIAE/LOGIN" replace />} />
      </Routes>
    </div>
  );
}
