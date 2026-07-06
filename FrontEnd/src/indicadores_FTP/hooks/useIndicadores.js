import { useState, useEffect, useMemo } from 'react';
import { getAllIndicadores, getIndicador } from '../api/indicadores';
import { getReporte, getMesesGenerados, generarCategoria } from '../../reportes/api/reportes';
import { descargarB64 } from '../../shared/utils/download';
import { MESES_LARGOS } from '../../shared/constants/meses';
import { COLORS } from '../constants/colores';

export function useIndicadores(user) {
  const esVisor = user?.rol !== 'admin' && user?.rol !== 'trabajador_ftp';

  const fechaHoy     = new Date();
  const anioActual   = fechaHoy.getFullYear();
  const mesActualNum = fechaHoy.getMonth() + 1;
  const diaActual    = fechaHoy.getDate();
  const mesMaxVisor  = diaActual >= 30 ? mesActualNum : mesActualNum - 1;

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

  useEffect(() => {
    sessionStorage.setItem('categoria_actual', categoria);
    setInfoIndicador(null);
    setMesesFaltantes([]);
    setResultadoBatch(null);
    // setIndicadorSel se maneja explícitamente en toggleAbrir del componente
  }, [categoria]);

  useEffect(() => {
    if (!indicadorSel) { setInfoIndicador(null); return; }
    getIndicador(indicadorSel).then(res => setInfoIndicador(res.data)).catch(console.error);
  }, [indicadorSel]);

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

  const mesesDisponibles = useMemo(() => {
    const todos = Object.entries(MESES_LARGOS);
    if (parseInt(datos.ano) === anioActual) {
      let limite;
      if (esVisor) {
        limite = diaActual >= 30 ? mesActualNum : mesActualNum - 1;
      } else if (tipo === 'final') {
        limite = diaActual >= 26 ? mesActualNum : mesActualNum - 1;
      } else {
        limite = mesActualNum;
      }
      return todos.filter(([k]) => parseInt(k) > 0 && parseInt(k) <= limite);
    }
    return todos;
  }, [datos.ano, anioActual, mesActualNum, diaActual, esVisor, mesMaxVisor, tipo]);

  const semData = useMemo(() => {
    if (!infoIndicador?.semaforo) return null;
    const mesTexto = MESES_LARGOS[datos.mes];
    const sem = (mesTexto && infoIndicador.semaforo[mesTexto])
      ? infoIndicador.semaforo[mesTexto] : infoIndicador.semaforo;
    if (!sem || (sem.Bajo === undefined && sem.Esperado === undefined)) return null;
    const esDesc = sem.Alto !== undefined;
    return {
      txtVerde:    esDesc ? `≤ ${sem.Esperado}%` : `≥ ${sem.Esperado}%`,
      txtAmarillo: esDesc ? `> ${sem.Esperado}% — < ${sem.Alto}%` : `> ${sem.Bajo}% — < ${sem.Esperado}%`,
      txtRojo:     esDesc ? `≥ ${sem.Alto}%`     : `≤ ${sem.Bajo}%`,
    };
  }, [infoIndicador, datos.mes]);

  const catData    = allIndicadores[categoria];
  const indicadores = catData?.indicadores ?? [];
  const catColor   = COLORS[categoria] ?? '#0b5445';
  const canGenerar = !!indicadorSel && !!datos.mes && !cargando && !cargandoBatch;
  const canBatch   = !!datos.mes && !cargando && !cargandoBatch && indicadores.length > 0;

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
    } catch { alert('Error de conexión con el servidor.'); }
    finally { setCargando(false); }
  }

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
        alert(res.message || 'Error al generar la categoría.');
      }
    } catch { alert('Error de conexión con el servidor.'); }
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
