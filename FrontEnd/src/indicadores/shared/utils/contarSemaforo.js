/**
 * Cuenta cuántos elementos caen en cada color de semáforo.
 * @param {Array<{color?: string}>} arr - Lista de unidades con su color de semáforo
 * @returns {{Esperado:number, Medio:number, Bajo:number, Gris:number}}
 */
export function contarSemaforo(arr) {
  const conteo = { Esperado: 0, Medio: 0, Bajo: 0, Gris: 0 };
  (arr ?? []).forEach(({ color }) => {
    if (color in conteo) conteo[color] += 1;
  });
  return conteo;
}
