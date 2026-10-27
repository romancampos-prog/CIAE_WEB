// Endpoints de /Indicadores/iaas (Controller/iaas_Controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { DenominadoresCapturados, IndicadorGenerarIaas, SesionIaas } from '@/types/api/indicadores/iaas';
import type { RespuestaApi } from '@/types/api/respuestaApi';

export const iaasApi = {
  /** Indicadores IAAS que se generan, con los rótulos de columnas del Excel que se sube. */
  async listarIndicadores(): Promise<IndicadorGenerarIaas[]> {
    const { data } = await api.get<RespuestaApi<IndicadorGenerarIaas[] | null>>('/Indicadores/iaas/indicadores');
    return data.data ?? [];
  },

  /** Claves de las unidades que participan en IAAS. */
  async listarUnidades(): Promise<string[]> {
    const { data } = await api.get<RespuestaApi<string[] | null>>('/Indicadores/iaas/unidades');
    return data.data ?? [];
  },

  /** Meses ("MM") que ya tienen reporte IAAS guardado; si falla, ninguno. */
  async mesesGuardados(anio: string): Promise<string[]> {
    try {
      const { data } = await api.get<RespuestaApi<{ meses?: string[] } | null>>('/Indicadores/iaas/meses-generados', { params: { anio } });
      return data.data?.meses ?? [];
    } catch {
      return [];
    }
  },

  /** Lo que quedó pendiente del mes (unidades tardías); null si todavía no se generó. */
  async estadoDelMes(anio: string, mes: string): Promise<SesionIaas | null> {
    try {
      const { data } = await api.get<RespuestaApi<SesionIaas | null>>('/Indicadores/iaas/estado-mes', { params: { anio, mes } });
      return data.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Genera los reportes IAAS del mes: un Excel por unidad (numeradores), el Excel global para el
   * denominador de IAAS 01 y los denominadores capturados de IAAS 02–06.
   */
  async generar(
    anio: string,
    mes: string,
    archivosPorUnidad: Record<string, File>,
    denominadores: DenominadoresCapturados,
    excelDenominadorIaas01: File | null,
  ): Promise<RespuestaApi<unknown>> {
    const form = new FormData();
    form.append('anio', anio);
    form.append('mes', mes);
    if (excelDenominadorIaas01) {
      form.append('excel_denominador_IAAS_01', excelDenominadorIaas01);
      form.append('peso_excel_denominador_IAAS_01', String(excelDenominadorIaas01.size));
    }
    Object.entries(archivosPorUnidad).forEach(([unidad, file]) => {
      // El backend reconoce la unidad por el nombre del archivo.
      const archivo = new File([file], unidad, { type: file.type });
      form.append('numerador', archivo);
      form.append('pesoNumerador', String(archivo.size));
    });
    // El backend los espera por indicador: {indicador: {unidad: valor}}.
    const porIndicador: Record<string, Record<string, string>> = {};
    Object.entries(denominadores).forEach(([unidad, valores]) => {
      Object.entries(valores).forEach(([indicador, valor]) => {
        (porIndicador[indicador] ??= {})[unidad] = valor;
      });
    });
    form.append('denominador', JSON.stringify(porIndicador));
    const { data } = await api.post<RespuestaApi<unknown>>('/Indicadores/iaas/generar', form);
    return data;
  },

  /** Completa los datos de una unidad que entregó fuera de tiempo (requiere contraseña). */
  async completarUnidadTardia(datos: {
    anio: string;
    mes: string;
    unidad: string;
    indicadores: string[];
    denominadores: Record<string, string | null>;
    excelUnidad: File | null;
    excelDenominadorIaas01: File | null;
    password: string;
  }): Promise<RespuestaApi<unknown>> {
    const form = new FormData();
    form.append('anio', datos.anio);
    form.append('mes', datos.mes);
    form.append('unidad', datos.unidad);
    form.append('indicadores', JSON.stringify(datos.indicadores));
    form.append('denominadores', JSON.stringify(datos.denominadores));
    form.append('password', datos.password);
    if (datos.excelUnidad) {
      form.append('excel_unidad', datos.excelUnidad);
      form.append('peso_excel_unidad', String(datos.excelUnidad.size));
    }
    if (datos.excelDenominadorIaas01) {
      form.append('excel_denominador_iaas01', datos.excelDenominadorIaas01);
      form.append('peso_excel_denominador_iaas01', String(datos.excelDenominadorIaas01.size));
    }
    const { data } = await api.post<RespuestaApi<unknown>>('/Indicadores/iaas/completar-unidad', form);
    return data;
  },
};
