// react
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// propios
import type { ArchivoExtractor } from '@/types/api/indicadores/extractor';
import type { IndicadorExtractor, PanelSubida, ResultadoSubida } from '@/types/pantallas/generarExtractor';
import { excelApi } from '@/api/indicadores/excelApi';
import { extractorApi } from '@/api/indicadores/extractorApi';
import { ftpApi } from '@/api/indicadores/ftpApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { descargarB64, MESES_LARGOS_ARR, urlIcono } from '@/features/indicadores';

// Años del selector: el actual y los anteriores, calculados con la fecha (en 2027 aparece solo).
const ANIOS_HACIA_ATRAS = 1;

/**
 * Generar Extractor: el año, los indicadores y el estado de sus archivos y cortes (del backend),
 * el panel para subir el archivo de un mes y las descargas de Excel.
 */
export function useGenerarExtractor() {
  const clienteConsultas = useQueryClient();
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const aniosDisponibles = Array.from({ length: ANIOS_HACIA_ATRAS + 1 }, (_, i) => anioActual - i);

  const [anio, setAnio]       = useState(anioActual);
  const [panel, setPanel]     = useState<PanelSubida | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [error, setError]     = useState('');
  const [resultado, setResultado] = useState<ResultadoSubida | null>(null);
  // Clave del botón que muestra "Descargando…".
  const [descargando, setDescargando] = useState<string | null>(null);

  useEffect(() => { document.title = 'Extractor | CIAE'; }, []);

  // ── Lo que se lee del backend ──────────────────────────────────────────────

  // Qué indicadores maneja el Extractor y qué usa cada uno: todo del mapeo, vía backend.
  const indicadoresQ = useQuery({
    queryKey: ['extractor', 'indicadores'],
    queryFn: extractorApi.listarIndicadores,
    select: (lista): IndicadorExtractor[] => lista.map(i => ({ ...i, icono: urlIcono(i.imagen) })),
  });
  const indicadores = useMemo(() => indicadoresQ.data ?? [], [indicadoresQ.data]);
  const iconoDe = useMemo(() => Object.fromEntries(indicadores.map(i => [i.indicador, i.icono])), [indicadores]);

  const estadoQ = useQuery({
    queryKey: ['extractor', 'estado', anio, indicadores.map(i => i.indicador)],
    enabled: indicadores.length > 0,
    queryFn: async () => {
      const mensuales = indicadores.filter(i => i.tipo === 'mensual');
      // /estado-cortes responde por ventana de corte: Jul-Dic del año elegido viven en la
      // ventana "Junio del año siguiente", así que se piden los dos años.
      const [estadoArchivos, cortesAnio, cortesSiguiente, generados] = await Promise.all([
        extractorApi.estadoArchivos(anio),
        extractorApi.estadoCortes(anio),
        extractorApi.estadoCortes(anio + 1),
        Promise.all(mensuales.map(i => ftpApi.mesesGenerados(i.indicador, String(anio)))),
      ]);
      return {
        archivos: estadoArchivos?.archivos ?? [],
        cortes: { ...(cortesSiguiente ?? {}), ...(cortesAnio ?? {}) },
        mesesGenerados: Object.fromEntries(mensuales.map((i, k) => [i.indicador, generados[k]])) as Record<string, string[]>,
      };
    },
  });
  const archivos: ArchivoExtractor[] = estadoQ.data?.archivos ?? [];
  const mesesGenerados = estadoQ.data?.mesesGenerados ?? {};

  const cortesDelAnio = useMemo(
    () => Object.entries(estadoQ.data?.cortes ?? {}).filter(([, v]) => v.anioCorte === anio),
    [estadoQ.data, anio],
  );

  const esFuturo = (mes: string) => anio > anioActual || (anio === anioActual && MESES_LARGOS_ARR.indexOf(mes) > hoy.getMonth());

  // ── Panel de subida ────────────────────────────────────────────────────────

  const subida = useMutation({
    mutationFn: ({ panel: p, archivo }: { panel: PanelSubida; archivo: File }) => (p.tipo === 'principal'
      ? extractorApi.subirArchivoMensual(anio, p.mes, archivo, p.prefijo)
      : extractorApi.subirCruce(anio, p.mes, archivo)),
    onMutate: () => setError(''),
    onSuccess: (res, { panel: p }) => {
      // El resultado se queda en el mismo panel donde se subió, para que no se pierda.
      setResultado({ archivo: p.archivo, mes: p.mes, anio, porIndicador: res.data, mensaje: res.message });
      setArchivoSeleccionado(null);
      return clienteConsultas.invalidateQueries({ queryKey: ['extractor', 'estado'] });
    },
    onError: (e, { panel: p }) => setError(mensajeDeError(e, `Error al procesar el ${p.archivo}.`)),
  });
  const subiendo = subida.isPending;

  const abrir = (archivo: ArchivoExtractor, mes: string) => {
    setPanel({ archivo: archivo.archivo, tipo: archivo.tipo, prefijo: archivo.prefijoArchivo, mes });
    setArchivoSeleccionado(null);
    setResultado(null);
    setError('');
  };

  const cerrarPanel = useCallback(() => {
    if (subiendo) return;
    setPanel(null);
    setResultado(null);
    setArchivoSeleccionado(null);
    setError('');
  }, [subiendo]);

  useEffect(() => {
    if (!panel) return;
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarPanel(); };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [panel, cerrarPanel]);

  const procesar = () => {
    if (!archivoSeleccionado || !panel) return;
    subida.mutate({ panel, archivo: archivoSeleccionado });
  };

  const cambiarAnio = (a: number) => {
    setAnio(a);
    setPanel(null);
    setResultado(null);
  };

  const descargar = async (clave: string, indicadoresExcel: string[], anioExcel: number, mes: string) => {
    setDescargando(clave);
    setError('');
    try {
      const res = await excelApi.descargar(indicadoresExcel, anioExcel, mes);
      descargarB64(res.archivo_b64, res.nombre_archivo);
    } catch (e) {
      setError(mensajeDeError(e, 'Error al descargar el reporte.'));
    } finally {
      setDescargando(null);
    }
  };

  const archivoDelPanel = panel ? archivos.find(a => a.archivo === panel.archivo) ?? null : null;
  const estadoDelPanel  = panel ? archivoDelPanel?.meses.find(m => m.mes === panel.mes) : undefined;

  return {
    anio, aniosDisponibles, cambiarAnio,
    indicadores, iconoDe,
    errorCarga: indicadoresQ.isError ? 'No se pudieron cargar los indicadores del Extractor.' : '',
    cargando: indicadoresQ.isLoading || estadoQ.isFetching,
    archivos, mesesGenerados, cortesDelAnio,
    esFuturo,
    panel, abrir, cerrarPanel,
    archivoDelPanel, estadoDelPanel,
    archivoSeleccionado, setArchivoSeleccionado,
    subiendo, procesar,
    resultado, subirDeNuevo: () => setResultado(null),
    error,
    descargando, descargar,
  };
}

export type EstadoGenerarExtractor = ReturnType<typeof useGenerarExtractor>;
