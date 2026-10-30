// propios
import type { PuntoColumna } from '@/types/pantallas/graficas';
import FranjasSemaforo from './FranjasSemaforo';
import TooltipDato from './TooltipDato';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { formatoNumero, limitesDe, techoDe } from '@/features/graficas/utils/datosGrafica';

interface Props {
  puntos: PuntoColumna[];
  activo: string;
  /** Meta de rango: un punto en vez de barra (una barra alta no es "mejor"). */
  comoPuntos?: boolean;
  /** Palabras del mapeo para el numerador y el denominador (perfil). */
  etiquetaNumerador?: string | null;
  etiquetaDenominador?: string | null;
  onElegir?: (clave: string) => void;
}

/**
 * Columnas de una unidad a lo largo del tiempo (meses, ventanas o cortes), cada una sobre el fondo
 * de color de SU semáforo: si cambia cada mes (acumulados), el fondo sube en escalón solo. Una
 * línea gris une los resultados y al pasar el mouse sale Num/Den.
 *
 * activo = clave del periodo resaltado (el mes de la página); onElegir, si se pasa, elige el periodo al dar clic.
 */
const ColumnasTendencia = ({ puntos, activo, comoPuntos = false, etiquetaNumerador, etiquetaDenominador, onElegir }: Props) => {
  const techo = techoDe([...puntos.map(p => p.resultado), ...puntos.flatMap(p => limitesDe(p.franjas))]);
  const porcentaje = (valor: number) => Math.min(100, (valor / techo) * 100);
  const alto = (valor: number) => `${porcentaje(valor)}%`;
  // El eje marca los cortes del semáforo del periodo elegido: el número justo donde cambia el color
  const franjasActivas = (puntos.find(p => p.clave === activo) ?? puntos[puntos.length - 1])?.franjas ?? [];
  const cortes = [...new Set(limitesDe(franjasActivas))].filter(v => v > 0 && v < techo);

  // Línea de tendencia: une la punta de cada barra (las columnas miden lo mismo, sin hueco entre ellas).
  const linea = puntos
    .map((p, i) => (p.resultado == null ? null : `${i + 0.5},${100 - porcentaje(p.resultado)}`))
    .filter(Boolean)
    .join(' ');

  return (
    <div className="gi-columnas">
      <div className="gi-columnas-eje" aria-hidden>
        <span style={{ bottom: '0%' }}>0</span>
        {cortes.map(c => <span key={c} className="gi-eje-corte" style={{ bottom: `${porcentaje(c)}%` }}>{formatoNumero(c)}</span>)}
        {/* El techo solo si no choca con un corte */}
        {cortes.every(c => porcentaje(c) < 90) && <span style={{ bottom: '100%' }}>{formatoNumero(techo)}</span>}
      </div>
      <div className="gi-columnas-area">
        <div className="gi-columnas-fila" style={{ '--n': puntos.length }}>
          {puntos.filter(p => p.resultado != null).length > 1 && (
            <svg className={`gi-columnas-tendencia${comoPuntos ? '' : ' gi-columnas-tendencia--barras'}`} viewBox={`0 0 ${puntos.length} 100`} preserveAspectRatio="none" aria-hidden>
              {/* key = la línea: al cambiar de unidad o de mes se vuelve a trazar */}
              <polyline key={linea} points={linea} />
            </svg>
          )}
          {puntos.map((p, i) => {
            const clase = `gi-columna${p.clave === activo ? ' gi-columna--activa' : ''}${p.parcial ? ' gi-columna--parcial' : ''}`;
            const contenido = (
              <>
                <span className="gi-columna-cuerpo">
                  <FranjasSemaforo franjas={p.franjas} techo={techo} orientacion="vertical" conFondo />
                  {p.resultado != null && (comoPuntos
                    ? (
                      // Cada punto aparece cuando la línea llega a él (--orden)
                      <span
                        key={`${p.clave}-${p.resultado}`}
                        className="gi-columna-punto"
                        style={{ bottom: alto(p.resultado), '--status': COLOR_SEMAFORO[p.desempeno], '--orden': i / Math.max(1, puntos.length - 1) }}
                      >
                        <span className="gi-columna-valor">{formatoNumero(p.resultado)}</span>
                      </span>
                    ) : (
                      <span className="gi-columna-barra" style={{ height: alto(p.resultado), '--status': COLOR_SEMAFORO[p.desempeno] }}>
                        <span className="gi-columna-valor">{formatoNumero(p.resultado)}</span>
                      </span>
                    ))}
                  {p.resultado == null && <span className="gi-columna-sin-dato">—</span>}
                  <TooltipDato
                    titulo={p.etiquetaLarga ?? p.etiqueta}
                    valor={p.valorTexto}
                    desempeno={p.desempeno}
                    numerador={p.numerador}
                    denominador={p.denominador}
                    extra={p.extra}
                    etiquetaNumerador={etiquetaNumerador}
                    etiquetaDenominador={etiquetaDenominador}
                  />
                </span>
                <span className="gi-columna-etiqueta">{p.etiqueta}</span>
              </>
            );
            return onElegir
              ? <button key={p.clave} type="button" onClick={() => onElegir(p.clave)} className={clase} aria-label={p.titulo}>{contenido}</button>
              : <div key={p.clave} className={clase} aria-label={p.titulo}>{contenido}</div>;
          })}
        </div>
      </div>
    </div>
  );
};

export default ColumnasTendencia;
