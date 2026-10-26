// propios
import type { EstadoMesArchivo } from '@/features/generar-extractor/tipos';

export type ClaseEstado = 'ok' | 'parcial' | 'pendiente' | 'bloqueado' | 'previo' | 'futuro';

// Cómo se ve cada estado de mes que manda /estado-archivos.
export const ESTADO_MES: Record<EstadoMesArchivo, { clase: ClaseEstado; texto: string }> = {
  completo:      { clase: 'ok',       texto: 'Subido' },
  parcial:       { clase: 'parcial',  texto: 'Incompleto' },
  pendiente:     { clase: 'pendiente', texto: 'Pendiente' },
  sin_principal: { clase: 'bloqueado', texto: 'Falta SUI-13' },
  sin_registro:  { clase: 'previo',   texto: 'Subido antes' },
};
export const ESTADO_FUTURO = { clase: 'futuro' as ClaseEstado, texto: 'Todavía no llega' };

// Qué dice el panel lateral sobre el mes elegido antes de subir.
export const DESCRIPCION_ESTADO: Partial<Record<EstadoMesArchivo, string>> & { pendiente: string } = {
  completo:     'Este mes ya está subido.',
  parcial:      'Este mes está incompleto: vuelve a subirlo para generarlo.',
  pendiente:    'Este mes todavía no se ha subido.',
  sin_registro: 'Este mes se subió antes de llevar este registro; puedes volver a subirlo.',
};
