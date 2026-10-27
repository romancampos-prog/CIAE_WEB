// react
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// propios
import type { IndicadorGenerarFtp, PeriodoFtp, Restricciones, ResultadoCategoriaFtp } from '@/types/api/indicadores/ftp';
import type { FamiliaFtp, TipoReporte } from '@/types/pantallas/generarFtp';
import { excelApi } from '@/api/indicadores/excelApi';
import { ftpApi } from '@/api/indicadores/ftpApi';
import { informacionApi } from '@/api/indicadores/informacionApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { useRol } from '@/features/auth';
import { descargarB64, MESES_LARGOS } from '@/features/indicadores';
import { calcularMesesDisponibles, calcularSemDataFTP } from '@/features/generar-ftp/utils/calculos';

const CLAVE_CATEGORIA_GUARDADA = 'categoria_actual';

// La página navega por familia: se agrupan los indicadores que manda el backend, en su orden.
const agruparPorFamilia = (lista: IndicadorGenerarFtp[]): FamiliaFtp[] => Object.values(lista.reduce<Record<string, FamiliaFtp>>((familias, ind) => {
  familias[ind.categoria] ??= {
    categoriaIndicador: ind.categoria, nombreCategoria: ind.nombreCategoria,
    imagen: ind.imagen, color: ind.color, indicadores: [],
  };
  familias[ind.categoria].indicadores.push(ind.indicador);
  return familias;
}, {}));

const leerCategoriaGuardada = (): string => {
  try {
    return sessionStorage.getItem(CLAVE_CATEGORIA_GUARDADA) || 'CAMA';
  } catch {
    return 'CAMA';
  }
};

/**
 * Generar FTP: la categoría, el indicador, el periodo y el tipo (previo/final) elegidos, lo que
 * se lee del backend para eso (ficha, meses ya generados) y las acciones de generar un indicador
 * o toda la categoría, con la confirmación de meses faltantes y la de regenerar con contraseña.
 */
