// react
import { Outlet } from 'react-router-dom';
// propios
import Footer from '@/components/Footer';

/** Pantallas con sesión: el contenido de la ruta arriba y el Footer abajo. */
export default function MainLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
