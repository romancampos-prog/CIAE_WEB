import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '@auth/contexto/AuthContext';
import Inicio from '@paginas/inicio/Inicio';
import Login from '@auth/paginas/Auth';
import Footer from '@shared/componentes/Footer';
import ProtectedRoute from '@auth/componentes/RouteProtected';
import IndicadoresRoutes from '@ftp/routes/IndicadoresRoutes';
import EpiRoutes from '@epi/routes/EpiRoutes';

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
              <Route path="CIAE/Inicio" element={<Inicio />} />
              <Route path="CIAE/IndicadoresMedicos/*" element={<IndicadoresRoutes />} /> {/* Módulo Indicadores Médicos (FTP + IAAS) */}
              <Route path="CIAE/Epidemiologia/*" element={<EpiRoutes />} /> {/* Módulo Epidemiología */}
            </Route>

            <Route path="*" element={<Navigate to="/CIAE/LOGIN" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}
