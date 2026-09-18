import api from '../../../shared/api/axiosInstance';

/**
 * API unificada de indicadores (mapeo + reportes), reemplaza a los endpoints
 * viejos de /ftp/todos, /ftp/informacion y /reportes/FTP/datos-grafica.
 * ano/modulo/previos/etc. van como query params -- un GET con body (`data:`)
 * no llega igual desde el navegador que desde Node (probado: el body llegaba
 * vacío del lado del backend), así que el backend los recibe como params.
 */

/**
 * Índice de categorías de indicadores, para el selector/menú.
 * @param {{campo?:string, modulo?:string}} [filtros]
 *   campo: bandera del mapeo que decide qué se lista -- "mostrarGrafica" (default,
 *          páginas de gráficas) o "mostrarGenerar" (páginas de Generar).
 *   modulo: solo los indicadores de ese módulo ("ftp", "iaas", "Extractor").
 * @returns {Promise<Array<{categoriaIndicador:string, indicadores:string[], imagen:string, color:string}>>}
 */
export const obtenerTodosLosIndicadores = async ({ campo, modulo } = {}) => {
  const { data } = await api.get('/Indicadores/informacion/AllIndicadores', { params: { campo, modulo } });
  return data;
};

/**
 * Ficha técnica de un indicador: título, objetivo, semáforo, periodicidad,
 * y los flags mensual/mensualAcumulado (para saber qué vistas mostrar en la gráfica).
 * ano/modulo/previos no los usa la ficha -- van con valores neutros solo
 * porque el DTO del backend los exige a todos los endpoints por igual.
 * @param {string} indicador
 * @param {string} ano
 */
export const obtenerFichaIndicador = async (indicador, ano) => {
  const { data } = await api.get(`/Indicadores/informacion/ficha/${encodeURIComponent(indicador)}`, {
    params: { ano },
  });
  return data;
};

/**
 * Ficha técnica completa de un indicador (título/objetivo/semáforo + cómo se
 * calcula) -- para el panel compartido FichaTecnicaBoton, usado en las
 * páginas de generar de FTP, IAAS y Extractor. Lee directo del mapeo
 * unificado, sirve para cualquier módulo sin distinción.
 * @param {string} indicador
 */
export const obtenerFichaTecnicaCompleta = async (indicador) => {
  const { data } = await api.get(`/Indicadores/informacion/ficha-tecnica/${encodeURIComponent(indicador)}`);
  return data;
};

/**
 * Reporte ya generado de un indicador (los datos reales para graficar).
 * @param {string} indicador
 * @param {string} ano
 * @param {{modulo:string, mensualAcumulado?:boolean, previos?:boolean}} opciones
 *   modulo: "ftp" | "iaas" -- de eso depende si el backend calcula MENSUAL_ACUMULADO.
 */
export const obtenerReporteIndicador = async (indicador, ano, { modulo, mensualAcumulado = false, previos = false } = {}) => {
  const { data } = await api.get(`/Indicadores/reportes/${encodeURIComponent(indicador)}`, {
    params: { ano, modulo, previos, mensualAcumulado },
  });
  return data;
};
