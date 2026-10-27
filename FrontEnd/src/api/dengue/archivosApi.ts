// Endpoints de /epidemiologia/archivos (epidemiologia/controllers/archivos_controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { RespuestaApi } from '@/types/api/respuestaApi';

const subirArchivo = async (ruta: string, archivo: File): Promise<RespuestaApi<unknown>> => {
  const form = new FormData();
  form.append('archivo', archivo);
  form.append('pesoArchivo', String(archivo.size));
  const { data } = await api.post<RespuestaApi<unknown>>(ruta, form);
  return data;
};

export const archivosDengueApi = {
  /** Base operativa (SINAVE). */
  subirOperativa: (archivo: File) => subirArchivo('/epidemiologia/archivos/operativa', archivo),

  /** Base SisCep (resultados de laboratorio). */
  subirSiscep: (archivo: File) => subirArchivo('/epidemiologia/archivos/siscep', archivo),
};
