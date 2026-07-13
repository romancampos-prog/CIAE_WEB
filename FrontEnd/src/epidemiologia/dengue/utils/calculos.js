/**
 * Calcula los KPIs del canal endémico a partir de los datos de la API.
 * @param {{ casos_actual: number[], semanas: number[], alertas: Array }} datos
 * @returns {{ totalCasos: number, picoCasos: number, picaSemana: number, semsAlerta: number, semsConDatos: number }}
 */
export function calcularKpisCanal(datos) {
  const totalCasos   = datos.casos_actual.reduce((a, b) => a + b, 0);
  const picoCasos    = Math.max(...datos.casos_actual);
  const picaSemana   = datos.semanas[datos.casos_actual.indexOf(picoCasos)];
  const semsAlerta   = datos.alertas.length;
  const semsConDatos = datos.casos_actual.filter(c => c > 0).length;
  return { totalCasos, picoCasos, picaSemana, semsAlerta, semsConDatos };
}

/**
 * Calcula los KPIs de la página de alertas SisCep.
 * @param {Object} datos - Datos de la API con las claves de cada alerta
 * @param {Array<{ clave: string, prioritaria?: boolean }>} secciones - Definición de secciones
 * @returns {{ totalRegistros: number, seccionesActivas: number, prioritarias: number }}
 */
export function calcularKpisAlertas(datos, secciones) {
  const totalRegistros   = secciones.reduce((s, { clave }) => s + (datos[clave]?.length || 0), 0);
  const seccionesActivas = secciones.filter(({ clave }) => (datos[clave]?.length || 0) > 0).length;
  const prioritarias     = datos.graves_sin_muestra?.length || 0;
  return { totalRegistros, seccionesActivas, prioritarias };
}

/**
 * Agrupa un array de registros de duplicados por la clave `METODO`.
 * @param {Array<{ METODO: string }>} registros
 * @returns {Object<string, number>} Conteo por método
 */
export function agruparPorMetodo(registros) {
  return registros.reduce((acc, r) => {
    acc[r.METODO] = (acc[r.METODO] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Devuelve los valores de tema (color, fondo, borde, etiqueta) según el tipo de mapa.
 * @param {'situacion'|'confirmados'} tipo - Tipo de mapa de dengue
 * @returns {{ etiqueta: string, colorTema: string, bgTema: string, bordeTema: string }}
 */
export function getTemaMapa(tipo) {
  if (tipo === 'situacion') {
    return {
      etiqueta:  'Casos Notificados',
      colorTema: '#245c4f',
      bgTema:    'rgba(36,92,79,0.07)',
      bordeTema: 'rgba(36,92,79,0.18)',
    };
  }
  return {
    etiqueta:  'Casos Confirmados',
    colorTema: '#691c32',
    bgTema:    'rgba(105,28,50,0.07)',
    bordeTema: 'rgba(105,28,50,0.18)',
  };
}
