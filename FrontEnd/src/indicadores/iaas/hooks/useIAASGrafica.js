import { useState, useEffect, useMemo } from 'react';
import { getIAASDatosGrafica, descargarIAASGuardado, infoBasicaInAass } from '../api/IAAS';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_CORTOS } from '../../shared/constantes/meses';
import { COLOR_IND, HGS_COLOR, HGS_BG } from '../constantes/colores';
import { COLOR_SEMAFORO } from '../../shared/constantes/semaforo';
import {
  TOTAL_KEY,
  calcularColorIAAS,
  calcularRangos01,
  buildChartDataUnidad,
  buildChartDataMes,
} from '../utils/calculos';

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
  const [datos, setDatos]                 = useState(null);
  const [unidadSel, setUnidadSel]         = useState('');
  const [localIndSel, setLocalIndSel]     = useState('IAAS 02');

  const indSel    = controlled ? extIndSel    : localIndSel;
  const setIndSel = controlled ? (onExtChange ?? (() => {})) : setLocalIndSel;
  const [cargando, setCargando]           = useState(false);
  const [descargando, setDescargando]     = useState(false);
  const [infoAllInAass, setInfoIAAS]      = useState({});
  const [vistaGrafica, setVistaGrafica]   = useState('unidad');
  const [mesSel, setMesSel]               = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setDatos(null);
        setUnidadSel('');
        const d = await getIAASDatosGrafica(anio);
        setDatos(d);
        if (d.unidades?.length > 0) setUnidadSel(d.unidades[0]);
        if (d.meses_con_datos?.length > 0)
          setMesSel(d.meses_con_datos[d.meses_con_datos.length - 1]);
        const respuestaInfo = await infoBasicaInAass();
        setInfoIAAS(respuestaInfo.data);
      } catch (error) {
        console.error('Error cargando datos IAAS:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [anio]);

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

  /** Tendencia mensual de la unidad seleccionada (o TOTAL OOAD) */
  const chartData = useMemo(
    () => buildChartDataUnidad(datos, unidadSel, indSel, indInfo, sem, unidadTipoMap),
    [datos, unidadSel, indSel, indInfo, sem, unidadTipoMap]
  );

  const maxTasa = useMemo(
    () => Math.max(...chartData.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartData]
  );

  /** Todas las unidades en el mes seleccionado + TOTAL OOAD por separado */
  const chartDataMesConTotal = useMemo(
    () => buildChartDataMes(datos, mesSel, indSel, indInfo, sem, unidadTipoMap),
    [datos, indSel, mesSel, indInfo, sem, unidadTipoMap]
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
    () => Math.max(...chartDataMes.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataMes]
  );

  /** Tasa acumulada (Ene→mesSel) por unidad + TOTAL OOAD */
  const chartDataAcumulado = useMemo(() => {
    if (!datos?.unidades || !mesSel || !indInfo) return [];
    const mesNum = parseInt(mesSel);
    const factor = indInfo?.semaforo?.Tasa ?? 100;
    let grandNum = 0, grandDen = 0;

    const porUnidad = datos.unidades.map(u => {
      const arr     = datos.datos?.[indSel]?.[u] ?? [];
      const hasta   = arr.filter(r => parseInt(r.mes) <= mesNum);
      const acumNum = hasta.reduce((s, r) => s + (r.numerador   ?? 0), 0);
      const acumDen = hasta.reduce((s, r) => s + (r.denominador ?? 0), 0);
      const acumTasa = acumDen > 0 ? (acumNum / acumDen) * factor : 0;
      grandNum += acumNum;
      grandDen += acumDen;
      return {
        unidad: u, tasa: acumTasa,
        numerador: acumNum, denominador: acumDen,
        color: calcularColorIAAS(acumTasa, u, sem, indSel, unidadTipoMap),
      };
    });

    const grandTasa = grandDen > 0 ? (grandNum / grandDen) * factor : 0;
    return [
      ...porUnidad,
      {
        unidad: TOTAL_KEY, tasa: grandTasa,
        numerador: grandNum, denominador: grandDen,
        color: calcularColorIAAS(grandTasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
      },
    ];
  }, [datos, indSel, mesSel, indInfo, sem, unidadTipoMap]);

  const maxTasaAcumulado = useMemo(
    () => Math.max(...chartDataAcumulado.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumulado]
  );

  /** Color de semáforo de cada unidad en el último mes disponible */
  const unidadesStatus = useMemo(() => {
    if (!datos?.unidades) return [];
    const ultimoMes = datos.meses_con_datos?.[datos.meses_con_datos.length - 1];
    const factor = indInfo?.semaforo?.Tasa ?? 100;
    let grandNum = 0, grandDen = 0;

    const porUnidad = datos.unidades.map(u => {
      const arr = datos.datos?.[indSel]?.[u] ?? [];
      const reg = arr.find(r => r.mes === ultimoMes);
      grandNum += reg?.numerador   ?? 0;
      grandDen += reg?.denominador ?? 0;
      return { unidad: u, color: reg?.color ?? 'Gris' };
    });

    const grandTasa = grandDen > 0 ? (grandNum / grandDen) * factor : 0;
    return [
      ...porUnidad,
      { unidad: TOTAL_KEY, color: calcularColorIAAS(grandTasa, TOTAL_KEY, sem, indSel, unidadTipoMap) },
    ];
  }, [datos, indSel, indInfo, sem, unidadTipoMap]);

  /** Evolución acumulada mes a mes de la unidad seleccionada */
  const chartDataAcumuladoUnidad = useMemo(() => {
    if (!datos?.unidades || !mesSel || !indInfo || !unidadSel || unidadSel === TOTAL_KEY) return [];
    const mesNum = parseInt(mesSel);
    const factor = indInfo?.semaforo?.Tasa ?? 100;
    const mesesHasta = datos.meses_con_datos.filter(m => parseInt(m) <= mesNum);
    const arr = datos.datos?.[indSel]?.[unidadSel] ?? [];

    return mesesHasta.map(mes => {
      const mesLim = parseInt(mes);
      const hasta  = arr.filter(r => parseInt(r.mes) <= mesLim);
      const cumNum = hasta.reduce((s, r) => s + (r.numerador   ?? 0), 0);
      const cumDen = hasta.reduce((s, r) => s + (r.denominador ?? 0), 0);
      const tasa   = cumDen > 0 ? cumNum / cumDen * factor : 0;
      return {
        mes: MESES_CORTOS[parseInt(mes) - 1],
        tasa, numerador: cumNum, denominador: cumDen,
        color: calcularColorIAAS(tasa, unidadSel, sem, indSel, unidadTipoMap),
      };
    });
  }, [datos, indSel, unidadSel, mesSel, indInfo, sem, unidadTipoMap]);

  const maxTasaAcumuladoUnidad = useMemo(
    () => Math.max(...chartDataAcumuladoUnidad.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumuladoUnidad]
  );

  /** Evolución del TOTAL OOAD acumulado mes a mes */
  const chartDataAcumuladoTotal = useMemo(() => {
    if (!datos?.unidades || !mesSel || !indInfo) return [];
    const mesNum = parseInt(mesSel);
    const factor = indInfo?.semaforo?.Tasa ?? 100;
    const mesesHasta = datos.meses_con_datos.filter(m => parseInt(m) <= mesNum);

    return mesesHasta.map(mes => {
      const mesLim = parseInt(mes);
      let cumNum = 0, cumDen = 0;
      for (const u of datos.unidades) {
        const arr = datos.datos?.[indSel]?.[u] ?? [];
        for (const r of arr) {
          if (parseInt(r.mes) <= mesLim) {
            cumNum += r.numerador   ?? 0;
            cumDen += r.denominador ?? 0;
          }
        }
      }
      const tasa = cumDen > 0 ? cumNum / cumDen * factor : 0;
      return {
        mes: MESES_CORTOS[parseInt(mes) - 1],
        tasa, numerador: cumNum, denominador: cumDen,
        color: calcularColorIAAS(tasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
      };
    });
  }, [datos, indSel, mesSel, indInfo, sem, unidadTipoMap]);

  const maxTasaAcumuladoTotal = useMemo(
    () => Math.max(...chartDataAcumuladoTotal.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumuladoTotal]
  );

  /**
   * Cuando la vista es acumulado, usa la tasa acumulada para el color del panel lateral.
   * En las demás vistas usa el color del último mes (unidadesStatus).
   */
  const unidadesStatusDisplay = useMemo(() => {
    if (vistaGrafica !== 'acumulado' || !chartDataAcumulado.length) return unidadesStatus;
    const map = Object.fromEntries(chartDataAcumulado.map(d => [d.unidad, d.color]));
    return unidadesStatus.map(u => ({ ...u, color: map[u.unidad] ?? u.color }));
  }, [vistaGrafica, unidadesStatus, chartDataAcumulado]);

  /** Rangos de semáforo formateados para mostrar en la UI según indicador y vista activa */
  let rangosSem      = null;
  let rangosSemExtra = null;
  if (sem) {
    if (indSel === 'IAAS 01') {
      if (unidadSel === TOTAL_KEY) {
        rangosSem = calcularRangos01(sem.OOAD ?? sem.HGZ ?? sem.HGR, 'OOAD');
      } else if (vistaGrafica === 'mes') {
        rangosSem      = calcularRangos01(sem.HGS, 'HGS');
        rangosSemExtra = calcularRangos01(sem.HGZ ?? sem.HGR ?? sem.OOAD, 'HGZ/HGR');
      } else {
        const tipo = unidadTipoMap?.[unidadSel] ?? 'OOAD';
        rangosSem  = calcularRangos01(sem[tipo], tipo);
      }
    } else if (sem.Esperado) {
      rangosSem = {
        Verde:    `${sem.Esperado.Mayor} – ${sem.Esperado.Menor}`,
        Amarillo: `> ${sem.Esperado.Menor} – ≤ ${sem.Medio?.Menor ?? '?'}`,
        Rojo:     `< ${sem.Esperado.Mayor}  ó  > ${sem.Medio?.Menor ?? '?'}`,
      };
    }
  }

  const indColor = COLOR_IND[indSel];
  const sinDatos = !cargando && (!datos || datos.meses_con_datos?.length === 0);
  const hayDatos = !cargando && datos?.meses_con_datos?.length > 0;

  return {
    anio, datos, indSel, setIndSel,
    unidadSel, setUnidadSel,
    cargando, descargando, handleDescargar, handleDescargarInd,
    vistaGrafica, setVistaGrafica,
    mesSel, setMesSel,
    chartData, maxTasa,
    chartDataMes, maxTasaMes, totalMes,
    chartDataAcumulado, maxTasaAcumulado,
    chartDataAcumuladoUnidad, maxTasaAcumuladoUnidad,
    chartDataAcumuladoTotal, maxTasaAcumuladoTotal,
    unidadesStatus, unidadesStatusDisplay, indInfo, hgsSet,
    rangosSem, rangosSemExtra,
    indColor, sinDatos, hayDatos,
    COLOR_SEMAFORO, HGS_COLOR, HGS_BG,
    TOTAL_KEY,
  };
}
