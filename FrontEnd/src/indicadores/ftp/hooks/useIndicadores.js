import { useState, useEffect, useMemo } from 'react';
import { getAllIndicadores, getIndicador } from '../api/indicadores';
import { getReporte, getMesesGenerados, generarCategoria } from '../../reportes_grafica/api/reportes';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_LARGOS } from '../../shared/constantes/meses';
import { COLORS } from '../constantes/colores';
import { calcularMesesDisponibles, calcularSemDataFTP } from '../utils/calculos';

/**
 * Hook de generaciÃ³n de indicadores FTP.
 * Gestiona la selecciÃ³n de categorÃ­a, indicador, perÃ­odo y tipo (previo/final),
 * y expone las funciones para generar un indicador individual o toda la categorÃ­a.
 *
 * @param {{ user: string, rol: string }|null} user - Usuario autenticado
 * @returns {Object} Estado y acciones del panel de generaciÃ³n
 */
export function useIndicadores(user) {
  const esVisor = user?.rol !== 'admin' && user?.rol !== 'trabajador_ftp';

  const fechaHoy     = new Date();
  const anioActual   = fechaHoy.getFullYear();
  const mesActualNum = fechaHoy.getMonth() + 1;
  const diaActual    = fechaHoy.getDate();

  const [allIndicadores, setAllIndicadores] = useState({});
  const [cargandoLista, setCargandoLista]   = useState(true);
  const [categoria, setCategoria]           = useState(
    () => sessionStorage.getItem('categoria_actual') || 'CAMA'
  );
  const [indicadorSel, setIndicadorSel]     = useState(null);
  const [tipo, setTipo]                     = useState(esVisor ? 'final' : 'previo');
  const [datos, setDatos]                   = useState({ ano: anioActual.toString(), mes: '', semana: esVisor ? null : '1' });
  const [infoIndicador, setInfoIndicador]   = useState(null);
  const [mesesFaltantes, setMesesFaltantes] = useState([]);
  const [cargando, setCargando]             = useState(false);
  const [confirmandoFaltantes, setConfirmandoFaltantes] = useState(false);
  const [restriccionesData, setRestriccionesData] = useState(null);
  const [mostrarRestricciones, setMostrarRestricciones] = useState(false);
  const [cargandoBatch, setCargandoBatch]   = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState(null);
  const [modalPoblacion, setModalPoblacion] = useState(false);

  /** Carga inicial de todos los indicadores agrupados por categorÃ­a */
  useEffect(() => {
    getAllIndicadores()
      .then(res => {
        const data = res?.data ?? {};
        setAllIndicadores(data);
        if (!data[categoria] && Object.keys(data).length > 0)
          setCategoria(Object.keys(data)[0]);
      })
      .finally(() => setCargandoLista(false));
  }, []);

  /** Persiste la categorÃ­a en sessionStorage y limpia el estado derivado al cambiarla */
  useEffect(() => {
    sessionStorage.setItem('categoria_actual', categoria);
    setInfoIndicador(null);
    setMesesFaltantes([]);
    setResultadoBatch(null);
  }, [categoria]);

  /** Carga la ficha tÃ©cnica del indicador seleccionado */
  useEffect(() => {
    if (!indicadorSel) { setInfoIndicador(null); return; }
    getIndicador(indicadorSel).then(res => setInfoIndicador(res.data)).catch(console.error);
  }, [indicadorSel]);

  /** Detecta meses previos sin reporte generado cuando el tipo es "final" */
  useEffect(() => {
    setConfirmandoFaltantes(false);
    if (!datos.mes || !indicadorSel || tipo !== 'final') { setMesesFaltantes([]); return; }
    getMesesGenerados(indicadorSel, datos.ano).then(generados => {
      const mesNum    = parseInt(datos.mes);
      const faltantes = [];
      for (let i = 1; i < mesNum; i++) {
        const k = String(i).padStart(2, '0');
        if (!generados.includes(k)) faltantes.push(MESES_LARGOS[k]);
      }
      setMesesFaltantes(faltantes);
    });
  }, [datos.mes, datos.ano, indicadorSel, tipo]);

  /** Meses disponibles para selecciÃ³n segÃºn rol, tipo de reporte y fecha actual */
  const mesesDisponibles = useMemo(() => {
    const todos = Object.entries(MESES_LARGOS);
    return calcularMesesDisponibles(todos, datos.ano, { anioActual, esVisor, diaActual, mesActualNum, tipo });
  }, [datos.ano, anioActual, mesActualNum, diaActual, esVisor, tipo]);

  /** Textos de semÃ¡foro del indicador seleccionado para el mes activo */
  const semData = useMemo(
    () => calcularSemDataFTP(infoIndicador, datos.mes, MESES_LARGOS),
    [infoIndicador, datos.mes]
  );

  const catData     = allIndicadores[categoria];
  const indicadores = catData?.indicadores ?? [];
  const catColor    = COLORS[categoria] ?? '#0b5445';
  const canGenerar  = !!indicadorSel && !!datos.mes && !cargando && !cargandoBatch;
  const canBatch    = !!datos.mes && !cargando && !cargandoBatch && indicadores.length > 0;

  /**
   * Genera el reporte del indicador seleccionado para el perÃ­odo configurado.
   * Si hay meses previos sin reporte, pide confirmaciÃ³n antes de proceder.
   * Muestra el modal de restricciones si el backend lo reporta.
   */
  async function generarReporte() {
    if (!canGenerar) return;
    if (mesesFaltantes.length > 0 && !confirmandoFaltantes) {
      setConfirmandoFaltantes(true);
      return;
    }
    setConfirmandoFaltantes(false);
    setCargando(true);
    try {
      const res = await getReporte(indicadorSel, datos);
      if (res.success) {
        descargarB64(res.data.archivo_b64, res.data.nombre_archivo);
        const restr = res.data.restricciones;
        if (restr && Object.keys(restr).length > 0) {
          setRestriccionesData(restr);
          setMostrarRestricciones(true);
        }
      } else {
        alert(res.message || 'Error al generar el reporte.');
      }
    } catch { alert('Error de conexiÃ³n con el servidor.'); }
    finally { setCargando(false); }
  }

  /**
   * Genera todos los indicadores de la categorÃ­a activa en un Ãºnico Excel.
   * Muestra el modal de restricciones si el backend lo reporta.
   */
  async function generarTodos() {
    if (!canBatch) return;
    setCargandoBatch(true);
    setResultadoBatch(null);
    try {
      const res = await generarCategoria(categoria, datos);
      if (res.success) {
        descargarB64(res.data.archivo_b64, res.data.nombre_archivo);
        setResultadoBatch({ completados: res.data.completados, errores: res.data.errores });
        const restr = res.data.restricciones;
        if (restr && Object.keys(restr).length > 0) {
          setRestriccionesData(restr);
          setMostrarRestricciones(true);
        }
      } else {
        alert(res.message || 'Error al generar la categorÃ­a.');
      }
    } catch { alert('Error de conexiÃ³n con el servidor.'); }
    finally { setCargandoBatch(false); }
  }

  return {
    allIndicadores, cargandoLista,
    categoria, setCategoria,
    indicadorSel, setIndicadorSel,
    tipo, setTipo,
    datos, setDatos,
    infoIndicador,
    mesesFaltantes, confirmandoFaltantes,
    cargando, cargandoBatch,
    restriccionesData, mostrarRestricciones, setMostrarRestricciones,
    resultadoBatch,
    modalPoblacion, setModalPoblacion,
    mesesDisponibles, semData,
    indicadores, catColor,
    canGenerar, canBatch,
    esVisor,
    generarReporte, generarTodos,
    MESES_LARGOS,
  };
}
