// La misma clave la lee el script inline de index.html: si se cambia aquí, cambiarla allá.
const CLAVE_TEMA_GUARDADO = 'ciae-tema';

export const leerTemaGuardado = () => {
  try {
    const valor = localStorage.getItem(CLAVE_TEMA_GUARDADO);
    return valor === 'dark' || valor === 'light' ? valor : null;
  } catch {
    return null;
  }
};

const guardarTema = (tema) => {
  try {
    localStorage.setItem(CLAVE_TEMA_GUARDADO, tema);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el tema dura solo esta pestaña.
  }
};

const consultaTemaSistema = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export const temaDelSistema = () => (consultaTemaSistema()?.matches ? 'dark' : 'light');

export const temaActual = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

const aplicarTema = (tema) => {
  const raiz = document.documentElement;
  // La transición solo se activa al alternar a mano; al cargar la página
  // no debe animar nada (se vería un destello de colores).
  raiz.classList.add('tema-transicion');
  raiz.setAttribute('data-theme', tema);
  window.setTimeout(() => raiz.classList.remove('tema-transicion'), 300);
};

export const alternarTema = () => {
  const nuevoTema = temaActual() === 'dark' ? 'light' : 'dark';
  aplicarTema(nuevoTema);
  guardarTema(nuevoTema);
};

/** Notifica cada vez que cambia data-theme en <html> (lo usan useTema y las gráficas). */
export const suscribirTema = (alCambiar) => {
  const observador = new MutationObserver(alCambiar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observador.disconnect();
};

/**
 * Mientras el usuario no haya elegido tema a mano, se sigue al sistema
 * operativo también en vivo (p. ej. Windows cambia a oscuro al anochecer).
 */
export const seguirTemaDelSistema = () => {
  const consulta = consultaTemaSistema();
  if (!consulta) return;
  if (!leerTemaGuardado()) document.documentElement.setAttribute('data-theme', temaDelSistema());
  consulta.addEventListener?.('change', () => {
    if (!leerTemaGuardado()) aplicarTema(temaDelSistema());
  });
};
