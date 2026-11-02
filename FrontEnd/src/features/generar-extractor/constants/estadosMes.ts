// propios
import type { EstadoMesArchivo } from '@/types/api/indicadores/extractor';
import type { ClaseEstado } from '@/types/pantallas/generarExtractor';

// Cómo se ve cada estado de mes que manda /estado-archivos.
export const ESTADO_MES: Record<EstadoMesArchivo, { clase: ClaseEstado; texto: string }> = {
  completo:      { clase: 'ok',       texto: 'Subido' },
  parcial:       { clase: 'parcial',  texto: 'Incompleto' },
  pendiente:     { clase: 'pendiente', texto: 'Pendiente' },
};
export const ESTADO_FUTURO = { clase: 'futuro' as ClaseEstado, texto: 'Todavía no llega' };

// Qué dice el panel lateral sobre el mes elegido antes de subir.
export const DESCRIPCION_ESTADO: Record<EstadoMesArchivo, string> = {
  completo:     'Este mes ya está subido.',
  parcial:      'Este mes está incompleto: vuelve a subirlo para generarlo.',
  pendiente:    'Este mes todavía no se ha subido.',
};
