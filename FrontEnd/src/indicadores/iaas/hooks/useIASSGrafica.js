import { useState, useEffect, useMemo } from 'react';
import { getIASSDatosGrafica, descargarIASSGuardado, infoBasicaInAass } from '../api/IASS';
import { descargarB64 } from '@indShared/utilidades/download';
import { MESES_CORTOS } from '@indShared/constantes/meses';
import { COLOR_IND, HGS_COLOR, HGS_BG } from '../constantes/colores';
import { COLOR_SEMAFORO } from '@indShared/constantes/semaforo';

export const TOTAL_KEY = 'TOTAL OOAD';

// Devuelve la clave del semáforo que corresponde a esta unidad en IAAS 01.
// TOTAL_KEY → 'OOAD'; unidad clasificada → su tipo; sin clasificar → 'OOAD'.
function _tipoSem(unidad, unidadTipoMap) {
  if (unidad === TOTAL_KEY) return 'OOAD';
  return unidadTipoMap?.[unidad] ?? 'OOAD';
}

function calcularColorIASS(tasa, unidad, sem, indSel, unidadTipoMap) {
  if (!sem) return 'Rojo';
  if (indSel === 'IAAS 01') {
    const tipo     = _tipoSem(unidad, unidadTipoMap);
    const umbrales = sem[tipo];
    if (!umbrales?.Esperado) return 'Rojo';
    const esp = umbrales.Esperado;
    const med = umbrales.Medio ?? {};
    if (esp.Mayor <= tasa && tasa <= esp.Menor) return 'Verde';
    if (med.Mayor <= tasa && tasa <  med.Menor) return 'Amarillo';
    return 'Rojo';
  }
  const esp = sem.Esperado ?? {};
  const med = sem.Medio    ?? {};
  if (tasa >  (esp.Menor ?? 0)) return 'Rojo';
  if (tasa >= (esp.Mayor ?? 0)) return 'Verde';
  if (tasa >= (med.Mayor ?? 0)) return 'Amarillo';
  return 'Rojo';
}

function calcular01(umbrales, label) {
  if (!umbrales?.Esperado) return null;
  const esp = umbrales.Esperado;
  const med = umbrales.Medio ?? {};
  return {
    _label:   label,
    Verde:    `${esp.Mayor} – ${esp.Menor}`,
    Amarillo: `> ${med.Mayor ?? '?'} – < ${esp.Mayor}`,
    Rojo:     `< ${med.Mayor ?? '?'}  ó  > ${esp.Menor}`,
  };
}

