// propios
import type { ErrorExtraccion } from '@/types/api/indicadores/ftp';
import type { CasoError, GrupoCasos, Severidad } from '@/types/pantallas/generarFtp';

export const SEVERIDAD: Record<string, Severidad> = {
  RUTA_INVALIDA:          'critico',
  ARCHIVO_NO_ENCONTRADO:  'critico',
  HOJA_NO_ENCONTRADA:     'critico',
  ETIQUETA_NO_ENCONTRADA: 'critico',
  ARCHIVO_VACIO:          'critico',
  CALCULO_FALLIDO:        'critico',
  ARCHIVO_DUPLICADO:      'advertencia',
  VALOR_NULO:             'advertencia',
  DESCARGA_FALLIDA:       'advertencia',
  PB_JSON_ERROR:          'advertencia',
  SERVICIO_NO_APLICA:     'advertencia',
};

export const LABEL_RUTA: Record<string, string> = {
  ETIQUETA_NO_ENCONTRADA: 'Detalle',
  CALCULO_FALLIDO:        'Detalle del error',
  PB_JSON_ERROR:          'Detalle del error',
  ARCHIVO_VACIO:          'Detalle',
  HOJA_NO_ENCONTRADA:     'Detalle',
  DESCARGA_FALLIDA:       'Detalle',
  SERVICIO_NO_APLICA:     'Detalle',
};

// Separa "{ruta}  ✗ fallo en: '{segmento}' — {diagnostico}[ — real|parecida: '{carpeta}']" en sus
// partes para darles su propia línea/estilo. "real" = la misma carpeta con otros espacios o mayúsculas;
// "parecida" = solo se le parece. Si el texto no trae ese formato (otros tipos de error), regresa
// null y se muestra tal cual, sin partir nada.
export const partirRutaError = (texto: string | null | undefined) => {
  const m = /^(.*?)\s*✗\s*fallo en:\s*'([^']*)'\s*—\s*(.*)$/s.exec(texto ?? '');
  if (!m) return null;
  const [, ruta, segmento, resto] = m;
  const encontrada = /\s*—\s*(real|parecida):\s*'([^']*)'\s*$/.exec(resto);
  return {
    ruta: ruta.trim(),
    segmento,
    diagnostico: encontrada ? resto.slice(0, encontrada.index) : resto,
    carpetaEncontrada: encontrada ? encontrada[2] : null,
    esLaMisma: encontrada?.[1] === 'real',
  };
};

/**
 * Junta lo que tiene la misma causa: al generar una categoría el backend repite la unidad por
 * indicador ("CE 01 / UMF 60", "CE 02 / UMF 60"); si la ruta es la misma, es un solo problema.
 */
export function agruparCasos(error: ErrorExtraccion): CasoError[] {
  const casos = new Map<string, CasoError>();

  for (const [nombre, bloques] of Object.entries(error.unidades ?? {})) {
    const separador = nombre.indexOf(' / ');
    const indicador = separador >= 0 ? nombre.slice(0, separador) : null;
    const unidad = separador >= 0 ? nombre.slice(separador + 3) : nombre;

    for (const bloque of bloques ?? []) {
      const clave = `${unidad}|${bloque.ruta}`;
      const caso = casos.get(clave) ?? { unidad, indicadores: [], reportes: [], ruta: bloque.ruta };
      if (indicador && !caso.indicadores.includes(indicador)) caso.indicadores.push(indicador);
      for (const reporte of bloque.reportes ?? []) {
        if (!caso.reportes.includes(reporte)) caso.reportes.push(reporte);
      }
      casos.set(clave, caso);
    }
  }

  return [...casos.values()];
}

/** Junta los casos que vienen del mismo reporte e indicadores, para decir eso una sola vez. */
export function agruparPorOrigen(casos: CasoError[]): GrupoCasos[] {
  const grupos = new Map<string, GrupoCasos>();

  for (const caso of casos) {
    const clave = `${caso.reportes.join(',')}|${caso.indicadores.join(',')}`;
    const grupo = grupos.get(clave) ?? { reportes: caso.reportes, indicadores: caso.indicadores, casos: [] };
    grupo.casos.push(caso);
    grupos.set(clave, grupo);
  }

  return [...grupos.values()];
}

/**
 * Lo que comparten varias rutas (lo de antes y lo de después de la carpeta de cada unidad), para
 * mostrarlo una vez y dejar en cada renglón solo lo propio. null si no hay nada en común.
 */
export function parteComunDeRutas(rutas: string[]) {
  if (rutas.length < 2 || !rutas.every(r => r.includes('/'))) return null;

  const trozos = rutas.map(r => r.split('/'));
  const primera = trozos[0];
  const minimo = Math.min(...trozos.map(t => t.length));
  let inicio = 0;
  while (inicio < minimo && trozos.every(t => t[inicio] === primera[inicio])) inicio++;
  let final = 0;
  while (final < minimo - inicio && trozos.every(t => t[t.length - 1 - final] === primera[primera.length - 1 - final])) final++;

  if (inicio === 0 && final === 0) return null;
  return {
    antes: primera.slice(0, inicio).join('/'),
    despues: primera.slice(primera.length - final).join('/'),
    propioDe: (ruta: string) => {
      const partes = ruta.split('/');
      return partes.slice(inicio, partes.length - final).join('/');
    },
  };
}

/** Qué parte de dos nombres de carpeta es distinta, para resaltar solo eso. */
export function diferenciaDeNombres(correcto: string, otro: string) {
  const minimo = Math.min(correcto.length, otro.length);
  let inicio = 0;
  while (inicio < minimo && correcto[inicio] === otro[inicio]) inicio++;
  let final = 0;
  while (final < minimo - inicio && correcto[correcto.length - 1 - final] === otro[otro.length - 1 - final]) final++;

  return {
    antes: correcto.slice(0, inicio),
    despues: correcto.slice(correcto.length - final),
    medioCorrecto: correcto.slice(inicio, correcto.length - final),
    medioOtro: otro.slice(inicio, otro.length - final),
  };
}
