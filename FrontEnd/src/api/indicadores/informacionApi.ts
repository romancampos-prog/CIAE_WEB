// Endpoints de /Indicadores/informacion (Controller/informacion_Controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { FamiliaIndicadores, FichaIndicador, FichaTecnicaCompleta } from '@/types/api/indicadores/informacion';

export const informacionApi = {
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
};
