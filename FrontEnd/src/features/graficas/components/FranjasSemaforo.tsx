// propios
import type { Franja } from '@/types/api/indicadores/reportes';
import { cortesConTono } from '@/features/graficas/utils/datosGrafica';

interface Props {
  franjas: Franja[];
  /** El valor más alto de la escala: lo que pasa de ahí no se dibuja. */
  techo: number;
  /** vertical = columnas de la tendencia; horizontal = filas de comparar. */
  orientacion: 'vertical' | 'horizontal';
  /** Metas de rango (puntos): el fondo pintado por nivel en vez de líneas, para ver en qué zona cae cada punto. */
  conFondo?: boolean;
}

/**
 * El semáforo detrás del dato, con los números que manda el backend. Dos formas:
 *  - líneas (barras): los cortes como líneas punteadas de color; verde donde empieza (o termina)
 *    Esperado y roja donde empieza Bajo, entre las dos queda Medio. Con dos niveles, solo la verde.
 *  - fondo (puntos de rango): cada franja pintada tenue con el color de su nivel.
 * Juntas las de cada columna/fila forman una sola línea o franja; si el semáforo cambia cada mes
 * (acumulados), sube en escalón.
 */
const FranjasSemaforo = ({ franjas, techo, orientacion, conFondo = false }: Props) => {
  const porcentaje = (valor: number) => Math.max(0, Math.min(100, (valor / techo) * 100));
  const ubicar = (inicio: number, tamano?: number) => (orientacion === 'vertical'
    ? { bottom: `${inicio}%`, ...(tamano != null && { height: `${tamano}%` }) }
    : { left: `${inicio}%`, ...(tamano != null && { width: `${tamano}%` }) });

  if (conFondo) {
    return (
      <span className={`gi-cortes gi-cortes--${orientacion} gi-cortes--fondo`} aria-hidden>
        {franjas.map(f => {
          const inicio = porcentaje(f.desde ?? 0);
          const tamano = porcentaje(f.hasta ?? techo) - inicio;
          return tamano > 0
            ? <span key={`${f.nivel}-${f.desde}`} className={`gi-franja gi-franja--${f.nivel}`} style={ubicar(inicio, tamano)} />
            : null;
        })}
      </span>
    );
  }

  const cortes = cortesConTono(franjas).filter(c => c.valor > 0 && c.valor < techo);

  return (
    <span className={`gi-cortes gi-cortes--${orientacion}`} aria-hidden>
      {cortes.map(c => (
        <span
          key={c.valor}
          className={`gi-corte gi-corte--${c.tono}`}
          style={ubicar(porcentaje(c.valor))}
        />
      ))}
    </span>
  );
};

export default FranjasSemaforo;
