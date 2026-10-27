// Lo que responde src/api/dengue/pipelineApi.ts (copia de los modelos del backend).

/** GET /epidemiologia/pipeline/estado (dentro de ApiResponse). */
export interface EstadoPipeline {
  corriendo: boolean;
  paso: string;
  completado: boolean;
  error: string | null;
  /** Fecha del último análisis completo. */
  ultimo_reporte: string | null;
  archivos?: { operativa: boolean; siscep: boolean };
}
