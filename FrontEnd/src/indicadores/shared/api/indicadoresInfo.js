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
  const { data } = await api.get('/Indicadores/informacion/indicadores', { params: { campo, modulo } });
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

// Lo ya consultado en esta visita a gráficas: regresar a un indicador no lo vuelve a pedir.
// Se guarda la promesa (no el resultado) para que dos pedidos seguidos del mismo no dupliquen la llamada.
const graficasConsultadas = new Map();

/**
 * Ficha (del mapeo) + reporte (de BD_CIAE) de un indicador en una sola llamada. El backend
 * resuelve el módulo y el semanal; el front solo manda indicador y año.
 * @returns {Promise<{ficha: Object, reporte: Object|null}>}
 */
export const obtenerGraficaIndicador = (indicador, ano) => {
  const clave = `${indicador}|${ano}`;
  if (!graficasConsultadas.has(clave)) {
    const pedido = api.get(`/Indicadores/reportes/${encodeURIComponent(indicador)}/grafica`, { params: { ano } })
      .then(({ data }) => data.data)
      .catch(error => { graficasConsultadas.delete(clave); throw error; });
    graficasConsultadas.set(clave, pedido);
  }
  return graficasConsultadas.get(clave);
};

/** Se llama al entrar y salir de gráficas, para no mostrar datos viejos si se generó algo nuevo. */
export const limpiarGraficasConsultadas = () => graficasConsultadas.clear();
