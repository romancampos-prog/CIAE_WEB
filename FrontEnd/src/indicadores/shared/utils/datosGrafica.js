// propios
import { MESES_LARGOS_ARR } from '../constantes/meses';

// Clave con la que el backend manda el estatal (total OOAD) dentro de cada mes.
export const CLAVE_ESTATAL = 'TOTAL_OOAD';

export const nombreUnidad = (unidad) => (unidad === CLAVE_ESTATAL ? 'Estatal' : unidad);

export const mesCorto = (mes) => (mes ? mes.slice(0, 3) : '');

export const formatoNumero = (valor) =>
  (valor == null ? '—' : Number(valor).toLocaleString('es-MX', { maximumFractionDigits: 2 }));

// El "%" va pegado al número; las tasas ("por 1,000") y los promedios se rotulan en los encabezados.
export const formatoValor = (valor, unidadMedida) =>
  (valor == null ? '—' : `${formatoNumero(valor)}${unidadMedida === '%' ? ' %' : ''}`);

/**
 * Las unidades de un mes tal cual las guardó el backend, sin el estatal.
 * @param {Object} reporte      - reporte de /grafica
 * @param {string} mes          - "Agosto"
 * @param {boolean} acumulado   - true para leer MENSUAL_ACUMULADO en vez de MESES
 * @returns {{filas: Array, estatal: Object|null}}
 */
export function datosDelMes(reporte, mes, acumulado) {
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

const aFila = (unidad, dato) => ({
  unidad,
  resultado:   dato?.['%'] ?? null,
  numerador:   dato?.numerador ?? null,
  denominador: dato?.denominador ?? null,
  desempeno:   dato?.desempeno ?? 'Gris',
});

/** La meta que aplica a una unidad en un mes: la de su grupo si el semáforo va por grupo (IAAS 01), si no la del mes. */
export const metaDe = (perfil, mes, unidad) =>
  perfil?.metaDeUnidad?.[unidad] ?? perfil?.metaPorMes?.[mes] ?? null;

/**
 * Ordena para comparar: las que tienen dato primero, la mejor arriba según el tipo de meta
 * que manda el backend ("menos" = menor es mejor); las que no tienen dato al final.
 */
export function ordenarPorResultado(filas, tipoMeta) {
  const conDato = filas.filter(f => f.resultado != null);
  const sinDato = filas.filter(f => f.resultado == null);
  conDato.sort((a, b) => (tipoMeta === 'menos' ? a.resultado - b.resultado : b.resultado - a.resultado));
  return [...conDato, ...sinDato];
}

/**
 * Los meses (cerrados y el parcial) de una unidad, con el estatal y la meta de cada mes.
 * @param {Object} reporte
 * @param {string[]} meses       - meses del selector, en orden
 * @param {string} unidad
 * @param {Object} perfil
 * @param {boolean} acumulado
 * @param {string|null} mesParcial
 */
export function serieDeUnidad(reporte, meses, unidad, perfil, acumulado, mesParcial) {
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
      parcial:     mes === mesParcial,
    };
  });
}

/** Techo de la escala: el mayor valor a dibujar con un poco de aire, para que nada se salga. */
export function techoDe(valores) {
  const mayor = Math.max(0, ...valores.filter(v => v != null));
  return mayor > 0 ? mayor * 1.1 : 1;
}

/** Meses del año en el orden del calendario. */
export const ordenarMeses = (meses) =>
  [...meses].sort((a, b) => MESES_LARGOS_ARR.indexOf(a) - MESES_LARGOS_ARR.indexOf(b));
