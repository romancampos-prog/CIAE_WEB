// react
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// propios
import { censoDmApi } from '@/api/indicadores/censoDmApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';

/** Los censos de DM subidos y el panel para subir uno nuevo (que genera o recalcula los meses que lo usan). */
export function useCensoDm() {
  const clienteConsultas = useQueryClient();
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);

  const consulta = useQuery({ queryKey: ['extractor', 'censoDm'], queryFn: censoDmApi.subidos });

  const subida = useMutation({
    mutationFn: censoDmApi.subir,
    // Con el censo nuevo pueden quedar generados meses: se refresca toda la página del Extractor.
    onSuccess: () => clienteConsultas.invalidateQueries({ queryKey: ['extractor'] }),
  });

  return {
    censos: consulta.data ?? [],
    panelAbierto,
    abrirPanel: () => { setArchivo(null); subida.reset(); setPanelAbierto(true); },
    cerrarPanel: () => setPanelAbierto(false),
    archivo, setArchivo,
    subir: () => archivo && subida.mutate(archivo),
    subiendo: subida.isPending,
    resultado: subida.data ?? null,
    error: subida.error ? mensajeDeError(subida.error, 'No se pudo subir el censo.') : '',
  };
}

export type EstadoCensoDm = ReturnType<typeof useCensoDm>;
