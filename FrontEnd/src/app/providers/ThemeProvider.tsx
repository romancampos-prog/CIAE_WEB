// react
import { createContext, useSyncExternalStore, type ReactNode } from 'react';
// propios
import { alternarTema, suscribirTema, temaActual, type Tema } from '@/utils/tema';

export interface ValorTema {
  tema: Tema;
  esOscuro: boolean;
  alternarTema: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const TemaContext = createContext<ValorTema | null>(null);

/**
 * Tema actual ('light' | 'dark') leído de <html data-theme>. Va en su propio contexto para que
 * alternar el tema solo vuelva a pintar a quien lo usa (gráficas, mapa, botón), no a toda la app.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const tema = useSyncExternalStore(suscribirTema, temaActual, (): Tema => 'light');
  return (
    <TemaContext.Provider value={{ tema, esOscuro: tema === 'dark', alternarTema }}>
      {children}
    </TemaContext.Provider>
  );
}
