// propios
import { COLOR_SEMAFORO } from '../../constantes/semaforo';
import { formatoNumero } from '../../utils/datosGrafica';

/**
 * Tarjetita que aparece al pasar el mouse (o con el foco) sobre una barra, con el mismo
 * estilo que el tooltip de la gráfica anterior: borde izquierdo del color del semáforo,
 * valor, nivel y, abajo, numerador y denominador (aunque falte uno, así se ve cuál llegó).
 * Se muestra solo con CSS (ver .gi-tip en graficaIndicador.css).
 *
 * Props:
 *   titulo      — "Agosto", "UMF 50 GUANAJUATO"...
 *   valor       — texto del resultado ya formateado
 *   desempeno   — "Esperado" | "Medio" | "Bajo" | "Gris"
 *   numerador, denominador
 *   extra       — línea opcional (meta, estatal)
 */
const TooltipDato = ({ titulo, valor, desempeno, numerador, denominador, extra }) => (
  <span className="gi-tip" role="tooltip" style={{ '--status': COLOR_SEMAFORO[desempeno ?? 'Gris'] }}>
    <span className="gi-tip-titulo">{titulo}</span>
    <span className="gi-tip-fila">
      <span className="gi-tip-punto" />
      <span className="gi-tip-estado">{!desempeno || desempeno === 'Gris' ? 'Sin dato' : desempeno}</span>
      <strong>{valor}</strong>
    </span>
    {extra && <span className="gi-tip-extra">{extra}</span>}
    <span className="gi-tip-numden">
      <span>Num <strong>{formatoNumero(numerador)}</strong></span>
      <span>Den <strong>{formatoNumero(denominador)}</strong></span>
    </span>
  </span>
);

export default TooltipDato;
