// propios
import type { PropsIcono } from './tipos';

// Flechas y chevrons para navegar, avanzar o desplegar.

export const IconoChevronAbajo = ({ tamano = 14, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} {...props}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export const IconoChevronDerecha = ({ tamano = 11, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} {...props}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const IconoChevronIzquierda = ({ tamano = 14, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} {...props}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const IconoFlechaDerecha = ({ tamano = 16, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} {...props}>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

export const IconoFlechaIzquierda = ({ tamano = 16, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} {...props}>
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

export const IconoChevronArriba = ({ tamano = 14, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} {...props}>
    <polyline points="6 15 12 9 18 15"/>
  </svg>
);
