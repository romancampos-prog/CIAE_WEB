// propios
import type { Tema } from '@/types/pantallas/tema';

// La misma clave la lee el script inline de index.html: si se cambia aquí, cambiarla allá.
const CLAVE_TEMA_GUARDADO = 'ciae-tema';

const leerTemaGuardado = (): Tema | null => {
  try {
    const valor = localStorage.getItem(CLAVE_TEMA_GUARDADO);
    return valor === 'dark' || valor === 'light' ? valor : null;
  } catch {
    return null;
  }
};

const guardarTema = (tema: Tema) => {
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

const temaDelSistema = (): Tema => (consultaTemaSistema()?.matches ? 'dark' : 'light');

export const temaActual = (): Tema =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

const aplicarTema = (tema: Tema) => {
  const raiz = document.documentElement;
  // La transición solo se activa al alternar a mano; al cargar la página
  // no debe animar nada (se vería un destello de colores).
  raiz.classList.add('tema-transicion');
  raiz.setAttribute('data-theme', tema);
  window.setTimeout(() => raiz.classList.remove('tema-transicion'), 300);
};

export const alternarTema = () => {
  const nuevoTema: Tema = temaActual() === 'dark' ? 'light' : 'dark';
  aplicarTema(nuevoTema);
  guardarTema(nuevoTema);
};

/** Notifica cada vez que cambia data-theme en <html> (lo usan useTema y las gráficas). */
export const suscribirTema = (alCambiar: () => void) => {
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
