import { useState, useEffect, useMemo } from 'react';
import { getUnidadesIAAS, descargarIAASGuardado, infoBasicaInAass } from '../api/IAAS';
import { obtenerFichaIndicador, obtenerReporteIndicador } from '../../shared/api/indicadoresInfo';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_CORTOS } from '../../shared/constantes/meses';
import { COLOR_IND, HGS_COLOR, HGS_BG } from '../constantes/colores';
import { COLOR_SEMAFORO } from '../../shared/constantes/semaforo';
import {
  TOTAL_KEY,
  FUENTE_ACUMULADO,
  mesesConDatosDeReporte,
  buildChartDataUnidad,
  buildChartDataMes,
} from '../utils/calculos';
import { contarSemaforo } from '../../shared/utils/contarSemaforo';
import { techoEscala } from '../../shared/utils/escala';
import { esSemaforoAgrupado, rangosDeMetas, agruparRangos } from '../../shared/utils/rangosSemaforo';

// Clave real bajo la que el backend manda el total OOAD ya calculado.
const TOTAL_OOAD_KEY = 'TOTAL_OOAD';

export { TOTAL_KEY };

/**
 * Hook principal de gráficas IAAS.
 * Carga los datos históricos del año en curso, calcula los datasets para cada vista
 * (por unidad, por mes, acumulado) y expone los handlers de descarga.
 *
 * Puede operar en modo controlado (cuando el indicador se gestiona desde afuera)
 * o en modo independiente (el hook gestiona su propio estado de indicador).
 *
 * @param {string} [extIndSel] - Indicador seleccionado externamente (modo controlado)
 * @param {Function} [onExtChange] - Callback para notificar cambio de indicador al padre
 * @returns {Object} Estado y datos listos para renderizar las gráficas
 */
