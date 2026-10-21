// Variables CSS del tema (src/shared/estilos/tema.css): siguen solas al modo
// claro/oscuro en style={{}}, variables --status y clases.
export const COLOR_SEMAFORO = {
  Esperado: 'var(--semaforo-esperado)',
  Medio:    'var(--semaforo-medio)',
  Bajo:     'var(--semaforo-bajo)',
  Gris:     'var(--semaforo-gris)',
};

// Tonos claros del semáforo para la vista previa del Excel recién generado
// (GBarras y FilterPanel) -- mismas claves que manda el backend.
export const COLOR_SEMAFORO_CLARO = {
  Esperado: '#28a745',
  Medio:    '#ffc107',
  Bajo:     '#dc3545',
  Gris:     '#adb5bd',
};
