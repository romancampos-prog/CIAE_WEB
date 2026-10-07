// react
import { useSyncExternalStore } from 'react';

// propios
import { alternarTema, suscribirTema, temaActual } from '../utils/tema';

/**
 * Tema actual ('light' | 'dark') leído de <html data-theme>.
 * Los componentes que pintan colores por JS (gráficas, mapa) lo usan para
 * volver a renderizar cuando el usuario alterna el tema.
 */
export default function useTema() {
  const tema = useSyncExternalStore(suscribirTema, temaActual, () => 'light');
  return { tema, esOscuro: tema === 'dark', alternarTema };
}
