import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '@auth/context/AuthContext';
import Inicio from '@shared/pages/inicio/Inicio';
import Login from '@auth/pages/Auth';
import Footer from '@shared/components/Footer';
import ProtectedRoute from '@auth/components/RouteProtected';
import RoleRoute from '@auth/components/RoleRoute';
import EditInfo from '@reportes/pages/editInfo';
import ConfiguracionReporte from '@reportes/pages/ConfigPage';
import ReporteRestricciones from '@shared/pages/restricciones/Restriciones';
import GraficaIndicador from '@reportes/pages/pageGraficas';
// Indicadores Médicos — hub
import HubIndicadoresMedicos from '@ftp/pages/FTPPage';
// Indicadores Médicos — sección FTP
import FTPMenu from '@ftp/pages/FTPLanding';
import FTPGenerar from '@ftp/pages/IndicadoresPage';
import FTPGraficas from '@ftp/pages/FTPGraficasPage';
// Indicadores Médicos — sección IN_ASS
import INASSMenu from '@inass/pages/INASSLanding';
import INASSReporte from '@inass/pages/INASSPage';
import INASSDatos from '@inass/pages/INASSGraficasPage';
// Epidemiología
import Epidemiologia from '@epi/pages/EpidemiologiaApp';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  </ProtectedRoute>
);

export default function AppRouter() {
  return (
    <AuthProvider>
      <Router>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }}>
          <Routes>
            <Route path="CIAE/LOGIN" element={<Login />} />

            <Route element={<ProtectedLayout />}>

              {/* Inicio — redirige trabajador_IAAS y ftp a su sección */}
              <Route path="CIAE/Inicio" element={

                  <Inicio />

              } />

              {/* Reportes — solo admin y visor */}
              <Route path="CIAE/config" element={

                  <ConfiguracionReporte />
           
              } />
              <Route path="CIAE/restricciones" element={
               
                  <ReporteRestricciones />
               
              } />
              <Route path="CIAE/graficas" element={
                
                  <GraficaIndicador />
               
              } />
              <Route path="CIAE/EditInfo" element={
                
                  <EditInfo />
             
              } />

              {/* Indicadores Médicos — hub */}
              <Route path="CIAE/IndicadoresMedicos" element={
              
                  <HubIndicadoresMedicos />
           
              } />

              {/* Indicadores Médicos — FTP (admin, visor, ftp) */}
              <Route path="CIAE/IndicadoresMedicos/FTP" element={
             
                  <FTPMenu />
            
              } />
              <Route path="CIAE/IndicadoresMedicos/FTP/Generar" element={
          
                  <FTPGenerar />
          
              } />
              <Route path="CIAE/IndicadoresMedicos/FTP/Graficas" element={
              
                  <FTPGraficas />
          
              } />

              {/* Indicadores Médicos — IN_ASS (admin, visor, trabajador_IAAS) */}
              <Route path="CIAE/IndicadoresMedicos/INASS" element={
               
                  <INASSMenu />
           
              } />
              <Route path="CIAE/IndicadoresMedicos/INASS/Reporte" element={
               
                  <INASSReporte />
              
              } />
              <Route path="CIAE/IndicadoresMedicos/INASS/Datos" element={
               
                  <INASSDatos />
             
              } />

              {/* Epidemiología — solo admin */}
              <Route path="CIAE/Epidemiologia/*" element={
                <RoleRoute roles={['admin']}>
                  <Epidemiologia />
                </RoleRoute>
              } />

            </Route>

            <Route path="*" element={<Navigate to="/CIAE/LOGIN" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}