// react
import { useEffect, useState } from 'react';
// propios
import { usePipeline } from '@/features/dengue/context/PipelineContext';
import { dengueService } from '@/features/dengue/services/dengueService';

type Base = 'operativa' | 'siscep';

/** Subir las dos bases (operativa y SisCep) y ejecutar el pipeline cuando ya están las dos. */
export function useCargaBases() {
  const { estado, ejecutar } = usePipeline();
  const [listos, setListos] = useState<Record<Base, boolean>>({ operativa: false, siscep: false });
  const [toastTick, setToastTick] = useState(0);

  // Dispara el toast en cada visita a esta página y cuando termina un pipeline nuevo.
  useEffect(() => {
    if (estado?.ultimo_reporte) setToastTick(t => t + 1);
  }, [estado?.ultimo_reporte]);

  /** Handler de UploadCard para una base: la sube y marca ese paso como listo. */
  const subir = (base: Base) => async (archivo: File) => {
    const respuesta = base === 'operativa'
      ? await dengueService.subirOperativa(archivo)
      : await dengueService.subirSiscep(archivo);
    setListos(previos => ({ ...previos, [base]: true }));
    return respuesta.data as { nombre: string; bytes: number };
  };

  return {
    estado, ejecutar,
    listos, toastTick, subir,
    ambosListos: listos.operativa && listos.siscep,
    corriendo:   !!estado?.corriendo,
    completado:  !!estado?.completado,
    hayError:    !!estado?.error,
    cuenta:      (listos.operativa ? 1 : 0) + (listos.siscep ? 1 : 0),
  };
}
