// propios
import type { Desempeno } from '@/types/api/indicadores/reportes';

// Variables CSS del tema (src/styles/tema.css): siguen solas al modo
// claro/oscuro en style={{}}, variables --status y clases.
export const COLOR_SEMAFORO: Record<Desempeno, string> = {
  Esperado: 'var(--semaforo-esperado)',
  Medio:    'var(--semaforo-medio)',
  Bajo:     'var(--semaforo-bajo)',
  Gris:     'var(--semaforo-gris)',
};
