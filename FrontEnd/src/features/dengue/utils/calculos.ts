// propios
import type { DatosAlertasSiscep, DatosCanal, RegistroCaso, TipoMapa } from '@/types/api/dengue/reportes';
import type { SeccionAlertaSiscep } from '@/types/pantallas/dengue';

/**
 * Calcula los KPIs del canal endémico a partir de los datos de la API.
 */
export function calcularKpisCanal(datos: DatosCanal) {
  // Las semanas que todavía no pasan llegan en null: no suman ni cuentan
  const casos        = datos.casos_actual.map(c => c ?? 0);
  const totalCasos   = casos.reduce((a, b) => a + b, 0);
  const picoCasos    = Math.max(0, ...casos);
  const picaSemana   = datos.semanas[casos.indexOf(picoCasos)];
  const semsAlerta   = datos.alertas.length;
  const semsConDatos = casos.filter(c => c > 0).length;
  return { totalCasos, picoCasos, picaSemana, semsAlerta, semsConDatos };
}

/**
 * Calcula los KPIs de la página de alertas SisCep.
 */
export function calcularKpisAlertas(datos: DatosAlertasSiscep, secciones: SeccionAlertaSiscep[]) {
  const totalRegistros   = secciones.reduce((s, { clave }) => s + (datos[clave]?.length || 0), 0);
  const seccionesActivas = secciones.filter(({ clave }) => (datos[clave]?.length || 0) > 0).length;
  const prioritarias     = datos.graves_sin_muestra?.length || 0;
  return { totalRegistros, seccionesActivas, prioritarias };
}

/**
 * Agrupa un array de registros de duplicados por la clave `METODO`.
 * Regresa el conteo por método.
 */
export function agruparPorMetodo(registros: RegistroCaso[]): Record<string, number> {
  return registros.reduce<Record<string, number>>((acc, r) => {
    const metodo = String(r.METODO);
    acc[metodo] = (acc[metodo] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Devuelve los valores de tema (color, fondo, borde, etiqueta) según el tipo de mapa.
 */
export function getTemaMapa(tipo: TipoMapa) {
  if (tipo === 'situacion') {
    return {
      etiqueta:  'Casos Notificados',
      colorTema: 'var(--epi-verde)',
      bgTema:    'rgba(36,92,79,0.07)',
      bordeTema: 'rgba(36,92,79,0.18)',
    };
  }
  return {
    etiqueta:  'Casos Confirmados',
    colorTema: 'var(--epi-guinda)',
    bgTema:    'rgba(105,28,50,0.07)',
    bordeTema: 'rgba(105,28,50,0.18)',
  };
}
