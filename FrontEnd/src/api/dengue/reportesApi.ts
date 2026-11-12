// Endpoints de /epidemiologia/reportes (epidemiologia/controllers/reportes_controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { DatosAlertasSiscep, DatosCanal, DatosMapa, PosibleDuplicado, RegistroCaso, TipoMapa } from '@/types/api/dengue/reportes';

export const reportesDengueApi = {
  // Los reportes llegan directos (sin ApiResponse): el backend responde el JSON guardado.

  async canal(): Promise<DatosCanal> {
    const { data } = await api.get<DatosCanal>('/epidemiologia/reportes/canal');
    return data;
  },

  async mapa(tipo: TipoMapa): Promise<DatosMapa> {
    const { data } = await api.get<DatosMapa>(`/epidemiologia/reportes/mapa/${tipo}`);
    return data;
  },

  /** Muestras rechazadas, pendientes, sin muestra, etc. */
  async alertasSiscep(): Promise<DatosAlertasSiscep> {
    const { data } = await api.get<DatosAlertasSiscep>('/epidemiologia/reportes/alertas-siscep');
    return data;
  },

  /** Duplicados confirmados que el algoritmo quitó de la base. */
  async duplicados(): Promise<RegistroCaso[]> {
    const { data } = await api.get<RegistroCaso[]>('/epidemiologia/reportes/duplicados');
    return data;
  },

  /** Pares que podrían ser duplicados y necesitan revisión manual. */
  async posiblesDuplicados(): Promise<PosibleDuplicado[]> {
    const { data } = await api.get<PosibleDuplicado[]>('/epidemiologia/reportes/posibles-duplicados');
    return data;
  },
};
