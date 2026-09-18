/**
 * Leyendas de semáforo a partir del semáforo tal cual viene del mapeo unificado
 * (textos con operadores: {Esperado: '>= 4 a <= 7', Medio: '>= 1 a < 4', Bajo: '< 1 o > 7'}).
 * No decide colores (eso lo hace el backend) — solo arma el texto que muestra la UI.
 */

/**
 * True si el semáforo está partido por grupo (ej. IAAS 01 por tipo de hospital:
 * {HGS: {...}, HGZ: {...}, OOAD: {...}}) en vez de traer las metas directas.
 * @param {Object|undefined} semaforo
 * @returns {boolean}
 */
export function esSemaforoAgrupado(semaforo) {
  const valores = Object.values(semaforo ?? {});
  return valores.length > 0 && valores.every(v => v !== null && typeof v === 'object');
}

/**
 * @param {{Esperado?:string, Medio?:string, Bajo?:string}|undefined} metas
 * @param {string} [etiqueta] - Nombre del grupo a mostrar (ej. 'HGS'); sin él no se muestra encabezado
 * @returns {{_label?:string, Esperado:string, Medio:string, Bajo:string}|null}
 */
export function rangosDeMetas(metas, etiqueta) {
  if (!metas) return null;
  return {
    ...(etiqueta ? { _label: etiqueta } : {}),
    Esperado: metas.Esperado ?? '',
    Medio:    metas.Medio    ?? '',
    Bajo:     metas.Bajo     ?? '',
  };
}

/**
 * Junta los grupos de un semáforo agrupado que tienen metas idénticas en una sola
 * leyenda (ej. 'HGS' y 'HGR/HGZ/HGO/HGP/OOAD'). Si el mapeo cambia las metas de un
 * grupo, se separa solo.
 * @param {Object} semaforo - Semáforo agrupado
 * @returns {Array<{_label:string, Esperado:string, Medio:string, Bajo:string}>}
 */
export function agruparRangos(semaforo) {
  const grupos = new Map();
  Object.entries(semaforo).forEach(([nombre, metas]) => {
    const clave = `${metas.Esperado}|${metas.Medio}|${metas.Bajo}`;
    const previo = grupos.get(clave);
    grupos.set(clave, { metas, nombres: [...(previo?.nombres ?? []), nombre] });
  });
  return [...grupos.values()].map(({ metas, nombres }) => rangosDeMetas(metas, nombres.join('/')));
}
