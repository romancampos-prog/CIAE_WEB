import { useState, useEffect, useMemo } from 'react';
import { getIAASDatosGrafica, descargarIAASGuardado, infoBasicaInAass } from '../api/IAAS';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_CORTOS } from '../../shared/constantes/meses';
import { COLOR_IND, HGS_COLOR, HGS_BG } from '../constantes/colores';
import { COLOR_SEMAFORO } from '../../shared/constantes/semaforo';
import {
  TOTAL_KEY,
  calcularRangos01,
  buildChartDataUnidad,
  buildChartDataMes,
} from '../utils/calculos';
import { contarSemaforo } from '../../shared/utils/contarSemaforo';

// Clave real bajo la que el backend manda el total OOAD/Delegación ya calculado.
const DELEGACION_KEY = 'DELEGACION';

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
  const [acumulado, setAcumulado]         = useState(false);
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
    () => buildChartDataUnidad(datos, unidadSel, indSel),
    [datos, unidadSel, indSel]
  );

  const maxTasa = useMemo(
    () => Math.max(...chartData.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartData]
  );

  /** Todas las unidades en el mes seleccionado + TOTAL OOAD por separado */
  const chartDataMesConTotal = useMemo(
    () => buildChartDataMes(datos, mesSel, indSel),
    [datos, indSel, mesSel]
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

  /** Tasa acumulada (Ene→mesSel) por unidad + TOTAL OOAD por separado — para "Por mes" + Acumulado.
   *  El acumulado ya viene resuelto del backend (numerador_acum/denominador_acum/tasa_acum/
   *  color_acum) — el front solo busca el registro del mes y lo muestra. */
  const chartDataAcumuladoConTotal = useMemo(() => {
    if (!datos?.unidades || !mesSel) return [];

    const porUnidad = datos.unidades.map(u => {
      const arr = datos.datos?.[indSel]?.[u] ?? [];
      const reg = arr.find(r => r.mes === mesSel);
      return {
        unidad:      u,
        tasa:        reg?.tasa_acum        ?? 0,
        numerador:   reg?.numerador_acum   ?? null,
        denominador: reg?.denominador_acum ?? null,
        color:       reg?.color_acum       ?? 'Gris',
      };
    });

    const arrTotal = datos.datos?.[indSel]?.[DELEGACION_KEY] ?? [];
    const regTotal = arrTotal.find(r => r.mes === mesSel);
    return [
      ...porUnidad,
      {
        unidad:      TOTAL_KEY,
        tasa:        regTotal?.tasa_acum        ?? 0,
        numerador:   regTotal?.numerador_acum   ?? null,
        denominador: regTotal?.denominador_acum ?? null,
        color:       regTotal?.color_acum       ?? 'Gris',
      },
    ];
  }, [datos, indSel, mesSel]);

  /** TOTAL aparte: su magnitud no es comparable a una sola unidad, no debe compartir escala */
  const totalAcumulado = useMemo(
    () => chartDataAcumuladoConTotal.find(d => d.unidad === TOTAL_KEY) ?? null,
    [chartDataAcumuladoConTotal]
  );

  const chartDataAcumulado = useMemo(
    () => chartDataAcumuladoConTotal.filter(d => d.unidad !== TOTAL_KEY),
    [chartDataAcumuladoConTotal]
  );

  const maxTasaAcumulado = useMemo(
    () => Math.max(...chartDataAcumulado.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumulado]
  );

  /** Conteo Verde/Amarillo/Rojo/Gris acumulado al mes seleccionado — para "Por mes" + Acumulado */
  const cumplimientoAcumulado = useMemo(() => contarSemaforo(chartDataAcumulado), [chartDataAcumulado]);

  /** Color de semáforo de cada unidad en el último mes disponible (tal cual lo manda el backend) */
  const unidadesStatus = useMemo(() => {
    if (!datos?.unidades) return [];
    const ultimoMes = datos.meses_con_datos?.[datos.meses_con_datos.length - 1];

    const porUnidad = datos.unidades.map(u => {
      const arr = datos.datos?.[indSel]?.[u] ?? [];
      const reg = arr.find(r => r.mes === ultimoMes);
      return { unidad: u, color: reg?.color ?? 'Gris' };
    });

    const arrTotal  = datos.datos?.[indSel]?.[DELEGACION_KEY] ?? [];
    const regTotal  = arrTotal.find(r => r.mes === ultimoMes);
    return [
      ...porUnidad,
      { unidad: TOTAL_KEY, color: regTotal?.color ?? 'Gris' },
    ];
  }, [datos, indSel]);

  /** Conteo Verde/Amarillo/Rojo/Gris del mes seleccionado — para la vista "Por mes" */
  const cumplimientoMes = useMemo(() => contarSemaforo(chartDataMes), [chartDataMes]);

  /** Conteo Verde/Amarillo/Rojo/Gris del último mes disponible (sin TOTAL) — para la vista "Por unidad" */
  const cumplimientoUltimoMes = useMemo(
    () => contarSemaforo(unidadesStatus.filter(u => u.unidad !== TOTAL_KEY)),
    [unidadesStatus]
  );

  /** Evolución acumulada mes a mes de la unidad seleccionada — siempre el rango completo disponible.
   *  Lee directo numerador_acum/denominador_acum/tasa_acum/color_acum que ya manda el backend. */
  const chartDataAcumuladoUnidad = useMemo(() => {
    if (!datos?.unidades || !unidadSel || unidadSel === TOTAL_KEY) return [];
    const mesesHasta = datos.meses_con_datos ?? [];
    const arr = datos.datos?.[indSel]?.[unidadSel] ?? [];

    return mesesHasta.map(mes => {
      const reg = arr.find(r => r.mes === mes);
      return {
        mes:         MESES_CORTOS[parseInt(mes) - 1],
        tasa:        reg?.tasa_acum        ?? 0,
        numerador:   reg?.numerador_acum   ?? null,
        denominador: reg?.denominador_acum ?? null,
        color:       reg?.color_acum       ?? 'Gris',
      };
    });
  }, [datos, indSel, unidadSel]);

  const maxTasaAcumuladoUnidad = useMemo(
    () => Math.max(...chartDataAcumuladoUnidad.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumuladoUnidad]
  );

  /** Evolución del TOTAL OOAD acumulado mes a mes — siempre el rango completo disponible.
   *  Usa directamente los registros "DELEGACION" (ya acumulados) que manda el backend. */
  const chartDataAcumuladoTotal = useMemo(() => {
    if (!datos?.unidades) return [];
    const mesesHasta = datos.meses_con_datos ?? [];
    const arr = datos.datos?.[indSel]?.[DELEGACION_KEY] ?? [];

    return mesesHasta.map(mes => {
      const reg = arr.find(r => r.mes === mes);
      return {
        mes:         MESES_CORTOS[parseInt(mes) - 1],
        tasa:        reg?.tasa_acum        ?? 0,
        numerador:   reg?.numerador_acum   ?? null,
        denominador: reg?.denominador_acum ?? null,
        color:       reg?.color_acum       ?? 'Gris',
      };
    });
  }, [datos, indSel]);

  const maxTasaAcumuladoTotal = useMemo(
    () => Math.max(...chartDataAcumuladoTotal.map(d => d.tasa ?? 0), 1) * 1.25,
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
