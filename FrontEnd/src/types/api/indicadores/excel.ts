// Lo que responde src/api/indicadores/excelApi.ts (copia de los modelos del backend).

/** {archivo_b64, nombre_archivo} de GET /Indicadores/excel. */
export interface ExcelIndicadores {
  archivo_b64: string;
  nombre_archivo: string;
  completados: string[];
  errores: Record<string, string>;
}
