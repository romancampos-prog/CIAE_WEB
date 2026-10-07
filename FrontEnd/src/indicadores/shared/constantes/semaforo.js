// Variables CSS del tema (src/shared/estilos/tema.css): siguen solas al modo
// claro/oscuro en style={{}}, variables --status y clases.
export const COLOR_SEMAFORO = {
  Esperado: 'var(--semaforo-esperado)',
  Medio:    'var(--semaforo-medio)',
  Bajo:     'var(--semaforo-bajo)',
  Gris:     'var(--semaforo-gris)',
};

// Los atributos SVG de Recharts (fill de cada barra) no aceptan var(), así que
// las barras usan el hex del tema activo. Mantener igual que --semaforo-* en tema.css.
export const COLOR_SEMAFORO_HEX = {
  light: { Esperado: '#0b5445', Medio: '#9a7026', Bajo: '#7E0808', Gris: '#a4a4a4' },
  dark:  { Esperado: '#3a9e80', Medio: '#c9a04a', Bajo: '#e07370', Gris: '#8a94a0' },
};

// Tonos claros del semáforo para la vista previa del Excel recién generado
// (GBarras y FilterPanel) -- mismas claves que manda el backend.
export const COLOR_SEMAFORO_CLARO = {
  Esperado: '#28a745',
  Medio:    '#ffc107',
  Bajo:     '#dc3545',
  Gris:     '#adb5bd',
};
