// react
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// propios
import type { TipoReporte } from '@/types/pantallas/generarFtp';
import { ftpEpidemiologiaApi } from '@/api/epidemiologia/ftpApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { MESES_LARGOS } from '@/features/indicadores';

/**
 * Generar (solo admin): como en FTP, previo (semana del mes) o final (definitivo), año y mes.
 * Al terminar se refresca la consulta para que se vea lo recién extraído.
 */
export function useGenerarAcciones() {
  const clienteConsultas = useQueryClient();
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const [tipo, setTipo]     = useState<TipoReporte>('previo');
  const [anio, setAnio]     = useState(anioActual);
  const [mes, setMes]       = useState('');
  const [semana, setSemana] = useState(1);

  const extraccion = useMutation({
    mutationFn: () => ftpEpidemiologiaApi.extraerOC30(anio, Number(mes), tipo === 'previo' ? semana : null),
    onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: ['acciones', 'OC30'] }),
  });

  // Del año en curso solo hasta el mes actual: lo que aún no pasa no está en el FTP.
  const meses = Object.entries(MESES_LARGOS).filter(([clave]) => anio !== anioActual || Number(clave) <= hoy.getMonth() + 1);

  return {
    tipo, setTipo,
    anios: [anioActual - 1, anioActual],
    anio, setAnio: (nuevo: number) => { setAnio(nuevo); setMes(''); },
    meses, mes, setMes,
    semana, setSemana,
    puedeGenerar: !!mes && !extraccion.isPending,
    generar: () => extraccion.mutate(),
    generando: extraccion.isPending,
    resultado: extraccion.data ?? null,
    error: extraccion.isError ? mensajeDeError(extraccion.error, 'Error al extraer del FTP') : null,
  };
}