export function useIASSGrafica(extIndSel, onExtChange) {
  const controlled = extIndSel !== undefined;
  const [anio]                            = useState('2026');
  const [datos, setDatos]                 = useState(null);
  const [unidadSel, setUnidadSel]         = useState('');
  const [localIndSel, setLocalIndSel]     = useState('IAAS 02');

  const indSel    = controlled ? extIndSel    : localIndSel;
  const setIndSel = controlled ? (onExtChange ?? (() => {})) : setLocalIndSel;
  const [cargando, setCargando]           = useState(false);
  const [descargando, setDescargando]     = useState(false);
  const [infoAllInAass, setInfoIASS]      = useState({});
  const [vistaGrafica, setVistaGrafica]   = useState('unidad');
  const [mesSel, setMesSel]               = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setDatos(null);
        setUnidadSel('');
        const d = await getIASSDatosGrafica(anio);
        setDatos(d);
        if (d.unidades?.length > 0) setUnidadSel(d.unidades[0]);
        if (d.meses_con_datos?.length > 0)
          setMesSel(d.meses_con_datos[d.meses_con_datos.length - 1]);
        const respuestaInfo = await infoBasicaInAass();
        setInfoIASS(respuestaInfo.data);
      } catch (error) {
        console.error('Error cargando datos IASS:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [anio]);

  const _descargar = (indicador = null) => {
    setDescargando(true);
    descargarIASSGuardado(anio, indicador)
      .then(res => descargarB64(res.archivo_b64, res.nombre_archivo))
      .catch(() => {})
      .finally(() => setDescargando(false));
  };

  const handleDescargar    = ()    => _descargar(null);
  const handleDescargarInd = (ind) => _descargar(ind);

  // Derived early so all useMemos below can reference them
  const indInfo       = infoAllInAass?.[indSel];
  const sem           = indInfo?.semaforo;
  const hgsSet        = useMemo(() => new Set(indInfo?.unidades_hgs ?? []), [indInfo]);
  const unidadTipoMap = useMemo(() => indInfo?.unidad_tipo ?? {}, [indInfo]);

  // ── Por unidad: tendencia mensual (o agregado TOTAL OOAD) ──
  const chartData = useMemo(() => {
    if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];
    const factor = indInfo?.semaforo?.Tasa ?? 100;

    if (unidadSel === TOTAL_KEY) {
      return datos.meses_con_datos.map(mes => {
        let sumNum = 0, sumDen = 0;
        for (const u of datos.unidades ?? []) {
          const arr = datos.datos?.[indSel]?.[u] ?? [];
          const reg = arr.find(r => r.mes === mes);
          sumNum += reg?.numerador   ?? 0;
          sumDen += reg?.denominador ?? 0;
        }
        const tasa = sumDen > 0 ? (sumNum / sumDen) * factor : 0;
        return {
          mes: MESES_CORTOS[parseInt(mes) - 1],
          tasa, numerador: sumNum, denominador: sumDen,
          color: calcularColorIASS(tasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
        };
      });
    }

    const arr = datos.datos?.[indSel]?.[unidadSel] ?? [];
    return datos.meses_con_datos.map(mes => {
      const reg = arr.find(r => r.mes === mes);
      return {
        mes:         MESES_CORTOS[parseInt(mes) - 1],
        tasa:        reg?.tasa        ?? 0,
        numerador:   reg?.numerador   ?? 0,
        denominador: reg?.denominador ?? 0,
        color:       reg?.color       ?? 'Rojo',
      };
    });
  }, [datos, unidadSel, indSel, indInfo, sem, unidadTipoMap]);

  const maxTasa = useMemo(
    () => Math.max(...chartData.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartData]
  );

  // ── Por mes: todas las unidades en el mes seleccionado + TOTAL OOAD ──
  const chartDataMes = useMemo(() => {
    if (!datos?.unidades || !mesSel) return [];
    const factor = indInfo?.semaforo?.Tasa ?? 100;
    let grandNum = 0, grandDen = 0;

    const porUnidad = datos.unidades.map(u => {
      const arr = datos.datos?.[indSel]?.[u] ?? [];
      const reg = arr.find(r => r.mes === mesSel);
      grandNum += reg?.numerador   ?? 0;
      grandDen += reg?.denominador ?? 0;
      return {
        unidad:      u,
        tasa:        reg?.tasa        ?? 0,
        numerador:   reg?.numerador   ?? 0,
        denominador: reg?.denominador ?? 0,
        color:       reg?.color       ?? 'Rojo',
      };
    });

    const grandTasa = grandDen > 0 ? (grandNum / grandDen) * factor : 0;
    return [
      ...porUnidad,
      {
        unidad: TOTAL_KEY, tasa: grandTasa,
        numerador: grandNum, denominador: grandDen,
        color: calcularColorIASS(grandTasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
      },
    ];
  }, [datos, indSel, mesSel, indInfo, sem, unidadTipoMap]);

  const maxTasaMes = useMemo(
    () => Math.max(...chartDataMes.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataMes]
  );

  // ── Status de unidades (semáforo último mes) + TOTAL OOAD ──
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
      { unidad: TOTAL_KEY, color: calcularColorIASS(grandTasa, TOTAL_KEY, sem, indSel, unidadTipoMap) },
    ];
  }, [datos, indSel, indInfo, sem, unidadTipoMap]);

  // ── Acumulado (por unidades): Ene→mesSel por unidad + TOTAL OOAD al final ──
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
        color: calcularColorIASS(acumTasa, u, sem, indSel, unidadTipoMap),
      };
    });

    const grandTasa = grandDen > 0 ? (grandNum / grandDen) * factor : 0;
    return [
      ...porUnidad,
      {
        unidad: TOTAL_KEY, tasa: grandTasa,
        numerador: grandNum, denominador: grandDen,
        color: calcularColorIASS(grandTasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
      },
    ];
  }, [datos, indSel, mesSel, indInfo, sem, unidadTipoMap]);

  const maxTasaAcumulado = useMemo(
    () => Math.max(...chartDataAcumulado.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumulado]
  );

  // Colores del panel según la vista activa: en acumulado usa la tasa acumulada,
  // en las demás vistas usa el color del último mes (unidadesStatus).
  const unidadesStatusDisplay = useMemo(() => {
    if (vistaGrafica !== 'acumulado' || !chartDataAcumulado.length) return unidadesStatus;
    const map = Object.fromEntries(chartDataAcumulado.map(d => [d.unidad, d.color]));
    return unidadesStatus.map(u => ({ ...u, color: map[u.unidad] ?? u.color }));
  }, [vistaGrafica, unidadesStatus, chartDataAcumulado]);

  // ── Acumulado por unidad mes a mes: evolución acumulada de la unidad seleccionada ──
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
        color: calcularColorIASS(tasa, unidadSel, sem, indSel, unidadTipoMap),
      };
    });
  }, [datos, indSel, unidadSel, mesSel, indInfo, sem, unidadTipoMap]);

  const maxTasaAcumuladoUnidad = useMemo(
    () => Math.max(...chartDataAcumuladoUnidad.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumuladoUnidad]
  );

  // ── Acumulado TOTAL mes a mes: evolución del TOTAL OOAD acumulado por mes ──
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
        color: calcularColorIASS(tasa, TOTAL_KEY, sem, indSel, unidadTipoMap),
      };
    });
  }, [datos, indSel, mesSel, indInfo, sem, unidadTipoMap]);

  const maxTasaAcumuladoTotal = useMemo(
    () => Math.max(...chartDataAcumuladoTotal.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumuladoTotal]
  );

  let rangosSem      = null;
  let rangosSemExtra = null;
  if (sem) {
    if (indSel === 'IAAS 01') {
      if (unidadSel === TOTAL_KEY) {
        // Vista TOTAL OOAD → solo mostrar OOAD
        rangosSem = calcular01(sem.OOAD ?? sem.HGZ ?? sem.HGR, 'OOAD');
      } else if (vistaGrafica === 'mes') {
        // Por mes (mezcla de tipos) → mostrar HGS + HGZ/HGR
        rangosSem      = calcular01(sem.HGS, 'HGS');
        rangosSemExtra = calcular01(sem.HGZ ?? sem.HGR ?? sem.OOAD, 'HGZ/HGR');
      } else {
        // Unidad concreta → mostrar el tipo real de semáforo que le corresponde
        const tipo = unidadTipoMap?.[unidadSel] ?? 'OOAD';
        rangosSem  = calcular01(sem[tipo], tipo);
      }
    } else if (sem.Esperado) {
      rangosSem = {
        Verde:    `${sem.Esperado.Mayor} – ${sem.Esperado.Menor}`,
        Amarillo: `> ${sem.Esperado.Menor} – ≤ ${sem.Medio?.Menor ?? '?'}`,
        Rojo:     `< ${sem.Esperado.Mayor}  ó  > ${sem.Medio?.Menor ?? '?'}`,
      };
    }
  }

  const indColor  = COLOR_IND[indSel];
  const sinDatos  = !cargando && (!datos || datos.meses_con_datos?.length === 0);
  const hayDatos  = !cargando && datos?.meses_con_datos?.length > 0;

  return {
    anio, datos, indSel, setIndSel,
    unidadSel, setUnidadSel,
    cargando, descargando, handleDescargar, handleDescargarInd,
    vistaGrafica, setVistaGrafica,
    mesSel, setMesSel,
    chartData, maxTasa,
    chartDataMes, maxTasaMes,
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
