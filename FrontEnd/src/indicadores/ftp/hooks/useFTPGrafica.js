import { useState, useEffect, useMemo } from 'react';
import { getAllIndicadores, getFTPDatosGrafica, getIndicador } from '../api/indicadores';
import { getReporte, generarCategoria } from '../../reportes_grafica/api/reportes';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_LARGOS_ARR } from '../../shared/constantes/meses';
import { CAT_COLOR } from '../constantes/colores';
import {
  buildFTPChartDataUnidad,
  buildFTPChartDataMes,
  calcularRangosFTP,
} from '../utils/calculos';

/**
 * Hook principal de grÃ¡ficas FTP.
 * Carga la lista de indicadores, los datos histÃ³ricos del indicador seleccionado y
 * calcula los datasets para las vistas por unidad y por mes.
 *
 * Puede operar en modo controlado (indicador gestionado desde el componente padre)
 * o en modo independiente (el hook gestiona su propio `indSel`).
 *
 * @param {number|null} hoveredMes - Mes sobre el que el usuario tiene el cursor (para el semÃ¡foro)
 * @param {string} [extIndSel] - Indicador seleccionado externamente (modo controlado)
 * @param {Function} [onExtChange] - Callback al cambiar el indicador en modo controlado
 * @returns {Object} Estado y datos listos para renderizar las grÃ¡ficas
 */
export function useFTPGrafica(hoveredMes, extIndSel, onExtChange) {
  const controlled = extIndSel !== undefined;
  const [anio]                          = useState('2026');
  const [listaIndicadores, setLista]    = useState({});
  const [localIndSel, setLocalIndSel]   = useState('');

  const indSel    = controlled ? extIndSel    : localIndSel;
  const setIndSel = controlled ? (onExtChange ?? (() => {})) : setLocalIndSel;
  const [indInfo, setIndInfo]           = useState(null);
  const [datos, setDatos]               = useState(null);
  const [unidadSel, setUnidadSel]       = useState('');
  const [cargando, setCargando]         = useState(false);
  const [descargando, setDescargando]   = useState(false);
  const [vistaGrafica, setVistaGrafica] = useState('unidad');
  const [mesSel, setMesSel]             = useState('');

  /** Carga inicial de la lista de indicadores agrupados por categorÃ­a */
  useEffect(() => {
    getAllIndicadores().then(res => {
      const lista = res?.data ?? {};
      setLista(lista);
      if (!controlled) {
        const primero = Object.values(lista)[0]?.indicadores?.[0];
        if (primero) setLocalIndSel(primero);
      }
    }).catch(() => {});
  }, []);

  /** Recarga datos histÃ³ricos y ficha tÃ©cnica cuando cambia el indicador o el aÃ±o */
  useEffect(() => {
    if (!indSel) return;
    setCargando(true);
    setDatos(null);
    setIndInfo(null);
    setUnidadSel('');
    Promise.all([
      getFTPDatosGrafica(indSel, anio),
      getIndicador(indSel).catch(() => ({ data: null })),
    ]).then(([d, infoRes]) => {
      setDatos(d);
      setIndInfo(infoRes?.data ?? null);
      if (d.unidades?.length > 0) setUnidadSel(d.unidades[0]);
      if (d.meses_con_datos?.length > 0)
        setMesSel(d.meses_con_datos[d.meses_con_datos.length - 1]);
    }).finally(() => setCargando(false));
  }, [indSel, anio]);

  /** Lista plana de todos los indicadores (para el selector de la UI) */
  const todosLosIndicadores = useMemo(() => {
    const acc = [];
    Object.values(listaIndicadores).forEach(cat => {
      (cat.indicadores ?? []).forEach(ind => acc.push(ind));
    });
    return acc;
  }, [listaIndicadores]);

  /** Tendencia mensual de la unidad seleccionada */
  const chartData = useMemo(
    () => buildFTPChartDataUnidad(datos, unidadSel),
    [datos, unidadSel]
  );

  const maxTasa = useMemo(
    () => Math.max(...chartData.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartData]
  );

  /** Todas las unidades en el mes seleccionado (TOTAL al final) */
  const chartDataMes = useMemo(
    () => buildFTPChartDataMes(datos, mesSel),
    [datos, mesSel]
  );

  const maxTasaMes = useMemo(
    () => Math.max(...chartDataMes.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataMes]
  );

  /** Color de semÃ¡foro de cada unidad en el Ãºltimo mes disponible */
  const unidadesStatus = useMemo(() => {
    if (!datos?.unidades) return [];
    const ultimoMes = datos.meses_con_datos?.[datos.meses_con_datos.length - 1];
    return datos.unidades.map(u => {
      const arr = datos.datos?.[u] ?? [];
      const reg = arr.find(r => r.mes === ultimoMes);
      return { unidad: u, color: reg?.color ?? 'Gris' };
    });
  }, [datos]);

  const ultimoMesNum = useMemo(
    () => parseInt(datos?.meses_con_datos?.at(-1) ?? '1'),
    [datos]
  );
  const mesParaSem = vistaGrafica === 'unidad'
    ? (hoveredMes ?? ultimoMesNum)
    : parseInt(mesSel || '1');

  /** True cuando el indicador tiene umbrales de semÃ¡foro por mes (ej. CACU) */
  const esSemPorMes = useMemo(() => {
    const sem = indInfo?.semaforo;
    if (!sem) return false;
    return MESES_LARGOS_ARR.some(m => m in sem);
  }, [indInfo]);

  /** Textos de semÃ¡foro formateados para el mes/unidad activa */
  const rangosSem = useMemo(
    () => calcularRangosFTP(indInfo, mesParaSem, MESES_LARGOS_ARR),
    [indInfo, mesParaSem]
  );

  const indColor  = CAT_COLOR[indSel?.split(' ')[0]] ?? '#0b5445';
  const categoria = indSel?.split(' ')[0] ?? '';

  /**
   * Descarga el Excel de un indicador especÃ­fico para un mes dado.
   * @param {string} mes - Mes en formato "MM"
   */
  const descargarIndicador = async (mes) => {
    if (!indSel || !mes || descargando) return;
    setDescargando(true);
    try {
      const res = await getReporte(indSel, { ano: anio, mes });
      if (res.success) descargarB64(res.data.archivo_b64, res.data.nombre_archivo);
    } catch { /* silencioso */ }
    finally { setDescargando(false); }
  };

  /**
   * Descarga el Excel de todos los indicadores de una categorÃ­a para un mes dado.
   * @param {string} mes - Mes en formato "MM"
   */
  const descargarCategoria = async (mes) => {
    if (!categoria || !mes || descargando) return;
    setDescargando(true);
    try {
      const res = await generarCategoria(categoria, { ano: anio, mes });
      if (res.success) descargarB64(res.data.archivo_b64, res.data.nombre_archivo);
    } catch { /* silencioso */ }
    finally { setDescargando(false); }
  };

  return {
    anio, indSel, setIndSel, indInfo,
    datos, unidadSel, setUnidadSel,
    cargando, descargando, vistaGrafica, setVistaGrafica,
    mesSel, setMesSel,
    listaIndicadores,
    todosLosIndicadores, chartData, maxTasa,
    chartDataMes, maxTasaMes, unidadesStatus,
    rangosSem, esSemPorMes, indColor, categoria,
    descargarIndicador, descargarCategoria,
  };
}
