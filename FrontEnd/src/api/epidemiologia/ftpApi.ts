// Endpoints de /epidemiologia/ftp (epidemiologia/Controller/epiFTP.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { ExcelExtraccion, ExtraccionFtp, ExtraccionGuardada, PeriodoExtraccion } from '@/types/api/epidemiologia/ftp';
import type { RespuestaApi } from '@/types/api/respuestaApi';

export const ftpEpidemiologiaApi = {
  /** Baja el OC30 de las unidades del FTP, extrae las acciones y lo guarda en BD_CIAE (solo admin). semana null = definitivo. */
  /** Con el mensaje del backend: él cuenta unidades con error y con archivo duplicado. */
  async extraerOC30(ano: number, mes: number, semana: number | null): Promise<ExtraccionGuardada & { mensaje: string }> {
    const params = { ano, mes, ...(semana !== null && { semana }) };
    const { data } = await api.post<RespuestaApi<ExtraccionGuardada>>('/epidemiologia/ftp/extraer/OC30', null, { params });
    return { ...data.data, mensaje: data.message };
  },

  /** Lo guardado del mes: el definitivo o, si aún no hay, su última semana (404 si no hay nada). */
  async consultarOC30(ano: number, mes: number): Promise<ExtraccionFtp> {
    const { data } = await api.get<RespuestaApi<ExtraccionFtp>>('/epidemiologia/ftp/extraccion/OC30', { params: { ano, mes } });
    return data.data;
  },

  /** Los meses del año con extracción guardada. */
  async periodosOC30(ano: number): Promise<PeriodoExtraccion[]> {
    const { data } = await api.get<RespuestaApi<PeriodoExtraccion[]>>('/epidemiologia/ftp/extraccion/OC30/periodos', { params: { ano } });
    return data.data;
  },

  /**
   * Excel de los registros entre dos fechas (aaaa-mm-dd), aunque abarquen varios meses. El usuario
   * de unidad solo recibe los de su unidad (lo decide el backend). Con el mensaje del backend.
   */
  async excelOC30(desde: string, hasta: string): Promise<ExcelExtraccion & { mensaje: string }> {
    const { data } = await api.get<RespuestaApi<ExcelExtraccion>>('/epidemiologia/ftp/excel/OC30', { params: { desde, hasta } });
    return { ...data.data, mensaje: data.message };
  },
};