export function useGenerarFtp() {
  const clienteConsultas = useQueryClient();
  const { puedeGenFTP } = useRol();
  const esVisor = !puedeGenFTP;

  const fechaHoy     = new Date();
  const anioActual   = fechaHoy.getFullYear();
  const mesActualNum = fechaHoy.getMonth() + 1;
  const diaActual    = fechaHoy.getDate();

  const [categoriaElegida, setCategoriaElegida] = useState(leerCategoriaGuardada);
  const [indicadorSel, setIndicadorSel]     = useState<string | null>(null);
  const [tipo, setTipo]                     = useState<TipoReporte>(esVisor ? 'final' : 'previo');
  const [datos, setDatos]                   = useState<PeriodoFtp>({ ano: anioActual.toString(), mes: '', semana: esVisor ? null : '1' });
  // Clave (indicador|mes|tipo) para la que ya se pidió confirmar los meses faltantes: si cambia, se vuelve a pedir.
  const [confirmadoPara, setConfirmadoPara] = useState<string | null>(null);
  const [cargando, setCargando]             = useState(false);
  const [cargandoBatch, setCargandoBatch]   = useState(false);
  const [restriccionesData, setRestriccionesData] = useState<Restricciones | null>(null);
  const [mostrarRestricciones, setMostrarRestricciones] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<{ completados: string[]; errores: Record<string, unknown> } | null>(null);
  const [mostrarConfirmarRegenerar, setMostrarConfirmarRegenerar] = useState(false);
  const [regenerarModo, setRegenerarModo]   = useState<'individual' | 'batch'>('individual');
  const [regenerando, setRegenerando]       = useState(false);
  const [errorRegenerar, setErrorRegenerar] = useState('');

  // ── Lo que se lee del backend ──────────────────────────────────────────────

  // Esta es la página de Generar FTP (mostrarGenerar + módulo ftp), no la de gráficas.
  const lista = useQuery({
    queryKey: ['ftp', 'indicadores'],
    queryFn: ftpApi.listarIndicadores,
    select: agruparPorFamilia,
  });
  const categorias = useMemo(() => lista.data ?? [], [lista.data]);

  // Si la categoría guardada ya no existe, la primera de la lista.
  const categoria = categorias.length && !categorias.some(c => c.categoriaIndicador === categoriaElegida)
    ? categorias[0].categoriaIndicador
    : categoriaElegida;
  const catData     = categorias.find(c => c.categoriaIndicador === categoria);
  const indicadores = useMemo(() => catData?.indicadores ?? [], [catData]);

  const ficha = useQuery({
    queryKey: ['ftp', 'ficha', indicadorSel, datos.ano],
    queryFn: () => informacionApi.obtenerFicha(indicadorSel!, datos.ano),
    enabled: !!indicadorSel,
  });
  const infoIndicador = indicadorSel ? ficha.data ?? null : null;

  /** Qué meses ya tienen reporte "final" generado para el indicador/año activos. */
  const mesesGenerados = useQuery({
    queryKey: ['ftp', 'mesesGenerados', indicadorSel, datos.ano],
    queryFn: () => ftpApi.mesesGenerados(indicadorSel!, datos.ano),
    enabled: !!indicadorSel,
  });
  const mesesGeneradosList = useMemo(() => (indicadorSel ? mesesGenerados.data ?? [] : []), [indicadorSel, mesesGenerados.data]);

  /**
   * Modo batch (sin indicador elegido, "Generar todos" de la categoría): un mes solo se oculta
   * si TODOS los indicadores de la categoría ya lo cerraron; si alguno sigue abierto, ese
   * indicador sí necesita su semanal ese mes.
   */
  const cerradosCategoria = useQuery({
    queryKey: ['ftp', 'mesesGenerados', 'categoria', indicadores, datos.ano],
    queryFn: async () => {
      const listas = await Promise.all(indicadores.map(ind => ftpApi.mesesGenerados(ind, datos.ano)));
      return listas.reduce((acc, meses) => acc.filter(m => meses.includes(m)));
    },
    enabled: !indicadorSel && indicadores.length > 0,
  });
  const mesesCerradosCategoria = useMemo(
    () => (!indicadorSel ? cerradosCategoria.data ?? [] : []),
    [indicadorSel, cerradosCategoria.data],
  );

  // ── Lo que se calcula de lo elegido ───────────────────────────────────────

  /**
   * Meses sin reporte "final" antes del mes/tipo elegido. En "final" revisa toda la cadena
   * desde enero (el histórico debe quedar completo); en "previo" (semanal) solo el mes
   * inmediato anterior: un semanal solo necesita que el mes pasado ya se haya cerrado.
   */
  const mesesFaltantes = useMemo(() => {
    if (!datos.mes || !indicadorSel) return [];
    const mesNum = parseInt(datos.mes);
    const desde  = tipo === 'previo' ? mesNum - 1 : 1;
    const faltantes: string[] = [];
    for (let i = Math.max(desde, 1); i < mesNum; i++) {
      const k = String(i).padStart(2, '0');
      if (!mesesGeneradosList.includes(k)) faltantes.push(MESES_LARGOS[k]);
    }
    return faltantes;
  }, [datos.mes, indicadorSel, tipo, mesesGeneradosList]);

  const claveConfirmacion = `${indicadorSel}|${datos.mes}|${tipo}`;
  const confirmandoFaltantes = confirmadoPara === claveConfirmacion;

  /**
   * Meses disponibles según rol, tipo de reporte y fecha actual. En "previo" (semanal) además
   * se excluyen los meses ya cerrados: con un indicador elegido, los suyos; en batch, solo los
   * que TODOS los indicadores de la categoría ya cerraron.
   */
  const mesesDisponibles = useMemo(() => {
    const todos       = Object.entries(MESES_LARGOS);
    const disponibles = calcularMesesDisponibles(todos, datos.ano, { anioActual, esVisor, diaActual, mesActualNum, tipo });
    if (tipo !== 'previo') return disponibles;
    const cerrados = indicadorSel ? mesesGeneradosList : mesesCerradosCategoria;
    return disponibles.filter(([k]) => !cerrados.includes(k));
  }, [datos.ano, anioActual, mesActualNum, diaActual, esVisor, tipo, indicadorSel, mesesGeneradosList, mesesCerradosCategoria]);

  /** Textos de semáforo del indicador seleccionado para el mes activo. */
  const semData = useMemo(
    () => calcularSemDataFTP(infoIndicador, datos.mes, MESES_LARGOS),
    [infoIndicador, datos.mes]
  );

  const catColor    = catData?.color ?? '#0b5445';
  const canGenerar  = !!indicadorSel && !!datos.mes && !cargando && !cargandoBatch;
  const canBatch    = !!datos.mes && !cargando && !cargandoBatch && indicadores.length > 0;

  // ── Acciones ───────────────────────────────────────────────────────────────

  const cambiarCategoria = (nueva: string) => {
    setCategoriaElegida(nueva);
    setResultadoBatch(null);
    try {
      sessionStorage.setItem(CLAVE_CATEGORIA_GUARDADA, nueva);
    } catch {
      // Sin almacenamiento la categoría solo dura mientras la página está abierta.
    }
  };

  const mostrarSiHayRestricciones = (restricciones: Restricciones | undefined) => {
    if (restricciones && Object.keys(restricciones).length > 0) {
      setRestriccionesData(restricciones);
      setMostrarRestricciones(true);
    }
  };

  // Lo recién generado cambia los meses cerrados: se vuelven a pedir.
  const refrescarMesesGenerados = () => clienteConsultas.invalidateQueries({ queryKey: ['ftp', 'mesesGenerados'] });

  const descargarExcel = async (indicadoresExcel: string[]) => {
    const excel = await excelApi.descargar(indicadoresExcel, datos.ano, datos.mes);
    descargarB64(excel.archivo_b64, excel.nombre_archivo);
  };

  /**
   * Genera el reporte del indicador seleccionado para el periodo configurado. Si el mes final
   * ya existe pide contraseña; si hay meses previos sin reporte, pide confirmar antes.
   */
  async function generarReporte() {
    if (!canGenerar || !indicadorSel) return;
    if (tipo === 'final' && mesesGeneradosList.includes(datos.mes)) {
      setErrorRegenerar('');
      setRegenerarModo('individual');
      setMostrarConfirmarRegenerar(true);
      return;
    }
    if (mesesFaltantes.length > 0 && !confirmandoFaltantes) {
      setConfirmadoPara(claveConfirmacion);
      return;
    }
    setConfirmadoPara(null);
    setCargando(true);
    try {
      const res = await ftpApi.generarIndicador(indicadorSel, datos);
      if (res.success) {
        await descargarExcel([indicadorSel]);
        mostrarSiHayRestricciones(res.data.restricciones);
        refrescarMesesGenerados();
      } else {
        alert(res.message || 'Error al generar el reporte.');
      }
    } catch { alert('Error de conexión con el servidor.'); }
    finally { setCargando(false); }
  }

  /**
   * Regenera un mes definitivo que ya tiene reporte guardado (individual o la categoría
   * completa, según regenerarModo), con la contraseña que se pidió en el modal.
   */
  async function confirmarRegenerar(password: string) {
    setRegenerando(true);
    setErrorRegenerar('');
    try {
      const enBatch = regenerarModo === 'batch';
      const res = enBatch
        ? await ftpApi.regenerarCategoria(categoria, datos, password)
        : await ftpApi.regenerarIndicador(indicadorSel!, datos, password);
      if (res.success) {
        await descargarExcel(enBatch ? indicadores : [indicadorSel!]);
        setMostrarConfirmarRegenerar(false);
        if (enBatch) {
          const { completados, errores } = res.data as ResultadoCategoriaFtp;
          setResultadoBatch({ completados, errores });
        }
        mostrarSiHayRestricciones(res.data.restricciones);
        refrescarMesesGenerados();
      } else {
        setErrorRegenerar(res.message || 'Error al regenerar el reporte.');
      }
    } catch (error) {
      setErrorRegenerar(mensajeDeError(error, 'Error al regenerar el reporte.'));
    } finally {
      setRegenerando(false);
    }
  }

  /**
   * Genera todos los indicadores de la categoría activa en un único Excel. Si el mes
   * definitivo ya fue generado para toda la categoría, pide contraseña antes de sobrescribir.
   */
  async function generarTodos() {
    if (!canBatch) return;
    if (tipo === 'final' && mesesCerradosCategoria.includes(datos.mes)) {
      setErrorRegenerar('');
      setRegenerarModo('batch');
      setMostrarConfirmarRegenerar(true);
      return;
    }
    setCargandoBatch(true);
    setResultadoBatch(null);
    try {
      const res = await ftpApi.generarCategoria(categoria, datos);
      if (res.success) {
        await descargarExcel(indicadores);
        setResultadoBatch({ completados: res.data.completados, errores: res.data.errores });
        mostrarSiHayRestricciones(res.data.restricciones);
        refrescarMesesGenerados();
      } else {
        alert(res.message || 'Error al generar la categoría.');
      }
    } catch { alert('Error de conexión con el servidor.'); }
    finally { setCargandoBatch(false); }
  }

  return {
    categorias, cargandoLista: lista.isLoading,
    categoria, setCategoria: cambiarCategoria,
    indicadorSel, setIndicadorSel,
    tipo, setTipo,
    datos, setDatos,
    infoIndicador,
    mesesFaltantes, confirmandoFaltantes,
    cargando, cargandoBatch,
    restriccionesData, mostrarRestricciones, setMostrarRestricciones,
    resultadoBatch,
    mesesDisponibles, semData,
    indicadores, catColor,
    canGenerar, canBatch,
    esVisor, puedeGenFTP,
    generarReporte, generarTodos,
    mostrarConfirmarRegenerar, setMostrarConfirmarRegenerar,
    regenerarModo, regenerando, errorRegenerar, confirmarRegenerar,
  };
}
