// Endpoints de /Indicadores/reportes (Controller/reportes_Controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { GraficaIndicadorDTO } from '@/types/api/indicadores/reportes';
import type { RespuestaApi } from '@/types/api/respuestaApi';

export const reportesApi = {
  /**
   * Ficha (del mapeo) + reporte (de BD_CIAE) + estadísticas + perfil de un indicador en una sola
   * llamada. El backend resuelve el módulo y el semanal; el front solo manda indicador y año.
   */
  async obtenerGrafica(indicador: string, ano: string): Promise<GraficaIndicadorDTO> {
    const { data } = await api.get<RespuestaApi<GraficaIndicadorDTO>>(
      `/Indicadores/reportes/${encodeURIComponent(indicador)}/grafica`,
      { params: { ano } },
    );
    return data.data;
  },
};
