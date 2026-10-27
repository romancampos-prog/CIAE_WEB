// react
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// propios
import type { EstadoPipeline } from '@/types/api/dengue/pipeline';
import { pipelineDengueApi } from '@/api/dengue/pipelineApi';
import { mensajeDeError } from '@/api/cliente/mensajeDeError';
import { CLAVE_REPORTES_DENGUE } from '@/features/dengue/constants/clavesConsulta';

interface ValorPipeline {
  estado: EstadoPipeline | null;
  ejecutar: () => void;
}

const PipelineContext = createContext<ValorPipeline | null>(null);

/**
 * Estado del pipeline de dengue para toda la sección (un solo polling): mientras corre se
 * pregunta cada 2 s, y al terminar se vuelven a pedir los reportes.
 */
export function PipelineProvider({ children }: { children: ReactNode }) {
  const clienteConsultas = useQueryClient();

  const consulta = useQuery({
    queryKey: ['dengue', 'pipeline'],
    queryFn: pipelineDengueApi.estadoPipeline,
    refetchInterval: (q) => (q.state.data?.corriendo ? 2000 : false),
  });
  const estado = consulta.data ?? null;

  // Al pasar de "corriendo" a terminado, los reportes ya cambiaron.
  const corriaAntes = useRef(false);
  useEffect(() => {
    if (!estado) return;
    if (corriaAntes.current && !estado.corriendo) {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_REPORTES_DENGUE });
    }
    corriaAntes.current = estado.corriendo;
  }, [estado, clienteConsultas]);

  const ejecucion = useMutation({
    mutationFn: pipelineDengueApi.ejecutarPipeline,
    onSuccess: () => {
      // Se muestra "Iniciando..." de inmediato; con corriendo = true el polling arranca solo.
      clienteConsultas.setQueryData<EstadoPipeline>(['dengue', 'pipeline'], previo => previo && ({
        ...previo, corriendo: true, completado: false, error: null, paso: 'Iniciando...',
      }));
      corriaAntes.current = true;
    },
    onError: (error) => alert(mensajeDeError(error, 'Error al iniciar el pipeline')),
  });

  return (
    <PipelineContext.Provider value={{ estado, ejecutar: () => ejecucion.mutate() }}>
      {children}
    </PipelineContext.Provider>
  );
}

/** El estado del pipeline y cómo ejecutarlo, desde cualquier pantalla de dengue. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePipeline(): ValorPipeline {
  const valor = useContext(PipelineContext);
  if (!valor) throw new Error('usePipeline se usa dentro de <PipelineProvider>');
  return valor;
}
