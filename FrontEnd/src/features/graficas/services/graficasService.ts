// propios
import api from '@/api/axiosClient';
import type { RespuestaApi } from '@/api/tipos';
import type { GraficaIndicadorDTO } from '@/features/graficas/tipos';

export const graficasService = {
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
