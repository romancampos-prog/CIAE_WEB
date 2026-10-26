// propios
import api from '@/api/axiosClient';
import type { RespuestaApi } from '@/api/tipos';
import type { DatosAlertasSiscep, DatosCanal, DatosMapa, EstadoPipeline, PosibleDuplicado, RegistroCaso, TipoMapa } from '@/features/dengue/tipos';

const subirArchivo = async (ruta: string, archivo: File): Promise<RespuestaApi<unknown>> => {
  const form = new FormData();
  form.append('archivo', archivo);
  form.append('pesoArchivo', String(archivo.size));
  const { data } = await api.post<RespuestaApi<unknown>>(ruta, form);
  return data;
};

export const dengueService = {
  /** Base operativa (SINAVE). */
  subirOperativa: (archivo: File) => subirArchivo('/epidemiologia/archivos/operativa', archivo),

  /** Base SisCep (resultados de laboratorio). */
  subirSiscep: (archivo: File) => subirArchivo('/epidemiologia/archivos/siscep', archivo),

  async estadoPipeline(): Promise<EstadoPipeline> {
    const { data } = await api.get<RespuestaApi<EstadoPipeline>>('/epidemiologia/pipeline/estado');
    return data.data;
  },

  async ejecutarPipeline(): Promise<void> {
    await api.post('/epidemiologia/pipeline/ejecutar');
  },

  // Los reportes llegan directos (sin ApiResponse): el backend responde el JSON guardado.

  async canal(): Promise<DatosCanal> {
    const { data } = await api.get<DatosCanal>('/epidemiologia/reportes/canal');
    return data;
  },

  async mapa(tipo: TipoMapa): Promise<DatosMapa> {
    const { data } = await api.get<DatosMapa>(`/epidemiologia/reportes/mapa/${tipo}`);
    return data;
  },

  /** Muestras rechazadas, pendientes, sin muestra, etc. */
  async alertasSiscep(): Promise<DatosAlertasSiscep> {
    const { data } = await api.get<DatosAlertasSiscep>('/epidemiologia/reportes/alertas-siscep');
    return data;
  },

  /** Duplicados confirmados que el algoritmo quitó de la base. */
  async duplicados(): Promise<RegistroCaso[]> {
    const { data } = await api.get<RegistroCaso[]>('/epidemiologia/reportes/duplicados');
    return data;
  },

  /** Pares que podrían ser duplicados y necesitan revisión manual. */
  async posiblesDuplicados(): Promise<PosibleDuplicado[]> {
    const { data } = await api.get<PosibleDuplicado[]>('/epidemiologia/reportes/posibles-duplicados');
    return data;
  },
};
