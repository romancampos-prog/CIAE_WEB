/**
 * Cuenta cuántos elementos caen en cada color de semáforo.
 * @param {Array<{color?: string}>} arr - Lista de unidades con su color de semáforo
 * @returns {{Verde:number, Amarillo:number, Rojo:number, Gris:number}}
 */
export function contarSemaforo(arr) {
  const conteo = { Verde: 0, Amarillo: 0, Rojo: 0, Gris: 0 };
  (arr ?? []).forEach(({ color }) => {
    if (color in conteo) conteo[color] += 1;
  });
  return conteo;
}
