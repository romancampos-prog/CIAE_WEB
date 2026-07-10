const SALUDOS = {
  day:       'Buenos días',
  afternoon: 'Buenas tardes',
  night:     'Buenas noches',
};

/**
 * Devuelve el período del día según la hora local del navegador.
 * @returns {'day'|'afternoon'|'night'}
 */
export function periodoDelDia() {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'day';
  if (h >= 12 && h < 19) return 'afternoon';
  return 'night';
}

/**
 * Retorna el saludo y el icono correspondiente al período del día.
 * @returns {{ saludo: string, icono: 'day'|'afternoon'|'night' }}
 */
export function getGreeting() {
  const icono = periodoDelDia();
  return { saludo: SALUDOS[icono], icono };
}
