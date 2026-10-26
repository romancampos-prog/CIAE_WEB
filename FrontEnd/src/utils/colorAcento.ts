/**
 * Color de categoría/indicador listo para usarse como TEXTO en style={{}}.
 * Se mezcla con --texto según --acento-peso; hoy vale 100% en ambos temas, así
 * que devuelve el color tal cual (cada indicador conserva su color en oscuro).
 * Solo para texto/bordes: los fondos con texto blanco usan el color directo.
 */
export const textoAcento = (color: string): string =>
  `color-mix(in srgb, ${color} var(--acento-peso), var(--texto))`;
