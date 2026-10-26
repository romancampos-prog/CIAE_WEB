// react
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
// propios
import { useRol } from '@/features/auth';
import { descargarB64, indicadoresService } from '@/features/indicadores';
import { iaasService } from '@/features/generar-iaas/services/iaasService';
import { calcularFaltantes } from '@/features/generar-iaas/utils/calculos';
import { usePeriodoIaas } from './usePeriodoIaas';
import type { DenominadoresCapturados } from '@/features/generar-iaas/tipos';

const INDICADOR_CON_EXCEL_GLOBAL = 'IAAS 01';

const esExcel = (archivo: File | undefined): archivo is File => !!archivo?.name.endsWith('.xlsx');

/**
 * Generar IAAS: periodo, unidades e indicadores (del backend), lo capturado (Excel por unidad,
 * Excel global de IAAS 01 y denominadores de IAAS 02–06), las advertencias y errores, y la
 * generación del mes. Lo pendiente del mes alimenta el modal de unidades tardías.
 */
export function useGenerarIaas() {
  const clienteConsultas = useQueryClient();
  const { puedeGenIAAS } = useRol();
  const periodo = usePeriodoIaas();
  const { anio, mes } = periodo;

  const [excelGlobal, setExcelGlobal]       = useState<File | null>(null);
  const [archivosUnidad, setArchivosUnidad] = useState<Record<string, File>>({});
  const [denominadores, setDenominadores]   = useState<DenominadoresCapturados>({});
  // null = todavía no se avisó; lista = se avisó y el siguiente clic genera de todas formas.
  const [advertencias, setAdvertencias]     = useState<string[] | null>(null);
  const [errorMensaje, setErrorMensaje]     = useState('');
  const [errorTrigger, setErrorTrigger]     = useState(0);
  const [errorLista, setErrorLista]         = useState<string[]>([]);
  const [errorListaTrigger, setErrorListaTrigger] = useState(0);
  const [modalTardia, setModalTardia]       = useState(false);

  useEffect(() => { document.title = 'IAAS — Nuevo reporte | CIAE'; }, []);

  // ── Lo que se lee del backend ──────────────────────────────────────────────

  const unidadesQ    = useQuery({ queryKey: ['iaas', 'unidades'], queryFn: iaasService.listarUnidades });
  const indicadoresQ = useQuery({ queryKey: ['iaas', 'indicadores'], queryFn: iaasService.listarIndicadores });
  const sesionQ      = useQuery({
    queryKey: ['iaas', 'estadoMes', anio, mes],
    queryFn: () => iaasService.estadoDelMes(anio, mes),
  });

  const unidades          = unidadesQ.data ?? [];
  const todosIndicadores  = indicadoresQ.data ?? [];
  // IAAS 01 saca su denominador del Excel global; los demás se capturan por unidad.
  const indicadores       = todosIndicadores.filter(i => i.indicador !== INDICADOR_CON_EXCEL_GLOBAL);
  const infoIaas01        = todosIndicadores.find(i => i.indicador === INDICADOR_CON_EXCEL_GLOBAL) ?? null;
  const sesion            = sesionQ.data ?? null;
  const unidadesPendientes = sesion?.unidades_pendientes ?? [];

  // ── Captura ────────────────────────────────────────────────────────────────

  // Cualquier cambio en lo capturado invalida el aviso de datos incompletos.
  const elegirExcelGlobal = (archivo: File | null | undefined) => {
    if (archivo === null) setExcelGlobal(null);
    else if (esExcel(archivo)) setExcelGlobal(archivo);
    setAdvertencias(null);
  };
  const elegirArchivoUnidad = (unidad: string, archivo: File | undefined) => {
    if (esExcel(archivo)) setArchivosUnidad(p => ({ ...p, [unidad]: archivo }));
    setAdvertencias(null);
  };
  const quitarArchivoUnidad = (unidad: string) => {
    setArchivosUnidad(p => {
      const siguientes = { ...p };
      delete siguientes[unidad];
      return siguientes;
    });
    setAdvertencias(null);
  };
  const capturarDenominador = (unidad: string, indicador: string, valor: string) => {
    setDenominadores(p => ({ ...p, [unidad]: { ...p[unidad], [indicador]: valor } }));
    setAdvertencias(null);
  };
  const denominadorDe = (unidad: string, indicador: string) => denominadores[unidad]?.[indicador] ?? '';

  const denominadoresCompletos = (unidad: string) => indicadores.every(d => denominadorDe(unidad, d.indicador) !== '');
  const unidadCompleta = (unidad: string) => !!archivosUnidad[unidad] && denominadoresCompletos(unidad);
  const completos      = unidades.filter(unidadCompleta).length;

  const limpiarCampos = () => {
    setExcelGlobal(null);
    setArchivosUnidad({});
    setDenominadores({});
    setAdvertencias(null);
  };

  // ── Generar ────────────────────────────────────────────────────────────────

  /** Excel del año con lo que ya quedó guardado (sale de la BD, no de la respuesta de generar). */
  const descargarExcelGuardado = async () => {
    try {
      const excel = await indicadoresService.descargarExcel(indicadores.map(d => d.indicador), anio);
      descargarB64(excel.archivo_b64, excel.nombre_archivo);
    } catch { /* la generación ya quedó guardada; solo falló la descarga */ }
  };

  const refrescarMes = () => clienteConsultas.invalidateQueries({ queryKey: ['iaas'] });

  // El backend espera todas las unidades × indicadores, aunque vayan vacíos.
  const denominadoresCompletosParaEnviar = (): DenominadoresCapturados => Object.fromEntries(
    unidades.map(u => [u, Object.fromEntries(indicadores.map(d => [d.indicador, denominadorDe(u, d.indicador)]))])
  );

  const generacion = useMutation({
    mutationFn: () => iaasService.generar(anio, mes, archivosUnidad, denominadoresCompletosParaEnviar(), excelGlobal),
    onSuccess: async (respuesta) => {
      if (respuesta.success) await descargarExcelGuardado();
      limpiarCampos();
      refrescarMes();
    },
    onError: (error) => {
      const respuesta = axios.isAxiosError(error) ? error.response : undefined;
      const detalle   = (respuesta?.data as { detail?: unknown } | undefined)?.detail ?? 'Error al generar el reporte';
      if (respuesta?.status === 400) {
        if (Array.isArray(detalle)) {
          setErrorLista(detalle.map(String));
          setErrorListaTrigger(t => t + 1);
        } else {
          setErrorMensaje(String(detalle));
          setErrorTrigger(t => t + 1);
        }
      } else {
        setAdvertencias([typeof detalle === 'string' ? detalle : 'Error al generar el reporte']);
      }
    },
  });

  /** Si falta algo y todavía no se avisó, avisa; el siguiente clic genera de todas formas. */
  const generar = () => {
    const faltantes = calcularFaltantes(excelGlobal, unidades, archivosUnidad, denominadores, indicadores);
    if (faltantes.length > 0 && advertencias === null) { setAdvertencias(faltantes); return; }
    setAdvertencias(null);
    generacion.mutate();
  };

  return {
    periodo,
    puedeGenIAAS,
    cargando: unidadesQ.isLoading || indicadoresQ.isLoading,
    unidades, indicadores, todosIndicadores, infoIaas01,
    sesion, unidadesPendientes,
    excelGlobal, elegirExcelGlobal,
    archivosUnidad, elegirArchivoUnidad, quitarArchivoUnidad,
    denominadorDe, capturarDenominador, denominadoresCompletos,
    completos,
    advertencias,
    generar, generando: generacion.isPending,
    errorMensaje, errorTrigger, errorLista, errorListaTrigger,
    modalTardia,
    abrirModalTardia: () => setModalTardia(true),
    cerrarModalTardia: () => setModalTardia(false),
    alCompletarTardia: () => { descargarExcelGuardado(); refrescarMes(); },
  };
}

export type EstadoGenerarIaas = ReturnType<typeof useGenerarIaas>;
