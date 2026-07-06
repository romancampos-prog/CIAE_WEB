import { useState, useEffect, useMemo } from 'react';
import { getIASSDatosGrafica, descargarIASSGuardado, infoBasicaInAass } from '../api/IASS';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_CORTOS } from '../../shared/constants/meses';
import { COLOR_IND, HGS_COLOR, HGS_BG } from '../constants/colores';
import { COLOR_SEMAFORO } from '../../shared/constants/semaforo';

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

export function useIASSGrafica() {
  const [anio]                            = useState('2026');
  const [datos, setDatos]                 = useState(null);
  const [unidadSel, setUnidadSel]         = useState('');
  const [indSel, setIndSel]               = useState('IASS 02');
  const [cargando, setCargando]           = useState(false);
  const [descargando, setDescargando]     = useState(false);
  const [infoAllInAass, setInfoIASS]     = useState({});
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

  const handleDescargar = () => {
    setDescargando(true);
    descargarIASSGuardado(anio)
      .then(res => descargarB64(res.archivo_b64, res.nombre_archivo))
      .catch(() => {})
      .finally(() => setDescargando(false));
  };

  const chartData = useMemo(() => {
    if (!datos || !unidadSel || !datos.meses_con_datos?.length) return [];
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
  }, [datos, unidadSel, indSel]);

  const maxTasa = useMemo(
    () => Math.max(...chartData.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartData]
  );

  const chartDataMes = useMemo(() => {
    if (!datos?.unidades || !mesSel) return [];
    return datos.unidades.map(u => {
      const arr = datos.datos?.[indSel]?.[u] ?? [];
      const reg = arr.find(r => r.mes === mesSel);
      return {
        unidad:      u,
        tasa:        reg?.tasa        ?? 0,
        numerador:   reg?.numerador   ?? 0,
        denominador: reg?.denominador ?? 0,
        color:       reg?.color       ?? 'Rojo',
      };
    });
  }, [datos, indSel, mesSel]);

  const maxTasaMes = useMemo(
    () => Math.max(...chartDataMes.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataMes]
  );

  const unidadesStatus = useMemo(() => {
    if (!datos?.unidades) return [];
    const ultimoMes = datos.meses_con_datos?.[datos.meses_con_datos.length - 1];
    return datos.unidades.map(u => {
      const arr = datos.datos?.[indSel]?.[u] ?? [];
      const reg = arr.find(r => r.mes === ultimoMes);
      return { unidad: u, color: reg?.color ?? 'Gris' };
    });
  }, [datos, indSel]);

  const indInfo = infoAllInAass?.[indSel];
  const sem     = indInfo?.semaforo;
  const hgsSet  = useMemo(() => new Set(indInfo?.unidades_hgs ?? []), [indInfo]);

  const chartDataAcumulado = useMemo(() => {
    if (!datos?.unidades || !mesSel || !indInfo) return [];
    const mesNum = parseInt(mesSel);
    const factor = indInfo?.semaforo?.Tasa ?? 100;

    const getColor = (tasa, unidad) => {
      if (!sem) return 'Rojo';
      if (indSel === 'IASS 01') {
        const umbrales = hgsSet.has(unidad) ? sem.HGS : sem.Otros;
        if (!umbrales) return 'Rojo';
        const esp = umbrales.Esperado ?? {};
        const med = umbrales.Medio    ?? {};
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
    };

    return datos.unidades.map(u => {
      const arr     = datos.datos?.[indSel]?.[u] ?? [];
      const hasta   = arr.filter(r => parseInt(r.mes) <= mesNum);
      const acumNum = hasta.reduce((s, r) => s + (r.numerador   ?? 0), 0);
      const acumDen = hasta.reduce((s, r) => s + (r.denominador ?? 0), 0);
      const acumTasa = acumDen > 0 ? (acumNum / acumDen) * factor : 0;
      return {
        unidad: u, tasa: acumTasa,
        numerador: acumNum, denominador: acumDen,
        color: getColor(acumTasa, u),
      };
    });
  }, [datos, indSel, mesSel, indInfo, sem]);

  const maxTasaAcumulado = useMemo(
    () => Math.max(...chartDataAcumulado.map(d => d.tasa ?? 0), 1) * 1.25,
    [chartDataAcumulado]
  );

  let rangosSem      = null;
  let rangosSemExtra = null;
  if (sem) {
    if (indSel === 'IASS 01') {
      if (vistaGrafica === 'mes' || vistaGrafica === 'acumulado') {
        rangosSem      = calcular01(sem.HGS,  'HGS');
        rangosSemExtra = calcular01(sem.Otros, 'Otros');
      } else {
        const esHGS = (indInfo?.unidades_hgs ?? []).includes(unidadSel);
        rangosSem   = calcular01(esHGS ? sem.HGS : sem.Otros, esHGS ? 'HGS' : 'Otros');
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
    cargando, descargando, handleDescargar,
    vistaGrafica, setVistaGrafica,
    mesSel, setMesSel,
    chartData, maxTasa,
    chartDataMes, maxTasaMes,
    chartDataAcumulado, maxTasaAcumulado,
    unidadesStatus, indInfo, hgsSet,
    rangosSem, rangosSemExtra,
    indColor, sinDatos, hayDatos,
    COLOR_SEMAFORO, HGS_COLOR, HGS_BG,
  };
}
