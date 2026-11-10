// propios
import type { PropsIcono } from './tipos';

// Módulos de las tarjetas de navegación: trazo del color de la tarjeta (currentColor), relleno suave y
// un detalle dorado. Van sobre el cuadro con degradado, que es igual en claro y en oscuro.

const ACENTO = '#f4d58d';
const RELLENO = { fill: 'currentColor', fillOpacity: 0.24 };

const Base = ({ tamano = 44, children, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const IconoModuloIndicadores = (props: PropsIcono) => (
  <Base {...props}>
    <rect x="8" y="28" width="7" height="13" rx="1.5" {...RELLENO}/>
    <rect x="20.5" y="21" width="7" height="20" rx="1.5" {...RELLENO}/>
    <rect x="33" y="15" width="7" height="26" rx="1.5" {...RELLENO}/>
    <path d="M7 21l11-8 9 5 12-11" stroke={ACENTO} strokeWidth={2.6}/>
    <circle cx="39" cy="7" r="2.6" fill={ACENTO} stroke="none"/>
  </Base>
);

export const IconoModuloVigilancia = (props: PropsIcono) => (
  <Base {...props}>
    <circle cx="20" cy="20" r="13" {...RELLENO}/>
    <path d="M30 30l11 11" stroke={ACENTO} strokeWidth={4}/>
    <circle cx="20" cy="20" r="4.5" fill="currentColor" stroke="none"/>
    <path d="M20 12v3M20 25v3M12 20h3M25 20h3M14.5 14.5l2 2M23.5 23.5l2 2M25.5 14.5l-2 2M16.5 23.5l-2 2"/>
  </Base>
);

export const IconoModuloSeguimiento = (props: PropsIcono) => (
  <Base {...props}>
    <rect x="5" y="7" width="38" height="28" rx="3.5" {...RELLENO}/>
    <path d="M24 35v7M15 42h18"/>
    <path d="M11 28l8-8 6 4 11-11" stroke={ACENTO} strokeWidth={2.6}/>
    <circle cx="36" cy="13" r="2.6" fill={ACENTO} stroke="none"/>
  </Base>
);

export const IconoModuloGenerar = (props: PropsIcono) => (
  <Base {...props}>
    <path d="M10 9a3 3 0 0 1 3-3h13l10 10v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" {...RELLENO}/>
    <path d="M26 6v10h10M16 25h14M16 32h9"/>
    <path d="M40 3l1.8 4.7L46.5 9.5l-4.7 1.8L40 16l-1.8-4.7-4.7-1.8 4.7-1.8z" fill={ACENTO} stroke="none"/>
  </Base>
);

export const IconoModuloFtp = (props: PropsIcono) => (
  <Base {...props}>
    <rect x="7" y="5" width="34" height="11" rx="2.5" {...RELLENO}/>
    <rect x="7" y="20" width="34" height="11" rx="2.5" {...RELLENO}/>
    <path d="M13 10.5h.01M13 25.5h.01M19 10.5h12M19 25.5h12"/>
    <path d="M24 33v11M18.5 39l5.5 5.5 5.5-5.5" stroke={ACENTO} strokeWidth={2.8}/>
  </Base>
);

export const IconoModuloIaas = (props: PropsIcono) => (
  <Base {...props}>
    <path d="M24 4l16 6v12c0 11-7 18-16 22C15 40 8 33 8 22V10z" {...RELLENO}/>
    <path d="M24 15v16M16 23h16" stroke={ACENTO} strokeWidth={4}/>
  </Base>
);

export const IconoModuloExtractor = (props: PropsIcono) => (
  <Base {...props}>
    <rect x="5" y="6" width="27" height="34" rx="3" {...RELLENO}/>
    <path d="M5 15h27M5 24h27M5 33h20M14 15v25M23 15v18"/>
    <path d="M27 37h16M37.5 31.5L43 37l-5.5 5.5" stroke={ACENTO} strokeWidth={2.8}/>
  </Base>
);

export const IconoModuloDengue = (props: PropsIcono) => (
  <Base {...props}>
    <path d="M22 19C17 12 19 5 27 4c2 7-1 12-5 15z" {...RELLENO}/>
    <path d="M24 22c6-5 13-5 18-1-5 6-12 6-18 1z" {...RELLENO}/>
    <path d="M15 17l22 18" strokeWidth={4.5}/>
    <circle cx="14" cy="16" r="3.6" fill="currentColor" stroke="none"/>
    <path d="M11 13L4 6" stroke={ACENTO} strokeWidth={2.4}/>
    <path d="M21 23l-7 8-2 9M26 27l-5 9 1 7M31 31l0 7 4 6"/>
  </Base>
);

export const IconoModuloAcciones = (props: PropsIcono) => (
  <Base {...props}>
    <rect x="9" y="8" width="30" height="36" rx="4" {...RELLENO}/>
    <rect x="17" y="4" width="14" height="9" rx="2.5" fill="currentColor" stroke="none"/>
    <path d="M15 23l2.5 2.5L22 21M15 34l2.5 2.5L22 32" stroke={ACENTO} strokeWidth={2.6}/>
    <path d="M27 24h7M27 35h7"/>
  </Base>
);
