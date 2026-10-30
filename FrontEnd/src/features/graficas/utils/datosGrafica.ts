// propios
import type { Franja, MetaNumerica, PerfilIndicador, ReporteIndicador, TipoMeta, UnidadDatos } from '@/types/api/indicadores/reportes';
import type { FilaUnidad, PuntoSerie } from '@/types/pantallas/graficas';
import { MESES_LARGOS_ARR } from '@/features/indicadores';

// Clave con la que el backend manda el total OOAD dentro de cada mes.
export const CLAVE_ESTATAL = 'TOTAL_OOAD';
// Cómo se rotula en pantalla: lo mismo que dice el JSON (TOTAL_OOAD), legible.
export const ETIQUETA_TOTAL = 'Total OOAD';

export const nombreUnidad = (unidad: string): string => (unidad === CLAVE_ESTATAL ? ETIQUETA_TOTAL : unidad);

export const mesCorto = (mes: string | null | undefined): string => (mes ? mes.slice(0, 3) : '');

export const formatoNumero = (valor: number | null | undefined, decimales = 2): string =>
  (valor == null ? '—' : Number(valor).toLocaleString('es-MX', { maximumFractionDigits: decimales }));

// El "%" va pegado al número; las tasas ("por 1,000") y los promedios se rotulan en los encabezados.
export const formatoValor = (valor: number | null | undefined, unidadMedida: string | null | undefined): string =>
  (valor == null ? '—' : `${formatoNumero(valor)}${unidadMedida === '%' ? ' %' : ''}`);

/**
 * Las unidades de un mes tal cual las guardó el backend, sin el estatal.
 * acumulado = true lee MENSUAL_ACUMULADO en vez de MESES.
 */
export function datosDelMes(
  reporte: ReporteIndicador | null,
  mes: string,
  acumulado: boolean,
): { filas: FilaUnidad[]; estatal: FilaUnidad | null } {
  const fuente = acumulado ? reporte?.MENSUAL_ACUMULADO : reporte?.MESES;
  // El mes parcial (aún sin cerrar) solo existe en el semanal.
  const delMes = fuente?.[mes]?.Reporte ?? (acumulado ? null : reporte?.SEMANA?.MES?.[mes]?.Reporte);
  if (!delMes) return { filas: [], estatal: null };

  const filas = Object.entries(delMes)
    .filter(([unidad]) => unidad !== CLAVE_ESTATAL)
    .map(([unidad, dato]) => aFila(unidad, dato));
  const estatal = delMes[CLAVE_ESTATAL] ? aFila(CLAVE_ESTATAL, delMes[CLAVE_ESTATAL]) : null;
  return { filas, estatal };
}

const aFila = (unidad: string, dato: UnidadDatos | undefined): FilaUnidad => ({
  unidad,
  resultado:   dato?.['%'] ?? null,
  numerador:   dato?.numerador ?? null,
  denominador: dato?.denominador ?? null,
  desempeno:   dato?.desempeno ?? 'Gris',
});

/**
 * El texto de la meta para leerse en pantalla, con los mismos números del backend:
 * ">= 18.0" → "≥ 18"; un rango (">= 4 a <= 7", con minimo/maximo) → "4 a 7".
 */
export function textoMeta(meta: MetaNumerica | string | null | undefined): string {
  if (!meta) return '—';
  if (typeof meta !== 'string' && meta.minimo != null && meta.maximo != null) return `${formatoNumero(meta.minimo)} a ${formatoNumero(meta.maximo)}`;
  const texto = typeof meta === 'string' ? meta : meta.texto;
  // El resumen manda solo el texto: el rango ">= 4 a <= 7" también queda "4 a 7"
  const rango = texto.match(/^\s*>=\s*(-?[\d.]+)\s+a\s+<=\s*(-?[\d.]+)\s*$/);
  if (rango) return `${formatoNumero(Number(rango[1]))} a ${formatoNumero(Number(rango[2]))}`;
  return texto
    .replace(/>=/g, '≥').replace(/<=/g, '≤')
    .replace(/-?\d+(\.\d+)?/g, n => formatoNumero(Number(n)));
}

/** La meta que aplica a una unidad en un mes: la de su grupo si el semáforo va por grupo (IAAS 01), si no la del mes. */
export const metaDe = (perfil: PerfilIndicador | null, mes: string, unidad: string) =>
  perfil?.metaDeUnidad?.[unidad] ?? perfil?.metaPorMes?.[mes] ?? null;

/** Las franjas del semáforo que aplican a una unidad en un mes: las de su grupo (IAAS 01) o las del mes. */
export const franjasDe = (perfil: PerfilIndicador | null, mes: string, unidad: string): Franja[] =>
  perfil?.franjasDeUnidad?.[unidad] ?? perfil?.franjasPorMes?.[mes] ?? [];

