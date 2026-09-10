import { useState, useEffect, useMemo } from 'react';
import { obtenerTodosLosIndicadores, obtenerFichaIndicador, obtenerReporteIndicador } from '../../shared/api/indicadoresInfo';
import { getReporteGuardado, generarCategoriaGuardada } from '../../reportes_grafica/api/reportes';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_LARGOS_ARR } from '../../shared/constantes/meses';
import { CAT_COLOR } from '../constantes/colores';
import {
  buildFTPChartDataUnidad,
  buildFTPChartDataMes,
  mesesDisponiblesDeReporte,
  calcularRangosFTP,
} from '../utils/calculos';
import { contarSemaforo } from '../../shared/utils/contarSemaforo';
import { techoEscala } from '../../shared/utils/escala';

/**
 * Hook principal de gráficas FTP.
 * Carga la lista de indicadores, la ficha y el reporte del indicador seleccionado
 * (los 3 endpoints unificados de /Indicadores) y calcula los datasets para las
 * vistas por unidad y por mes.
 *
 * Puede operar en modo controlado (indicador gestionado desde el componente padre)
 * o en modo independiente (el hook gestiona su propio `indSel`).
 *
 * @param {number|null} hoveredMes - Mes sobre el que el usuario tiene el cursor (para el semáforo)
 * @param {string} [extIndSel] - Indicador seleccionado externamente (modo controlado)
 * @param {Function} [onExtChange] - Callback al cambiar el indicador en modo controlado
 * @returns {Object} Estado y datos listos para renderizar las gráficas
 */
