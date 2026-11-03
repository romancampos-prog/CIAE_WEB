// react
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// propios
import type { TipoReporte } from '@/types/pantallas/generarFtp';
import { ftpEpidemiologiaApi } from '@/api/epidemiologia/ftpApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';

/**
 * Generar (solo admin): como en FTP, previo (semana del mes) o final (definitivo). El año y el mes
 * los pone la página (el mes sin reporte que se tocó o el que se está viendo), la ventana no los cambia.
 * Al terminar se refresca la consulta para que se vea lo recién extraído.
 */
export function useGenerarAcciones() {
  const clienteConsultas = useQueryClient();
  const [tipo, setTipo]     = useState<TipoReporte>('previo');
  const [anio, setAnio]     = useState(new Date().getFullYear());
  const [mes, setMes]       = useState('');
  const [semana, setSemana] = useState(1);

  const extraccion = useMutation({
    mutationFn: () => ftpEpidemiologiaApi.extraerOC30(anio, Number(mes), tipo === 'previo' ? semana : null),
    onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: ['acciones', 'OC30'] }),
  });

  return {
    tipo, setTipo,
    anio, mes,
    semana, setSemana,
    // Deja la ventana lista con el periodo que eligió la página
    prellenar: (nuevoAnio: number, nuevoMes: number) => {
      setAnio(nuevoAnio);
      setMes(String(nuevoMes).padStart(2, '0'));
    },
    puedeGenerar: !!mes && !extraccion.isPending,
    generar: () => extraccion.mutate(),
    generando: extraccion.isPending,
    resultado: extraccion.data ?? null,
    error: extraccion.isError ? mensajeDeError(extraccion.error, 'Error al extraer del FTP') : null,
  };
}
