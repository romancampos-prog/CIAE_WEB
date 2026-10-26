// react
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// propios
import { AuthProvider } from '@/features/auth';
import { ThemeProvider } from './ThemeProvider';

// Los datos de indicadores solo cambian cuando alguien genera: no se vuelven a pedir
// al regresar a la pestaña ni se reintentan (un 401/403 no se arregla reintentando).
const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false },
  },
});

/** Todos los providers globales en un solo lugar (main.tsx no anida nada). */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
