// react
import { useState, useEffect } from 'react';
// propios
import { obtenerGraficaIndicador } from '../api/indicadoresInfo';
import { descargarExcelIndicadores } from '../api/excel';
import { descargarB64 } from '../utils/download';
import { CLAVE_ESTATAL, ordenarMeses } from '../utils/datosGrafica';

const ANIO = '2026';

/**
 * Datos de la gráfica de un indicador (ficha, reporte, estadísticas y perfil, en una sola
 * llamada que se guarda mientras se está en gráficas) y lo que el usuario eligió:
 * el mes de toda la página, la pestaña, la unidad de la tendencia y el acumulado.
 * @param {string} indicador
 * @param {string[]} indsHermanos - los de la misma familia, para "descargar todos"
 */
export function useGraficaIndicador(indicador, indsHermanos) {
  // Lo último que llegó del backend y de qué indicador es: mientras no coincida con el pedido, se está cargando.
  const [cargado, setCargado]         = useState({ indicador: null, datos: null });
  const [descargando, setDescargando] = useState(false);
  const [mesSel, setMesSel]           = useState('');
  const [vista, setVista]             = useState('comparar');
  const [unidadSel, setUnidadSel]     = useState(CLAVE_ESTATAL);
  const [acumulado, setAcumulado]     = useState(false);

  // No se limpia `datos` al cambiar de indicador: mientras llega la respuesta se sigue
  // viendo el anterior, así la página no parpadea.
  useEffect(() => {
    if (!indicador) return undefined;
    let vigente = true;
    obtenerGraficaIndicador(indicador, ANIO)
      .then(respuesta => {
        if (!vigente) return;
        setCargado({ indicador, datos: respuesta });
        setAcumulado(false);
        // La unidad de la tendencia se conserva si también existe en este indicador; si no, el estatal.
        const unidades = Object.values(respuesta.reporte?.MESES ?? {}).flatMap(m => Object.keys(m.Reporte ?? {}));
        setUnidadSel(previa => (unidades.includes(previa) ? previa : CLAVE_ESTATAL));
        // Arranca en el último mes cerrado (el que tiene resumen); si no hay, en el parcial.
        const cerrados = (respuesta.estadisticas?.resumenPorMes ?? []).map(r => r.mes);
        const semanal  = Object.keys(respuesta.reporte?.SEMANA?.MES ?? {})[0];
        setMesSel(cerrados[cerrados.length - 1] ?? semanal ?? '');
      })
      .catch(error => {
        console.error('Error cargando la gráfica:', error);
        if (vigente) setCargado(previo => ({ ...previo, indicador }));
      });
    return () => { vigente = false; };
  }, [indicador]);

  const datos        = cargado.datos;
  const cargando     = cargado.indicador !== indicador;
  const reporte      = datos?.reporte ?? null;
  const estadisticas = datos?.estadisticas ?? null;
  const resumenes    = estadisticas?.resumenPorMes ?? [];

  // Meses del selector: los cerrados y, al final, el del semanal si todavía no cierra.
  const mesesCerrados = resumenes.map(r => r.mes);
  const mesSemanal    = Object.keys(reporte?.SEMANA?.MES ?? {})[0] ?? null;
  const mesParcial    = mesSemanal && !mesesCerrados.includes(mesSemanal) ? mesSemanal : null;
  const meses         = ordenarMeses(mesParcial ? [...mesesCerrados, mesParcial] : mesesCerrados);

  const indiceResumen = resumenes.findIndex(r => r.mes === mesSel);
  const resumen       = indiceResumen >= 0 ? resumenes[indiceResumen] : null;
  const mesAnterior   = indiceResumen > 0 ? resumenes[indiceResumen - 1].mes : null;

  const descargar = (indicadores) => {
    if (descargando || !indicadores.length) return;
    setDescargando(true);
    descargarExcelIndicadores(indicadores, ANIO)
      .then(res => descargarB64(res.archivo_b64, res.nombre_archivo))
      .catch(() => {})
      .finally(() => setDescargando(false));
  };

  return {
    anio: ANIO,
    cargando, descargando,
    ficha: datos?.ficha ?? null,
    perfil: datos?.perfil ?? null,
    reporte, estadisticas,
    meses, mesParcial, mesSel, setMesSel,
    resumen, mesAnterior,
    vista, setVista,
    unidadSel, setUnidadSel,
    acumulado, setAcumulado,
    tieneAcumulado: Object.keys(reporte?.MENSUAL_ACUMULADO ?? {}).length > 0,
    descargarIndicador: () => descargar([indicador]),
    descargarFamilia: () => descargar(indsHermanos),
  };
}
