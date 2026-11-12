// Secciones de las alertas de SisCep.

// propios
import type { DatosAlertasSiscep } from '@/types/api/dengue/reportes';

export type TipoColumnasAlerta = 'cols_caso' | 'cols_pend';

export interface SeccionAlertaSiscep {
  clave: Exclude<keyof DatosAlertasSiscep, 'año' | 'tabla_negativos'>;
  titulo: string;
  descripcion: string;
  tipo: TipoColumnasAlerta;
  color: string;
  prioritaria?: boolean;
}
