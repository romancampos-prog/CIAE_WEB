// Colores de la clasificación final de un caso: los usan las dos secciones de duplicados.
export const COLOR_CLASIF: Record<string, { bg: string; color: string }> = {
  POSITIVO        : { bg: 'rgba(105,28,50,0.08)',  color: 'var(--tinto-texto)' },
  NEGATIVO        : { bg: 'rgba(36,92,79,0.08)',   color: 'var(--primario-texto)' },
  'SIN CLASIFICAR': { bg: 'rgba(164,164,164,0.1)', color: 'var(--texto-suave)' },
};

/** Estilo de la clasificación; la desconocida se pinta como "SIN CLASIFICAR". */
export const estiloClasificacion = (valor: string | number | null | undefined) =>
  COLOR_CLASIF[String(valor)] || COLOR_CLASIF['SIN CLASIFICAR'];

// Duplicados confirmados (índigo) y posibles (ámbar): distintos de los colores de las alertas.
export const COLOR_DUPLICADOS = '#4f46e5';
export const COLOR_POSIBLES   = '#b45309';
