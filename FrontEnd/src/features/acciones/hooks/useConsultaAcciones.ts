// react
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// propios
import type { FiltrosAcciones } from '@/types/pantallas/acciones';
import { ftpEpidemiologiaApi } from '@/api/epidemiologia/ftpApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';

const SIN_FILTROS: FiltrosAcciones = { texto: '', clave: '', unidad: '' };

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

  const filasVisibles = filas.filter(fila =>
    (!filtros.unidad || fila.Unidad === filtros.unidad) &&
    (!filtros.clave || !columnaClave || fila[columnaClave] === filtros.clave) &&
    (!texto || Object.values(fila).some(valor => valor?.toLowerCase().includes(texto))),
  );

  return {
    anios: [anioActual - 1, anioActual],
    anio,
    cambiarAnio: (nuevo: number) => { setAnio(nuevo); setMesElegido(null); setFiltros(SIN_FILTROS); },
    periodos,
    mes,
    cambiarMes: setMesElegido,
    datos,
    columnaClave,
    filtros,
    cambiarFiltro: (cambios: Partial<FiltrosAcciones>) => setFiltros(previos => ({ ...previos, ...cambios })),
    limpiarFiltros: () => setFiltros(SIN_FILTROS),
    filasVisibles,
    cargando: consultaPeriodos.isLoading || consulta.isLoading,
    error: consulta.isError ? mensajeDeError(consulta.error, 'Error al consultar las acciones') : null,
  };
}
