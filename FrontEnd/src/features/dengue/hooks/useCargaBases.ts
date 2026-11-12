// react
import { useState } from 'react';
// propios
import { archivosDengueApi } from '@/api/dengue/archivosApi';
import { usePipeline } from '@/features/dengue/context/PipelineContext';

type Base = 'operativa' | 'siscep';

/** Subir las dos bases (operativa y SisCep) y ejecutar el pipeline cuando ya están las dos. */
export function useCargaBases() {
  const { estado, ejecutar } = usePipeline();
  const [listos, setListos] = useState<Record<Base, boolean>>({ operativa: false, siscep: false });

  /** Handler de UploadCard para una base: la sube y marca ese paso como listo. */
  const subir = (base: Base) => async (archivo: File) => {
    const respuesta = base === 'operativa'
      ? await archivosDengueApi.subirOperativa(archivo)
      : await archivosDengueApi.subirSiscep(archivo);
    setListos(previos => ({ ...previos, [base]: true }));
    return respuesta.data as { nombre: string; bytes: number };
  };

  return {
    estado, ejecutar,
    listos, subir,
    ambosListos: listos.operativa && listos.siscep,
    corriendo:   !!estado?.corriendo,
    completado:  !!estado?.completado,
    hayError:    !!estado?.error,
    cuenta:      (listos.operativa ? 1 : 0) + (listos.siscep ? 1 : 0),
  };
}
