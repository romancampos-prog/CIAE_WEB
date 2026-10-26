// react
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// propios
import { AppProvider } from '@/app/providers/AppProvider';
import AppRoutes from '@/app/routes/AppRoutes';
import { seguirTemaDelSistema } from '@/utils/tema';
import './styles/tema.css';
import './index.css';

seguirTemaDelSistema();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  </StrictMode>
);
