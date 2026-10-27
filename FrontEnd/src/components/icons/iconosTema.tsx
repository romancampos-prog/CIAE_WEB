// propios
import type { PeriodoDelDia } from '@/types/pantallas/tema';
import type { PropsIcono } from './tipos';

// Tema claro/oscuro.

export const IconoLuna = ({ tamano = 16, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const IconoSol = ({ tamano = 17, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} {...props}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
  </svg>
);

export const IconoDia = ({ tamano = 20, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

export const IconoTarde = ({ tamano = 20, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

/** Sol, tarde o luna según la hora (junto al saludo de Inicio y del Hub). */
export const IconoPeriodoDelDia = ({ periodo, tamano = 20 }: { periodo: PeriodoDelDia; tamano?: number }) => {
  if (periodo === 'day') return <IconoDia tamano={tamano} />;
  if (periodo === 'afternoon') return <IconoTarde tamano={tamano} />;
  return <IconoLuna tamano={tamano} strokeWidth="1.8" />;
};
