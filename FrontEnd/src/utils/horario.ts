// propios
import type { PeriodoDelDia } from '@/types/pantallas/tema';

const SALUDOS: Record<PeriodoDelDia, string> = {
  day:       'Buenos días',
  afternoon: 'Buenas tardes',
  night:     'Buenas noches',
};

/**
 * Devuelve el período del día según la hora local del navegador.
 */
function periodoDelDia(): PeriodoDelDia {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'day';
  if (h >= 12 && h < 19) return 'afternoon';
  return 'night';
}

/**
 * Retorna el saludo y el icono correspondiente al período del día.
 */
export function getGreeting(): { saludo: string; icono: PeriodoDelDia } {
  const icono = periodoDelDia();
  return { saludo: SALUDOS[icono], icono };
}
