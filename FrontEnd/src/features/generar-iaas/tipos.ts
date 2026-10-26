// Lo que manda el backend en Generar IAAS. Copia de BackEnd/indicadores/schemas/model/
// pagina_generar_Model.py (IndicadorGenerarIAAS) e iaas_Model.py (SesionIAAS).

/** GET /Indicadores/iaas/indicadores. */
export interface IndicadorGenerarIaas {
  indicador: string;
  categoria: string;
  nombreCategoria: string;
  titulo: string;
  periodicidad: string;
  imagen: string;
  color: string;
  /** Rótulos de las columnas del Excel que se sube. */
  columnaNumerador: string;
  columnaDenominador: string;
}

/** GET /Indicadores/iaas/estado-mes: lo que quedó pendiente del mes (para unidades tardías). */
export interface SesionIaas {
  anio: string;
  mes: string;
  mes_nombre: string;
  unidades_pendientes: string[];
  indicadores_pendientes: Record<string, string[]>;
  denominadores_guardados: Record<string, Record<string, number | null>>;
  numeradores_guardados: Record<string, Record<string, number | null>>;
}

/** {unidad: {indicador: valor capturado}}: texto tal cual se escribe ("125" o ""). */
export type DenominadoresCapturados = Record<string, Record<string, string>>;
