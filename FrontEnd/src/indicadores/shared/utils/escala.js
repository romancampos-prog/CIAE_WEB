/**
 * Techo del eje Y de las gráficas de barras: el valor máximo real de los
 * datos (sin colchón fijo -- el redondeo "nice" en ticksEscala ya deja el
 * aire justo arriba de la barra más alta, ver abajo).
 */
export function techoEscala(valores) {
  return Math.max(...valores.map(v => v ?? 0), 1);
}

/**
 * Redondea `valor` al "número lindo" más cercano (1, 2, 5 o 10 veces una
 * potencia de 10) -- mismo criterio que usan D3/matplotlib para elegir el
 * tamaño de paso de un eje. Con esto el paso se adapta a la magnitud real de
 * cada indicador (2 en 2 para un ~15%, 10 en 10 para un ~80%, 20 en 20 para
 * un ~150), en vez de forzar siempre múltiplos de 5.
 */
function numeroLindo(valor) {
  const exponente = Math.floor(Math.log10(valor));
  const fraccion  = valor / 10 ** exponente;
  const fraccionLinda = fraccion < 1.5 ? 1 : fraccion < 3 ? 2 : fraccion < 7 ? 5 : 10;
  return fraccionLinda * 10 ** exponente;
}

/**
 * Ticks explícitos del eje Y: parejos entre sí y con el techo pegado al
 * valor máximo real (la barra más alta define la escala), no a un múltiplo
 * de 5 fijo que dejaba mucho aire vacío arriba cuando el máximo era chico
 * (ej. 15.50 antes terminaba en 20; ahora en 16).
 *
 * Se pasan directo a Recharts en vez de dejar que los calcule solo: si no
 * recibe una lista de ticks, Recharts arma sus propios saltos y además
 * agrega el valor exacto del domain como tick extra cuando no coincide con
 * su propio paso.
 */
export function ticksEscala(maxValor, maxTicks = 8) {
  if (!(maxValor > 0)) return [0, 1];

  const pasoIdeal = maxValor / (maxTicks - 1);
  const paso      = numeroLindo(pasoIdeal);
  const nPasos    = Math.ceil(maxValor / paso);

  return Array.from({ length: nPasos + 1 }, (_, i) => Math.round(i * paso * 1e6) / 1e6);
}
