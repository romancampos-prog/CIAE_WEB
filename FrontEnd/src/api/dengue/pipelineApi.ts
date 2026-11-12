// Endpoints de /epidemiologia/pipeline (epidemiologia/controllers/pipeline_controller.py).

// propios
import api from '@/api/cliente/axiosClient';
import type { EstadoPipeline } from '@/types/api/dengue/pipeline';
import type { RespuestaApi } from '@/types/api/respuestaApi';

export const pipelineDengueApi = {
  async estadoPipeline(): Promise<EstadoPipeline> {
    const { data } = await api.get<RespuestaApi<EstadoPipeline>>('/epidemiologia/pipeline/estado');
    return data.data;
  },

  async ejecutarPipeline(): Promise<void> {
    await api.post('/epidemiologia/pipeline/ejecutar');
  },
};
