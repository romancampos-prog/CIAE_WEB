// propios
import type { TipoColumnasAlerta } from '@/features/dengue/components/alertas/SeccionAlerta';
import type { DatosAlertasSiscep } from '@/features/dengue/tipos';

export interface SeccionAlertaSiscep {
  clave: Exclude<keyof DatosAlertasSiscep, 'año' | 'tabla_negativos'>;
  titulo: string;
  descripcion: string;
  tipo: TipoColumnasAlerta;
  color: string;
  prioritaria?: boolean;
}

// Las cinco alertas de SisCep, en el orden en que se muestran.
export const SECCIONES_ALERTAS: SeccionAlertaSiscep[] = [
  { clave: 'muestras_rechazadas',  titulo: 'Alerta 1 — Muestras rechazadas',                     descripcion: 'Muestras rechazadas por el laboratorio. Debe retomarse una nueva muestra.',                                                           tipo: 'cols_caso', color: '#691c32' },
  { clave: 'pendientes_clasificar',titulo: 'Alerta 2 — Pendientes de clasificación',              descripcion: 'Casos con resultado disponible en SisCep pero sin diagnóstico final capturado.',                                                       tipo: 'cols_pend', color: '#a7802d' },
  { clave: 'recibidas_adecuadas',  titulo: 'Alerta 3 — Recibidas adecuadas pendientes de resultado', descripcion: 'Muestras recibidas correctamente en laboratorio, en espera de resultado.',                                                        tipo: 'cols_caso', color: '#245c4f' },
  { clave: 'sin_muestra',          titulo: 'Alerta 4 — Sin muestra de laboratorio',               descripcion: 'Casos de dengue sin muestra registrada (valor 0 o vacío).',                                                                          tipo: 'cols_caso', color: '#a7802d' },
  { clave: 'graves_sin_muestra',   titulo: 'Alerta 5 — Casos graves sin muestra',                 descripcion: 'Dengue con Signos de Alarma o Grave con muestra no tomada. La muestra es obligatoria en casos graves.',                              tipo: 'cols_caso', color: '#691c32', prioritaria: true },
]
