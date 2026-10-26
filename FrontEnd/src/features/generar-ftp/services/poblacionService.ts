// propios
import api from '@/api/axiosClient';
import type { RespuestaApi } from '@/api/tipos';
import type { ArchivoPoblacion, ResultadoCargaPoblacion, ResultadoRecalculoPoblacion } from '@/features/generar-ftp/tipos';

export const poblacionService = {
  /** Sube el Excel de población de InfoSalud (denominadores de los indicadores que dependen de ella). */
  async subirArchivo(archivo: File): Promise<ResultadoCargaPoblacion> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('pesoArchivo', String(archivo.size));
    const { data } = await api.post<RespuestaApi<ResultadoCargaPoblacion>>('/Indicadores/ftp/poblacion/subir', formData);
    return data.data;
  },

  /** Recalcula lo ya generado que depende de la población, con la que se acaba de subir. */
  async recalcular(ano: string): Promise<ResultadoRecalculoPoblacion> {
    const { data } = await api.post<RespuestaApi<ResultadoRecalculoPoblacion>>('/Indicadores/ftp/poblacion/recalcular', { ano });
    return data.data;
  },

  /** Nombre (sin extensión) y periodo del último Excel de población subido. */
  async archivoActual(): Promise<ArchivoPoblacion | null> {
    const { data } = await api.get<RespuestaApi<ArchivoPoblacion | null>>('/Indicadores/ftp/poblacion/archivo-actual');
    return data.data;
  },
};