/** Los límites con número de unas franjas, para que la escala de la gráfica las alcance. */
export const limitesDe = (franjas: Franja[]): number[] =>
  franjas.flatMap(f => [f.desde, f.hasta]).filter((v): v is number => v != null);

/**
 * Los cortes de unas franjas con su color: verde donde empieza (o termina) Esperado y rojo donde
 * empieza Bajo; entre los dos queda Medio. Con dos niveles, solo el verde.
 */
export function cortesConTono(franjas: Franja[]): { valor: number; tono: 'Esperado' | 'Bajo' }[] {
  return franjas.slice(1)
    .filter(arriba => arriba.desde != null)
    .map((arriba, i) => ({
      valor: arriba.desde as number,
      tono: [franjas[i].nivel, arriba.nivel].includes('Esperado') ? 'Esperado' as const : 'Bajo' as const,
    }));
}

/** El rango de un nivel para la leyenda: "≥ 20.3", "15.4 a 20.3"; si el nivel sale dos veces (rangos), "≤ 3.9 o ≥ 10". */
export function textoNivel(franjas: Franja[], nivel: string): string {
  return franjas
    .filter(f => f.nivel === nivel)
    .map(f => (f.desde == null ? `≤ ${formatoNumero(f.hasta)}` : f.hasta == null ? `≥ ${formatoNumero(f.desde)}` : `${formatoNumero(f.desde)} a ${formatoNumero(f.hasta)}`))
    .join(' o ');
}

/**
 * Semáforo por tipo de hospital (IAAS 01): los tipos que comparten las mismas franjas van juntos
 * ("HGZ, HGR, HGO"), así la tabla dice cada rango una sola vez.
 */
export function franjasPorGrupo(
  perfil: PerfilIndicador | null,
  grupoDeUnidad: Record<string, string> | null | undefined,
): { grupos: string[]; franjas: Franja[] }[] {
  if (!perfil?.franjasDeUnidad || !grupoDeUnidad) return [];
  const porClave = new Map<string, { grupos: string[]; franjas: Franja[] }>();
  Object.entries(perfil.franjasDeUnidad).forEach(([unidad, franjas]) => {
    const grupo = grupoDeUnidad[unidad];
    if (!grupo || !franjas.length) return;
    const clave = JSON.stringify(franjas);
    const fila = porClave.get(clave) ?? { grupos: [], franjas };
    if (!fila.grupos.includes(grupo)) fila.grupos.push(grupo);
    porClave.set(clave, fila);
  });
  return [...porClave.values()];
}

/**
 * Ordena para comparar: las que tienen dato primero, la mejor arriba según el tipo de meta
 * que manda el backend ("menos" = menor es mejor); las que no tienen dato al final.
 */
export function ordenarPorResultado<T extends { resultado: number | null }>(filas: T[], tipoMeta: TipoMeta | undefined): T[] {
  const conDato = filas.filter(f => f.resultado != null);
  const sinDato = filas.filter(f => f.resultado == null);
  conDato.sort((a, b) => (tipoMeta === 'menos' ? a.resultado! - b.resultado! : b.resultado! - a.resultado!));
  return [...conDato, ...sinDato];
}

/** Los meses (cerrados y el parcial) de una unidad, con el estatal y la meta de cada mes. */
export function serieDeUnidad(
  reporte: ReporteIndicador | null,
  meses: string[],
  unidad: string,
  perfil: PerfilIndicador | null,
  acumulado: boolean,
  mesParcial: string | null,
): PuntoSerie[] {
  return meses.map(mes => {
    const { filas, estatal } = datosDelMes(reporte, mes, acumulado);
    const fila = unidad === CLAVE_ESTATAL ? estatal : filas.find(f => f.unidad === unidad);
    return {
      mes,
      resultado:   fila?.resultado ?? null,
      desempeno:   fila?.desempeno ?? 'Gris',
      numerador:   fila?.numerador ?? null,
      denominador: fila?.denominador ?? null,
      estatal:     unidad === CLAVE_ESTATAL ? null : estatal?.resultado ?? null,
      meta:        metaDe(perfil, mes, unidad),
      franjas:     franjasDe(perfil, mes, unidad),
      parcial:     mes === mesParcial,
    };
  });
}

/** Techo de la escala: el mayor valor a dibujar con un poco de aire, para que nada se salga. */
export function techoDe(valores: (number | null | undefined)[]): number {
  const mayor = Math.max(0, ...valores.filter((v): v is number => v != null));
  return mayor > 0 ? mayor * 1.1 : 1;
}

/** Meses del año en el orden del calendario. */
export const ordenarMeses = (meses: string[]): string[] =>
  [...meses].sort((a, b) => MESES_LARGOS_ARR.indexOf(a) - MESES_LARGOS_ARR.indexOf(b));
