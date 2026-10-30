// Endpoints de /Indicadores/censo-dm (Controller/censo_dm_Controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { CensoDMSubido, ResultadoCargaCensoDM } from '@/types/api/indicadores/censoDm';
import type { RespuestaApi } from '@/types/api/respuestaApi';

export const censoDmApi = {
  /** Los censos de pacientes con DM ya subidos, del más reciente al más viejo. */
  async subidos(): Promise<CensoDMSubido[]> {
    const { data } = await api.get<RespuestaApi<CensoDMSubido[]>>('/Indicadores/censo-dm/subidos');
    return data.data;
  },

  /** Sube el Excel del censo; el backend genera o recalcula los meses que lo usan. */
  async subir(archivo: File): Promise<{ mensaje: string; datos: ResultadoCargaCensoDM }> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('pesoArchivo', String(archivo.size));
    const { data } = await api.post<RespuestaApi<ResultadoCargaCensoDM>>('/Indicadores/censo-dm/subir', formData);
    return { mensaje: data.message, datos: data.data };
  },
};
