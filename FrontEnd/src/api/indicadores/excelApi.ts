// Endpoints de /Indicadores/excel (Controller/excel_Controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { ExcelIndicadores } from '@/types/api/indicadores/excel';
import type { RespuestaApi } from '@/types/api/respuestaApi';

export const excelApi = {
  /**
   * Excel de uno o varios indicadores, armado desde lo guardado en BD_CIAE. Uno = Excel individual;
   * varios = una pestaña por indicador. Sin mes trae el último reporte de cada indicador.
   */
  async descargar(indicadores: string[], ano: string | number, mes: string | null = null): Promise<ExcelIndicadores> {
    // URLSearchParams para que la lista salga como indicadores=a&indicadores=b (axios usa indicadores[]=a)
    const params = new URLSearchParams();
    indicadores.forEach(indicador => params.append('indicadores', indicador));
    params.append('ano', String(ano));
    if (mes) params.append('mes', mes);
    const { data } = await api.get<RespuestaApi<ExcelIndicadores>>('/Indicadores/excel', { params });
    return data.data;
  },
};
