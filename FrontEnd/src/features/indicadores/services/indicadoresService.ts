// propios
import api from '@/api/axiosClient';
import type { RespuestaApi } from '@/api/tipos';
import type { ExcelIndicadores, FamiliaIndicadores, FichaIndicador, FichaTecnicaCompleta } from '@/features/indicadores/tipos';

// ano/modulo/previos van como query params: un GET con body no llega igual desde el
// navegador (probado: el body llegaba vacío al backend).

export const indicadoresService = {
  /**
   * Familias con sus indicadores, para menús y selectores.
   * campo: bandera del mapeo que decide qué se lista ("mostrarGrafica" por defecto, o "mostrarGenerar").
   * modulo: solo los de ese módulo ("ftp", "iaas", "Extractor").
   */
  async listarFamilias(filtros: { campo?: string; modulo?: string } = {}): Promise<FamiliaIndicadores[]> {
    const { data } = await api.get<FamiliaIndicadores[]>('/Indicadores/informacion/indicadores', { params: filtros });
    return data ?? [];
  },

  /** Ficha corta: título, objetivo, semáforo, periodicidad y si es mensual/acumulado. */
  async obtenerFicha(indicador: string, ano: string): Promise<FichaIndicador> {
    const { data } = await api.get<FichaIndicador>(`/Indicadores/informacion/ficha/${encodeURIComponent(indicador)}`, {
      params: { ano },
    });
    return data;
  },

  /** Ficha técnica completa (además, cómo se calcula), para el panel FichaTecnicaBoton. */
  async obtenerFichaTecnica(indicador: string): Promise<FichaTecnicaCompleta> {
    const { data } = await api.get<FichaTecnicaCompleta>(`/Indicadores/informacion/ficha-tecnica/${encodeURIComponent(indicador)}`);
    return data;
  },

  /** Meses ya guardados de un indicador ("01".."12"); si falla, ninguno. */
  async mesesGenerados(indicador: string, ano: string): Promise<string[]> {
    try {
      const { data } = await api.get<RespuestaApi<{ meses?: string[] } | null>>('/Indicadores/ftp/meses-generados', {
        params: { indicador, ano },
      });
      return data.data?.meses ?? [];
    } catch {
      return [];
    }
  },

  /**
   * Excel de uno o varios indicadores, armado desde lo guardado en BD_CIAE. Uno = Excel individual;
   * varios = una pestaña por indicador. Sin mes trae el último reporte de cada indicador.
   */
  async descargarExcel(indicadores: string[], ano: string | number, mes: string | null = null): Promise<ExcelIndicadores> {
    // URLSearchParams para que la lista salga como indicadores=a&indicadores=b (axios usa indicadores[]=a)
    const params = new URLSearchParams();
    indicadores.forEach(indicador => params.append('indicadores', indicador));
    params.append('ano', String(ano));
    if (mes) params.append('mes', mes);
    const { data } = await api.get<RespuestaApi<ExcelIndicadores>>('/Indicadores/excel', { params });
    return data.data;
  },
};
