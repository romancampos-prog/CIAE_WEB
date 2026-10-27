// propios
import type { PropsIcono } from './tipos';

// Datos y módulos: gráficas, archivos, calendarios, indicadores y epidemiología.

export const IconoActividad = ({ tamano = 28, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export const IconoArchivo = ({ tamano = 16, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

export const IconoBarras = ({ tamano = 13, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} {...props}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

export const IconoCalculo = ({ tamano = 13, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} {...props}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
  </svg>
);

export const IconoCalendario = ({ tamano = 12, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export const IconoCalendarioAnio = ({ tamano = 13, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
  </svg>
);

export const IconoCalendarioMes = ({ tamano = 13, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export const IconoDocumento = ({ tamano = 22, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

export const IconoEpidemiologia = ({ tamano = 28, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 48 48" fill="none" {...props}>
    <circle cx="18" cy="19" r="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9"/>
    <ellipse cx="18" cy="19" rx="5" ry="12" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
    <line x1="6" y1="19" x2="30" y2="19" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
    <path d="M8 13.5 Q18 10.5 28 13.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
    <path d="M8 24.5 Q18 27.5 28 24.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
    <circle cx="31" cy="30" r="8" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.95" fill="none"/>
    <line x1="37" y1="36" x2="43" y2="42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.95"/>
    <circle cx="31" cy="30" r="2.6" fill="currentColor" fillOpacity="0.85"/>
    <line x1="31" y1="25.8" x2="31" y2="24" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="31" y1="34.2" x2="31" y2="36" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="26.8" y1="30" x2="25" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="35.2" y1="30" x2="37" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="27.9" y1="27.1" x2="26.7" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="34.1" y1="32.9" x2="35.3" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="34.1" y1="27.1" x2="35.3" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="27.9" y1="32.9" x2="26.7" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="24" cy="24" r="1.3" fill="currentColor" fillOpacity="0.55"/>
    <circle cx="37" cy="24" r="1.1" fill="currentColor" fillOpacity="0.45"/>
  </svg>
);

export const IconoFichaTecnica = ({ tamano = 13, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const IconoIndicadores = ({ tamano = 28, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} {...props}>
    <path d="M3 3v18h18"/>
    <path d="m19 9-5 5-4-4-3 3"/>
  </svg>
);

export const IconoTendencia = ({ tamano = 36, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} {...props}>
    <path d="M3 3v18h18"/>
    <path d="M7 16l4-4 4 4 4-4"/>
  </svg>
);

export const IconoListaBarras = ({ tamano = 12, ...props }: PropsIcono) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} {...props}>
    <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="15" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>
  </svg>
);

/** Archivo de Excel dibujado (tarjetas de carga de dengue); `claro` = sobre fondo oscuro. */
export const IconoExcel = ({ tamano = 52, claro = false, ...props }: PropsIcono & { claro?: boolean }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 52 52" fill="none" {...props}>
    <rect x="4" y="2" width="32" height="42" rx="4"
          fill={claro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          stroke={claro ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'} strokeWidth="1.5"/>
    <path d="M36 2v12h12" stroke={claro ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'}
          strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
    <rect x="4" y="2" width="22" height="42" rx="4"
          fill={claro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}/>
    <path d="M36 2v12h12L36 2z"
          fill={claro ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
    <path d="M14 20l8 12m0-12l-8 12"
          stroke={claro ? 'rgba(212,188,148,0.9)' : '#a7802d'}
          strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M26 20h10M26 26h8M26 32h10"
          stroke={claro ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
          strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
