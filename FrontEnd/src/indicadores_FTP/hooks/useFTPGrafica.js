import { useState, useEffect, useMemo } from 'react';
import { getAllIndicadores, getFTPDatosGrafica, getIndicador } from '../api/indicadores';
import { getReporte, generarCategoria } from '../../reportes/api/reportes';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_CORTOS, MESES_LARGOS_ARR } from '../../shared/constants/meses';
import { CAT_COLOR } from '../constants/colores';

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

  const todosLosIndicadores = useMemo(() => {
    const acc = [];
    Object.values(listaIndicadores).forEach(cat => {
      (cat.indicadores ?? []).forEach(ind => acc.push(ind));
    });
    return acc;
  }, [listaIndicadores]);

  const chartData = useMemo(() => {
    if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];
    const arr = datos.datos?.[unidadSel] ?? [];
    return datos.meses_con_datos.map(mes => {
      const reg      = arr.find(r => r.mes === mes);
      const esSemana = !!reg?.semana;
      const mesCorto = MESES_CORTOS[parseInt(mes) - 1];
      return {
        mes:         esSemana ? `S${reg.semana}·${mesCorto}` : mesCorto,
        mesNum:      parseInt(mes),
        tasa:        reg?.tasa        ?? 0,
        numerador:   reg?.numerador   ?? 0,
        denominador: reg?.denominador ?? 0,
        color:       reg?.color       ?? 'Rojo',
        esSemana,
        semana:      reg?.semana      ?? null,
      };
    });
  }, [datos, unidadSel]);

  const maxTasa = useMemo(
    () => Math.max(...chartData.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartData]
  );

  const chartDataMes = useMemo(() => {
    if (!datos?.unidades || !mesSel) return [];
    return datos.unidades.map(u => {
      const arr = datos.datos?.[u] ?? [];
      const reg = arr.find(r => r.mes === mesSel);
      return {
        unidad:      u,
        tasa:        reg?.tasa        ?? 0,
        numerador:   reg?.numerador   ?? 0,
        denominador: reg?.denominador ?? 0,
        color:       reg?.color       ?? 'Rojo',
      };
    });
  }, [datos, mesSel]);

  const maxTasaMes = useMemo(
    () => Math.max(...chartDataMes.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataMes]
  );

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

  const esSemPorMes = useMemo(() => {
    const sem = indInfo?.semaforo;
    if (!sem) return false;
    return MESES_LARGOS_ARR.some(m => m in sem);
  }, [indInfo]);

  const rangosSem = useMemo(() => {
    const sem = indInfo?.semaforo;
    if (!sem) return null;
    const nombreMes = MESES_LARGOS_ARR[mesParaSem - 1];
    const limites   = (nombreMes && sem[nombreMes]) ? sem[nombreMes] : sem;
    const esp       = limites?.Esperado;
    if (esp === undefined) return null;
    const tieneAlto = 'Alto' in limites;
    const critico   = tieneAlto ? limites.Alto : limites.Bajo;
    return tieneAlto
      ? { Verde: `≤ ${esp}`, Amarillo: `> ${esp} – < ${critico}`, Rojo: `≥ ${critico}`, _mes: nombreMes }
      : { Verde: `≥ ${esp}`, Amarillo: `> ${critico} – < ${esp}`, Rojo: `≤ ${critico}`, _mes: nombreMes };
  }, [indInfo, mesParaSem]);

  const indColor  = CAT_COLOR[indSel?.split(' ')[0]] ?? '#0b5445';
  const categoria = indSel?.split(' ')[0] ?? '';

  const descargarIndicador = async (mes) => {
    if (!indSel || !mes || descargando) return;
    setDescargando(true);
    try {
      const res = await getReporte(indSel, { ano: anio, mes });
      if (res.success) descargarB64(res.data.archivo_b64, res.data.nombre_archivo);
    } catch { /* silencioso */ }
    finally { setDescargando(false); }
  };

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
