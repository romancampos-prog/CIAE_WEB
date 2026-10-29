// react
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// propios
import type { FiltrosAcciones } from '@/types/pantallas/acciones';
import { ftpEpidemiologiaApi } from '@/api/epidemiologia/ftpApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { FORMATO_FECHA, fechaComparable } from '@/features/acciones/utils/fechas';

const SIN_FILTROS: FiltrosAcciones = { texto: '', claves: [], unidades: [], desde: '', hasta: '' };


/**
 * Consulta del OC30 guardado: el año, el mes (solo los que tienen extracción; el backend manda
 * el definitivo o, si aún no hay, la última semana) y los filtros de la tabla.
 */
export function useConsultaAcciones() {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio]             = useState(anioActual);
  const [mesElegido, setMesElegido] = useState<number | null>(null);
  const [filtros, setFiltros]       = useState<FiltrosAcciones>(SIN_FILTROS);

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
  const texto        = filtros.texto.trim().toLowerCase();

  // La columna de fecha no se escribe aquí: es la que llega con puras fechas dd/mm/aaaa.
  const columnas     = filas[0] ? Object.keys(filas[0]) : [];
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
    (!texto || Object.values(fila).some(valor => valor?.toLowerCase().includes(texto))),
  );

  return {
    anios: [anioActual - 1, anioActual],
    anio,
    cambiarAnio: (nuevo: number) => { setAnio(nuevo); setMesElegido(null); setFiltros(SIN_FILTROS); },
    periodos,
    mes,
    // Las fechas del rango son de ese mes: al cambiar de mes ya no existen.
    cambiarMes: (nuevo: number) => { setMesElegido(nuevo); setFiltros(previos => ({ ...previos, desde: '', hasta: '' })); },
    datos,
    columnaClave,
    columnaFecha,
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
  };
}
