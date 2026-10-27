// Endpoints de /Indicadores/extractor (Controller/extractor_Controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { ArchivoExtractor, EstadoCorte, IndicadorGenerarExtractor, ResultadoIndicadorExtractor } from '@/types/api/indicadores/extractor';
import type { RespuestaApi } from '@/types/api/respuestaApi';

type ResultadoPorIndicador = RespuestaApi<Record<string, ResultadoIndicadorExtractor>>;

export const extractorApi = {
  /**
   * Indicadores del Extractor: lo común del mapeo más si es de corte o mensual, cómo agrupa,
   * de dónde sale el denominador y qué archivos usa (SUI-13, Egresos) y para qué.
   */
  async listarIndicadores(): Promise<IndicadorGenerarExtractor[]> {
    const { data } = await api.get<RespuestaApi<IndicadorGenerarExtractor[] | null>>('/Indicadores/extractor/indicadores');
    return data.data ?? [];
  },

  /**
   * Por cada ventana de corte que toca el año (Junio y Diciembre del año, Junio del siguiente):
   * cuántos de sus 12 meses ya están subidos para TODOS los indicadores. Si falla, null.
   */
  async estadoCortes(anio: number): Promise<Record<string, EstadoCorte> | null> {
    try {
      const { data } = await api.get<RespuestaApi<Record<string, EstadoCorte> | null>>('/Indicadores/extractor/estado-cortes', { params: { anio } });
      return data.data ?? null;
    } catch (error) {
      console.error('Error al obtener el estado del extractor:', error);
      return null;
    }
  },

  /** Cada archivo (SUI-13, Egresos, ...) y su estado en cada mes del año. Si falla, null. */
  async estadoArchivos(anio: number): Promise<{ anio: number; archivos: ArchivoExtractor[] } | null> {
    try {
      const { data } = await api.get<RespuestaApi<{ anio: number; archivos: ArchivoExtractor[] } | null>>('/Indicadores/extractor/estado-archivos', { params: { anio } });
      return data.data ?? null;
    } catch (error) {
      console.error('Error al obtener el estado de archivos del extractor:', error);
      return null;
    }
  },

  /**
   * Sube el Excel crudo de un mes y lo procesa para todos los indicadores que lo usan.
   * archivoBase (SUI_13, EGRESOS_TOCO...) decide qué indicadores se procesan.
   */
  async subirArchivoMensual(anio: number, mes: string, archivo: File, archivoBase: string): Promise<ResultadoPorIndicador> {
    const form = new FormData();
    form.append('anio', String(anio));
    form.append('mes', mes);
    form.append('archivo', archivo);
    form.append('pesoArchivo', String(archivo.size));
    form.append('archivoBase', archivoBase);
    const { data } = await api.post<ResultadoPorIndicador>('/Indicadores/extractor/generar', form);
    return data;
  },

  /** Sube solo el archivo de cruce (Egresos) de un mes: completa la vía 2 con lo que dejó el SUI-13. */
  async subirCruce(anio: number, mes: string, archivo: File): Promise<ResultadoPorIndicador> {
    const form = new FormData();
    form.append('anio', String(anio));
    form.append('mes', mes);
    form.append('archivo', archivo);
    form.append('pesoArchivo', String(archivo.size));
    const { data } = await api.post<ResultadoPorIndicador>('/Indicadores/extractor/completar-cruce', form);
    return data;
  },
};
