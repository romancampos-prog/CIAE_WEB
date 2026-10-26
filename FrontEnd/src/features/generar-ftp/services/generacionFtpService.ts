// propios
import api from '@/api/axiosClient';
import type { RespuestaApi } from '@/api/tipos';
import type { IndicadorGenerarFtp, PeriodoFtp, ResultadoCategoriaFtp, ResultadoIndicadorFtp } from '@/features/generar-ftp/tipos';

export const generacionFtpService = {
  /** Indicadores que se generan en FTP, con lo común del mapeo y los reportes SIAIS que lee cada uno. */
  async listarIndicadores(): Promise<IndicadorGenerarFtp[]> {
    const { data } = await api.get<RespuestaApi<IndicadorGenerarFtp[] | null>>('/Indicadores/ftp/indicadores');
    return data.data ?? [];
  },

  async generarIndicador(indicador: string, periodo: PeriodoFtp): Promise<RespuestaApi<ResultadoIndicadorFtp>> {
    const { data } = await api.get<RespuestaApi<ResultadoIndicadorFtp>>('/Indicadores/ftp/generar', {
      params: { indicador, ano: periodo.ano, mes: periodo.mes, semana: periodo.semana },
    });
    return data;
  },

  /** Regenera un mes definitivo que ya tiene reporte guardado (requiere contraseña). */
  async regenerarIndicador(indicador: string, periodo: PeriodoFtp, password: string): Promise<RespuestaApi<ResultadoIndicadorFtp>> {
    const { data } = await api.post<RespuestaApi<ResultadoIndicadorFtp>>('/Indicadores/ftp/regenerar', {
      indicador, ano: periodo.ano, mes: periodo.mes, password,
    });
    return data;
  },

  async generarCategoria(categoria: string, periodo: PeriodoFtp): Promise<RespuestaApi<ResultadoCategoriaFtp>> {
    const { data } = await api.post<RespuestaApi<ResultadoCategoriaFtp>>('/Indicadores/ftp/generar-categoria', {
      categoria, ano: periodo.ano, mes: periodo.mes, semana: periodo.semana ?? null,
    });
    return data;
  },

  /** Regenera toda una categoría cuyo mes definitivo ya fue generado (requiere contraseña). */
  async regenerarCategoria(categoria: string, periodo: PeriodoFtp, password: string): Promise<RespuestaApi<ResultadoCategoriaFtp>> {
    const { data } = await api.post<RespuestaApi<ResultadoCategoriaFtp>>('/Indicadores/ftp/regenerar-categoria', {
      categoria, ano: periodo.ano, mes: periodo.mes, password,
    });
    return data;
  },
};