export function useIAASGrafica(extIndSel, onExtChange) {
  const controlled = extIndSel !== undefined;
  const [anio]                            = useState('2026');
  const [reporte, setReporte]             = useState(null);
  const [unidades, setUnidades]           = useState([]);
  const [unidadSel, setUnidadSel]         = useState('');
  const [localIndSel, setLocalIndSel]     = useState('IAAS 02');

  const indSel    = controlled ? extIndSel    : localIndSel;
  const setIndSel = controlled ? (onExtChange ?? (() => {})) : setLocalIndSel;
  const [cargando, setCargando]           = useState(false);
  const [descargando, setDescargando]     = useState(false);
  const [infoAllInAass, setInfoIAAS]      = useState({});
  const [vistaGrafica, setVistaGrafica]   = useState('unidad');
  const [acumulado, setAcumulado]         = useState(false);
  const [mesSel, setMesSel]               = useState('');

  /** Catálogo de unidades (orden en que se muestran) e info de semáforo por indicador */
  useEffect(() => {
    Promise.all([getUnidadesIAAS(), infoBasicaInAass()])
      .then(([unids, info]) => {
        setUnidades(unids);
        setInfoIAAS(info.data);
        if (unids.length > 0) setUnidadSel(actual => actual || unids[0]);
      })
      .catch(error => console.error('Error cargando catálogo IAAS:', error));
  }, []);

  /**
   * Reporte del indicador activo. La ficha se pide primero porque trae el módulo
   * y si el indicador tiene mensual acumulado (el backend arma MENSUAL_ACUMULADO
   * solo si se lo piden). No limpia `reporte` de inmediato para que el cambio de
   * indicador no haga parpadear el panel.
   */
  useEffect(() => {
    if (!indSel) return undefined;
    let vigente = true;
    setCargando(true);
    obtenerFichaIndicador(indSel, anio)
      .then(ficha => obtenerReporteIndicador(indSel, anio, { modulo: ficha.modulo, mensualAcumulado: ficha.mensualAcumulado }))
      .then(r => {
        if (!vigente) return;
        setReporte(r);
        const meses = mesesConDatosDeReporte(r);
        setMesSel(meses.length > 0 ? meses[meses.length - 1] : '');
      })
      .catch(error => console.error('Error cargando datos IAAS:', error))
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [indSel, anio]);

  /**
   * Descarga el Excel guardado para el año actual, opcionalmente filtrado por indicador.
   * @param {string|null} indicador - ID del indicador a descargar, o null para todos
   */
  const _descargar = (indicador = null) => {
    setDescargando(true);
    descargarIAASGuardado(anio, indicador)
      .then(res => descargarB64(res.archivo_b64, res.nombre_archivo))
      .catch(() => {})
      .finally(() => setDescargando(false));
  };

  /** Descarga el Excel con todos los indicadores del año */
  const handleDescargar    = ()    => _descargar(null);

  /** Descarga el Excel de un indicador específico */
  const handleDescargarInd = (ind) => _descargar(ind);

  const indInfo       = infoAllInAass?.[indSel];
  const sem           = indInfo?.semaforo;
  const hgsSet        = useMemo(() => new Set(indInfo?.unidades_hgs ?? []), [indInfo]);
  const unidadTipoMap = useMemo(() => indInfo?.unidad_tipo ?? {}, [indInfo]);

  const mesesConDatos = useMemo(() => mesesConDatosDeReporte(reporte), [reporte]);

  /** Tendencia mensual de la unidad seleccionada (o TOTAL OOAD) */
  const chartData = useMemo(
    () => buildChartDataUnidad(reporte, unidadSel, mesesConDatos),
    [reporte, unidadSel, mesesConDatos]
  );

  const maxTasa = useMemo(
    () => techoEscala(chartData.map(d => d.tasa)),
    [chartData]
  );

  /** Todas las unidades en el mes seleccionado + TOTAL OOAD por separado */
  const chartDataMesConTotal = useMemo(
    () => buildChartDataMes(reporte, unidades, mesSel),
    [reporte, unidades, mesSel]
  );

  /** TOTAL aparte: su magnitud no es comparable a una sola unidad, no debe compartir escala */
  const totalMes = useMemo(
    () => chartDataMesConTotal.find(d => d.unidad === TOTAL_KEY) ?? null,
    [chartDataMesConTotal]
  );

  const chartDataMes = useMemo(
    () => chartDataMesConTotal.filter(d => d.unidad !== TOTAL_KEY),
    [chartDataMesConTotal]
  );

  const maxTasaMes = useMemo(
    () => techoEscala(chartDataMes.map(d => d.tasa)),
    [chartDataMes]
  );

  /** Tasa acumulada (Ene→mesSel) por unidad + TOTAL OOAD por separado — para "Por mes" + Acumulado.
   *  El acumulado ya viene resuelto del backend (MENSUAL_ACUMULADO) — el front solo lo muestra. */
  const chartDataAcumuladoConTotal = useMemo(
    () => buildChartDataMes(reporte, unidades, mesSel, FUENTE_ACUMULADO),
    [reporte, unidades, mesSel]
  );

  const totalAcumulado = useMemo(
    () => chartDataAcumuladoConTotal.find(d => d.unidad === TOTAL_KEY) ?? null,
    [chartDataAcumuladoConTotal]
  );

  const chartDataAcumulado = useMemo(
    () => chartDataAcumuladoConTotal.filter(d => d.unidad !== TOTAL_KEY),
    [chartDataAcumuladoConTotal]
  );

  const maxTasaAcumulado = useMemo(
    () => techoEscala(chartDataAcumulado.map(d => d.tasa)),
    [chartDataAcumulado]
  );

  /** Conteo Esperado/Medio/Bajo/Gris acumulado al mes seleccionado — para "Por mes" + Acumulado */
  const cumplimientoAcumulado = useMemo(() => contarSemaforo(chartDataAcumulado), [chartDataAcumulado]);

  /** Color de semáforo de cada unidad en el último mes disponible (tal cual lo manda el backend) */
  const unidadesStatus = useMemo(() => {
    const ultimoMes = mesesConDatos[mesesConDatos.length - 1];
    return buildChartDataMes(reporte, unidades, ultimoMes).map(({ unidad, color }) => ({ unidad, color }));
  }, [reporte, unidades, mesesConDatos]);

  /** Conteo Esperado/Medio/Bajo/Gris del mes seleccionado — para la vista "Por mes" */
  const cumplimientoMes = useMemo(() => contarSemaforo(chartDataMes), [chartDataMes]);

  /** Conteo Esperado/Medio/Bajo/Gris del último mes disponible (sin TOTAL) — para la vista "Por unidad" */
  const cumplimientoUltimoMes = useMemo(
    () => contarSemaforo(unidadesStatus.filter(u => u.unidad !== TOTAL_KEY)),
    [unidadesStatus]
  );

  /** Evolución acumulada mes a mes de la unidad seleccionada — siempre el rango completo disponible. */
  const chartDataAcumuladoUnidad = useMemo(
    () => (unidadSel === TOTAL_KEY ? [] : buildChartDataUnidad(reporte, unidadSel, mesesConDatos, FUENTE_ACUMULADO)),
    [reporte, unidadSel, mesesConDatos]
  );

  const maxTasaAcumuladoUnidad = useMemo(
    () => techoEscala(chartDataAcumuladoUnidad.map(d => d.tasa)),
    [chartDataAcumuladoUnidad]
  );

  /** Evolución del TOTAL OOAD acumulado mes a mes — siempre el rango completo disponible. */
  const chartDataAcumuladoTotal = useMemo(
    () => buildChartDataUnidad(reporte, TOTAL_KEY, mesesConDatos, FUENTE_ACUMULADO),
    [reporte, mesesConDatos]
  );

  const maxTasaAcumuladoTotal = useMemo(
    () => techoEscala(chartDataAcumuladoTotal.map(d => d.tasa)),
    [chartDataAcumuladoTotal]
  );

  /**
   * En "Por unidad" con el switch de Acumulado activo, usa la tasa acumulada para el color
   * del panel lateral. En las demás combinaciones usa el color del último mes (unidadesStatus).
   */
  const unidadesStatusDisplay = useMemo(() => {
    if (!(vistaGrafica === 'unidad' && acumulado) || !chartDataAcumuladoConTotal.length) return unidadesStatus;
    const map = Object.fromEntries(chartDataAcumuladoConTotal.map(d => [d.unidad, d.color]));
    return unidadesStatus.map(u => ({ ...u, color: map[u.unidad] ?? u.color }));
  }, [vistaGrafica, acumulado, unidadesStatus, chartDataAcumuladoConTotal]);

  /** Rangos de semáforo (texto del mapeo) para mostrar en la UI según indicador y vista activa */
  let rangosSem      = null;
  let rangosSemExtra = null;
  if (sem) {
    if (!esSemaforoAgrupado(sem)) {
      rangosSem = rangosDeMetas(sem);
    } else if (unidadSel === TOTAL_KEY) {
      rangosSem = rangosDeMetas(sem.OOAD, 'OOAD');
    } else if (vistaGrafica === 'mes') {
      [rangosSem, rangosSemExtra] = agruparRangos(sem);
    } else {
      const tipo = unidadTipoMap?.[unidadSel] ?? 'OOAD';
      rangosSem  = rangosDeMetas(sem[tipo], tipo);
    }
  }

  const indColor = COLOR_IND[indSel];
  const sinDatos = !cargando && mesesConDatos.length === 0;
  const hayDatos = !cargando && mesesConDatos.length > 0;

  return {
    anio, indSel, setIndSel, mesesConDatos,
    unidadSel, setUnidadSel,
    cargando, descargando, handleDescargar, handleDescargarInd,
    vistaGrafica, setVistaGrafica,
    acumulado, setAcumulado,
    mesSel, setMesSel,
    chartData, maxTasa,
    chartDataMes, maxTasaMes, totalMes,
    cumplimientoMes, cumplimientoUltimoMes,
    chartDataAcumulado, maxTasaAcumulado, totalAcumulado, cumplimientoAcumulado,
    chartDataAcumuladoUnidad, maxTasaAcumuladoUnidad,
    chartDataAcumuladoTotal, maxTasaAcumuladoTotal,
    unidadesStatus, unidadesStatusDisplay, indInfo, hgsSet,
    rangosSem, rangosSemExtra,
    indColor, sinDatos, hayDatos,
    COLOR_SEMAFORO, HGS_COLOR, HGS_BG,
    TOTAL_KEY,
  };
}