export function useFTPGrafica(hoveredMes, extIndSel, onExtChange) {
  const controlled = extIndSel !== undefined;
  const [anio]                          = useState('2026');
  const [listaIndicadores, setLista]    = useState([]);
  const [localIndSel, setLocalIndSel]   = useState('');

  const indSel    = controlled ? extIndSel    : localIndSel;
  const setIndSel = controlled ? (onExtChange ?? (() => {})) : setLocalIndSel;
  const [indInfo, setIndInfo]           = useState(null);
  const [reporte, setReporte]           = useState(null);
  const [unidadSel, setUnidadSel]       = useState('');
  const [cargando, setCargando]         = useState(false);
  const [descargando, setDescargando]   = useState(false);
  const [vistaGrafica, setVistaGrafica] = useState('unidad');
  const [mesSel, setMesSel]             = useState('');

  /** Carga inicial del índice de indicadores, agrupados por categoría */
  useEffect(() => {
    obtenerTodosLosIndicadores().then(lista => {
      setLista(lista ?? []);
      if (!controlled) {
        const primero = lista?.[0]?.indicadores?.[0];
        if (primero) setLocalIndSel(primero);
      }
    }).catch(() => {});
  }, []);

  /**
   * Recarga ficha y reporte cuando cambia el indicador o el año.
   * No limpia `reporte` de inmediato: mientras llega la respuesta se sigue
   * mostrando lo del indicador anterior, para que el cambio no haga parpadear
   * todo el panel. `previos: true` para que el mes en curso (aun sin cerrar)
   * siga apareciendo como barra parcial via SEMANA.
   */
  useEffect(() => {
    if (!indSel) return;
    setCargando(true);
    Promise.all([
      obtenerReporteIndicador(indSel, anio, { modulo: 'ftp', previos: true }),
      obtenerFichaIndicador(indSel, anio).catch(() => null),
    ]).then(([r, ficha]) => {
      setReporte(r);
      setIndInfo(ficha);
      const meses      = mesesDisponiblesDeReporte(r);
      const primerMes  = Object.keys(r?.MESES ?? {})[0];
      setUnidadSel(primerMes ? Object.keys(r.MESES[primerMes])[0] ?? '' : '');
      setMesSel(meses.length > 0 ? meses[meses.length - 1] : '');
    }).finally(() => setCargando(false));
  }, [indSel, anio]);

  /** Lista plana de todos los indicadores (para el selector de la UI) */
  const todosLosIndicadores = useMemo(() => {
    const acc = [];
    listaIndicadores.forEach(cat => (cat.indicadores ?? []).forEach(ind => acc.push(ind)));
    return acc;
  }, [listaIndicadores]);

  /** Tendencia mensual de la unidad seleccionada */
  const chartData = useMemo(
    () => buildFTPChartDataUnidad(reporte, unidadSel, indInfo, anio),
    [reporte, unidadSel, indInfo, anio]
  );

  const maxTasa = useMemo(
    () => techoEscala(chartData.map(d => d.tasa)),
    [chartData]
  );

  /** Todas las unidades en el mes seleccionado + TOTAL por separado */
  const chartDataMesConTotal = useMemo(
    () => buildFTPChartDataMes(reporte, mesSel),
    [reporte, mesSel]
  );

  /** TOTAL aparte: su magnitud no es comparable a una sola unidad, no debe compartir escala */
  const totalMes = useMemo(
    () => chartDataMesConTotal.find(d => d.unidad === 'TOTAL_OOAD') ?? null,
    [chartDataMesConTotal]
  );

  const chartDataMes = useMemo(
    () => chartDataMesConTotal.filter(d => d.unidad !== 'TOTAL_OOAD'),
    [chartDataMesConTotal]
  );

  const maxTasaMes = useMemo(
    () => techoEscala(chartDataMes.map(d => d.tasa)),
    [chartDataMes]
  );

  /** Conteo Esperado/Medio/Bajo/Gris del mes seleccionado — para la vista "Por mes" */
  const cumplimientoMes = useMemo(() => contarSemaforo(chartDataMes), [chartDataMes]);

  const mesesDisponibles = useMemo(() => mesesDisponiblesDeReporte(reporte), [reporte]);

  // El ultimo mes "disponible" (con una fila en MESES) no siempre trae un
  // resultado real -- en indicadores "Semestral Anualizado" (EH 03, DM 04) la
  // mayoria de los meses solo guardan el numerador crudo (desempeno "Gris",
  // sin corte todavia) y solo Junio/Diciembre calculan la tasa de verdad. Si
  // se tomara literal el ultimo mes de la lista, el semaforo del sidebar
  // mostraria "sin datos" para todas las unidades en cuanto pasara un mes del
  // corte, tapando el ultimo resultado real que sigue vigente. Por eso se
  // busca hacia atras el ultimo mes que sí tenga al menos un resultado.
  const ultimoMesDisponible = useMemo(() => {
    for (let i = mesesDisponibles.length - 1; i >= 0; i--) {
      const mes = mesesDisponibles[i];
      const nombreMes = MESES_LARGOS_ARR[parseInt(mes, 10) - 1];
      const datosMes = reporte?.MESES?.[nombreMes] ?? reporte?.SEMANA?.MES?.[nombreMes];
      const tieneResultado = datosMes && Object.values(datosMes).some(u => u?.desempeno && u.desempeno !== 'Gris');
      if (tieneResultado) return mes;
    }
    return mesesDisponibles[mesesDisponibles.length - 1] ?? '';
  }, [reporte, mesesDisponibles]);

  /** Color de semáforo de cada unidad en el último mes disponible (incluye el parcial de SEMANA) */
  const unidadesStatus = useMemo(
    () => buildFTPChartDataMes(reporte, ultimoMesDisponible).map(({ unidad, color }) => ({ unidad, color })),
    [reporte, ultimoMesDisponible]
  );

  /** Conteo Esperado/Medio/Bajo/Gris del último mes disponible — para la vista "Por unidad" */
  const cumplimientoUltimoMes = useMemo(
    () => contarSemaforo(unidadesStatus.filter(u => u.unidad !== 'TOTAL_OOAD')),
    [unidadesStatus]
  );

  const ultimoMesNum = useMemo(
    () => parseInt(ultimoMesDisponible || '1'),
    [ultimoMesDisponible]
  );
  const mesParaSem = vistaGrafica === 'unidad'
    ? (hoveredMes ?? ultimoMesNum)
    : parseInt(mesSel || '1');

  /** True cuando el indicador tiene umbrales de semáforo por mes (ej. CACU) */
  const esSemPorMes = useMemo(() => {
    const sem = indInfo?.semaforo;
    if (!sem) return false;
    return MESES_LARGOS_ARR.some(m => m in sem);
  }, [indInfo]);

  /** Textos de semáforo formateados para el mes/unidad activa */
  const rangosSem = useMemo(
    () => calcularRangosFTP(indInfo, mesParaSem, MESES_LARGOS_ARR),
    [indInfo, mesParaSem]
  );

  const indColor  = CAT_COLOR[indSel?.split(' ')[0]] ?? '#0b5445';
  const categoria = indSel?.split(' ')[0] ?? '';

  /**
   * Descarga el Excel de un indicador específico para un mes dado. Solo lectura:
   * toma lo que ya está guardado (definitivo o semanal) -- nunca genera ni cierra
   * un mes desde gráficas.
   * @param {string} mes - Mes en formato "MM"
   */
  const descargarIndicador = async (mes) => {
    if (!indSel || !mes || descargando) return;
    setDescargando(true);
    try {
      const res = await getReporteGuardado(indSel, { ano: anio, mes });
      if (res.success) descargarB64(res.data.archivo_b64, res.data.nombre_archivo);
    } catch { /* silencioso */ }
    finally { setDescargando(false); }
  };

  /**
   * Descarga el Excel de todos los indicadores de una categoría para un mes dado.
   * Solo lectura, mismo criterio que descargarIndicador.
   * @param {string} mes - Mes en formato "MM"
   */
  const descargarCategoria = async (mes) => {
    if (!categoria || !mes || descargando) return;
    setDescargando(true);
    try {
      const res = await generarCategoriaGuardada(categoria, { ano: anio, mes });
      if (res.success) descargarB64(res.data.archivo_b64, res.data.nombre_archivo);
    } catch { /* silencioso */ }
    finally { setDescargando(false); }
  };

  return {
    anio, indSel, setIndSel, indInfo,
    reporte, unidadSel, setUnidadSel,
    cargando, descargando, vistaGrafica, setVistaGrafica,
    mesSel, setMesSel, mesesDisponibles,
    listaIndicadores,
    todosLosIndicadores, chartData, maxTasa,
    chartDataMes, maxTasaMes, totalMes, unidadesStatus,
    cumplimientoMes, cumplimientoUltimoMes,
    rangosSem, esSemPorMes, indColor, categoria,
    descargarIndicador, descargarCategoria,
  };
}
