/**
 * Techo del eje Y de las gráficas de barras: el entero arriba del máximo real,
 * más 1 de aire (ej. 31.10 → 33, 31.9 → 33).
 */
export function techoEscala(valores) {
  const max = Math.max(...valores.map(v => v ?? 0), 1);
  return Math.ceil(max) + 1;
}

/**
 * Ticks explícitos del eje Y, todos múltiplos de 5 hasta el techo.
 *
 * Se pasan directo a Recharts en vez de dejar que los calcule solo: si no
 * recibe una lista de ticks, Recharts arma sus propios saltos "nice" y además
 * agrega el valor exacto del domain como tick extra cuando no coincide con su
 * propio paso — eso es lo que se veía como escala rota (ej. 0/15/30/45/50, con
 * el 50 fuera de patrón). Con ticks fijos ese problema no puede pasar.
 */
export function ticksEscala(techo, maxTicks = 8) {
  let paso = 5;
  while (techo / paso > maxTicks) paso += 5;

  const ticks = [];
  for (let t = 0; t <= techo; t += paso) ticks.push(t);
  if (ticks[ticks.length - 1] !== techo) ticks.push(techo);
  return ticks;
}
