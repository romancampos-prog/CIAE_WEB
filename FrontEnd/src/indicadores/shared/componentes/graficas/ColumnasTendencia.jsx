// propios
import TooltipDato from './TooltipDato';
import { COLOR_SEMAFORO } from '../../constantes/semaforo';
import { formatoNumero, techoDe } from '../../utils/datosGrafica';

/**
 * Columnas de una unidad a lo largo del tiempo (meses o cortes). Cada columna lleva su
 * resultado con el color del semáforo, la meta de ese periodo (raya punteada, o una franja
 * si la meta es un rango) y el estatal como punto para comparar. Como en la gráfica
 * anterior: barras redondeadas que crecen al aparecer, rejilla punteada, línea de
 * tendencia gris y una tarjetita con Num/Den al pasar el mouse.
 *
 * Props:
 *   puntos    — [{ clave, etiqueta, titulo, valorTexto, extra, resultado, desempeno,
 *                  numerador, denominador, meta, estatal, parcial }]
 *   activo    — clave del periodo resaltado (el mes de la página)
 *   onElegir  — fn(clave), opcional: elegir el periodo al dar clic
 */
const ColumnasTendencia = ({ puntos, activo, onElegir }) => {
  const techo = techoDe(puntos.flatMap(p => [p.resultado, p.estatal, p.meta?.valor, p.meta?.maximo]));
  const porcentaje = (valor) => Math.min(100, (valor / techo) * 100);
  const alto = (valor) => `${porcentaje(valor)}%`;
  const marcas = [techo, techo * 0.75, techo / 2, techo / 4, 0];

  // Línea de tendencia: une la punta de cada barra (las columnas miden lo mismo, sin hueco entre ellas).
  const linea = puntos
    .map((p, i) => (p.resultado == null ? null : `${i + 0.5},${100 - porcentaje(p.resultado)}`))
    .filter(Boolean)
    .join(' ');

  return (
    <div className="gi-columnas">
      <div className="gi-columnas-eje" aria-hidden>
        {marcas.map(m => <span key={m}>{formatoNumero(m)}</span>)}
      </div>
      <div className="gi-columnas-area">
        <div className="gi-columnas-fila" style={{ '--n': puntos.length }}>
          <span className="gi-columnas-rejilla" aria-hidden />
          {puntos.filter(p => p.resultado != null).length > 1 && (
            <svg className="gi-columnas-tendencia" viewBox={`0 0 ${puntos.length} 100`} preserveAspectRatio="none" aria-hidden>
              <polyline points={linea} />
            </svg>
          )}
          {puntos.map(p => {
            const Etiqueta = onElegir ? 'button' : 'div';
            return (
              <Etiqueta
                key={p.clave}
                {...(onElegir ? { type: 'button', onClick: () => onElegir(p.clave) } : {})}
                className={`gi-columna${p.clave === activo ? ' gi-columna--activa' : ''}${p.parcial ? ' gi-columna--parcial' : ''}`}
                aria-label={p.titulo}
              >
                <span className="gi-columna-cuerpo">
                  {p.meta?.minimo != null && (
                    <span className="gi-columna-rango" style={{ bottom: alto(p.meta.minimo), height: `calc(${alto(p.meta.maximo)} - ${alto(p.meta.minimo)})` }} />
                  )}
                  {p.resultado != null && (
                    <span className="gi-columna-barra" style={{ height: alto(p.resultado), '--status': COLOR_SEMAFORO[p.desempeno] }}>
                      <span className="gi-columna-valor">{formatoNumero(p.resultado)}</span>
                    </span>
                  )}
                  {p.resultado == null && <span className="gi-columna-sin-dato">—</span>}
                  {p.meta?.valor != null && <span className="gi-columna-meta" style={{ bottom: alto(p.meta.valor) }} />}
                  {p.estatal != null && <span className="gi-columna-estatal" style={{ bottom: alto(p.estatal) }} />}
                  <TooltipDato
                    titulo={p.etiquetaLarga ?? p.etiqueta}
                    valor={p.valorTexto}
                    desempeno={p.desempeno}
                    numerador={p.numerador}
                    denominador={p.denominador}
                    extra={p.extra}
                  />
                </span>
                <span className="gi-columna-etiqueta">{p.etiqueta}</span>
              </Etiqueta>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ColumnasTendencia;
