// react
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// propios
import type { ExtraccionFtp } from '@/types/api/epidemiologia/ftp';
import type { FiltrosAcciones } from '@/types/pantallas/acciones';
import { ftpEpidemiologiaApi } from '@/api/epidemiologia/ftpApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { FORMATO_FECHA, fechaComparable } from '@/features/acciones/utils/fechas';
import { aniosConsultables } from '@/features/acciones/utils/meses';
import { descargarB64 } from '@/features/indicadores';

const SIN_FILTROS: FiltrosAcciones = { claves: [], unidades: [], desde: '', hasta: '', textos: {} };


/**
 * Consulta del OC30 guardado: el año, el mes (solo los que tienen extracción; el backend manda
 * el definitivo o, si aún no hay, la última semana) y los filtros de la tabla.
 */
export function useConsultaAcciones() {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio]             = useState(anioActual);
  const [mesElegido, setMesElegido] = useState<number | null>(null);
  const [filtros, setFiltros]       = useState<FiltrosAcciones>(SIN_FILTROS);

  const queryClient = useQueryClient();

  const consultaPeriodos = useQuery({
    queryKey: ['acciones', 'OC30', 'periodos', anio],
    queryFn: () => ftpEpidemiologiaApi.periodosOC30(anio),
  });

  const periodos = consultaPeriodos.data ?? [];
  // Arranca en el último mes con extracción.
  const mes = periodos.some(p => p.mes === mesElegido) ? mesElegido : (periodos[periodos.length - 1]?.mes ?? null);

  const consulta = useQuery({
    queryKey: ['acciones', 'OC30', anio, mes],
    queryFn: () => ftpEpidemiologiaApi.consultarOC30(anio, mes as number),
    enabled: mes !== null,
    // 404 = ese mes no se ha extraído; reintentar no cambia nada.
    retry: false,
  });

  const datos        = consulta.data ?? null;
  const filas        = datos?.filas ?? [];
  const columnaClave = datos?.estadisticas?.porColumna[0]?.columna ?? null;

  // La columna de fecha no se escribe aquí: es la que llega con puras fechas dd/mm/aaaa.
  // "_id" es interno (para guardar el estatus): no es columna de la tabla
  const columnas     = filas[0] ? Object.keys(filas[0]).filter(c => !c.startsWith('_')) : [];
  const columnaFecha = columnas.find(c =>
    filas.some(fila => fila[c]) && filas.every(fila => !fila[c] || FORMATO_FECHA.test(fila[c] as string)),
  ) ?? null;
  const fechas = columnaFecha
    ? [...new Set(filas.map(fila => fila[columnaFecha]).filter((f): f is string => !!f))]
        .sort((a, b) => fechaComparable(a).localeCompare(fechaComparable(b)))
    : [];

  const desde = filtros.desde && fechaComparable(filtros.desde);
  const hasta = filtros.hasta && fechaComparable(filtros.hasta);

  const filasVisibles = filas.filter(fila =>
    (filtros.unidades.length === 0 || filtros.unidades.includes(fila.Unidad ?? '')) &&
    (!desde || (!!columnaFecha && fechaComparable(fila[columnaFecha] ?? '') >= desde)) &&
    (!hasta || (!!columnaFecha && fechaComparable(fila[columnaFecha] ?? '') <= hasta)) &&
    (filtros.claves.length === 0 || !columnaClave || filtros.claves.includes(fila[columnaClave] ?? '')) &&
    Object.entries(filtros.textos).every(([columna, texto]) => !texto.trim() || (fila[columna] ?? '').toLowerCase().includes(texto.trim().toLowerCase())),
  );

  // El estatus elegido se guarda en el backend y se pinta en lo ya consultado (sin volver a pedir el mes)
  const cambioEstatus = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) => ftpEpidemiologiaApi.cambiarEstatusOC30(id, estatus),
    onSuccess: ({ id, estatus }) => queryClient.setQueryData<ExtraccionFtp>(['acciones', 'OC30', anio, mes], previo =>
      previo && { ...previo, estatus: { ...previo.estatus, [id]: estatus } }),
  });

  // El estudio (Excel) de un registro: al subirlo se anota en lo ya consultado; bajarlo descarga el archivo
  const subidaEstudio = useMutation({
    mutationFn: ({ id, archivo }: { id: string; archivo: File }) => ftpEpidemiologiaApi.subirEstudioOC30(anio, mes as number, id, archivo),
    onSuccess: ({ id, ...estudio }) => queryClient.setQueryData<ExtraccionFtp>(['acciones', 'OC30', anio, mes], previo =>
      previo && { ...previo, estudios: { ...previo.estudios, [id]: estudio } }),
  });
  const descargaEstudio = useMutation({
    mutationFn: (id: string) => ftpEpidemiologiaApi.descargarEstudioOC30(id),
    onSuccess: estudio => descargarB64(estudio.archivo_b64, estudio.nombre_archivo),
  });

  return {
    anios: aniosConsultables(),
    anio,
    cambiarAnio: (nuevo: number) => { setAnio(nuevo); setMesElegido(null); setFiltros(SIN_FILTROS); },
    periodos,
    mes,
    // Las fechas del rango son de ese mes: al cambiar de mes ya no existen.
    cambiarMes: (nuevo: number) => { setMesElegido(nuevo); setFiltros(previos => ({ ...previos, desde: '', hasta: '' })); },
    datos,
    columnas,
    columnaClave,
    columnaFecha,
    hayFiltros: !!(filtros.claves.length || filtros.unidades.length || filtros.desde || filtros.hasta || Object.values(filtros.textos).some(t => t.trim())),
    fechas,
    filtros,
    cambiarFiltro: (cambios: Partial<FiltrosAcciones>) => setFiltros(previos => ({ ...previos, ...cambios })),
    // Clic en una barra o en la clave de la tabla: la agrega a la selección o la quita
    alternarFiltro: (campo: 'claves' | 'unidades', valor: string) => setFiltros(previos => ({
      ...previos,
      [campo]: previos[campo].includes(valor) ? previos[campo].filter(v => v !== valor) : [...previos[campo], valor],
    })),
    limpiarFiltros: () => setFiltros(SIN_FILTROS),
    filasVisibles,
    cargando: consultaPeriodos.isLoading || consulta.isLoading,
    error: consulta.isError ? mensajeDeError(consulta.error, 'Error al consultar las acciones') : null,
    cambiarEstatus: (id: string, estatus: string) => cambioEstatus.mutate({ id, estatus }),
    errorEstatus: cambioEstatus.isError ? mensajeDeError(cambioEstatus.error, 'No se pudo guardar el estatus') : null,
    subirEstudio: (id: string, archivo: File) => subidaEstudio.mutate({ id, archivo }),
    descargarEstudio: (id: string) => descargaEstudio.mutate(id),
    // El registro cuyo estudio se está subiendo (para mostrar "Subiendo…")
    subiendoEstudio: subidaEstudio.isPending ? subidaEstudio.variables?.id ?? null : null,
    // Con el registro al que pertenece: se muestra en su tarjeta, no en la de otro
    errorEstudio: subidaEstudio.isError ? { id: subidaEstudio.variables?.id, mensaje: mensajeDeError(subidaEstudio.error, 'No se pudo subir el estudio') }
      : descargaEstudio.isError ? { id: descargaEstudio.variables, mensaje: mensajeDeError(descargaEstudio.error, 'No se pudo descargar el estudio') } : null,
  };
}
