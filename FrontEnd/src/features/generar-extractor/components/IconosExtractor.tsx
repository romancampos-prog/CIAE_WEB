// react
import type { SVGProps } from 'react';
// propios
import type { ClaseEstado } from '@/features/generar-extractor/constants/estadosMes';

const RADIO = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Anillo con los meses subidos de una ventana de corte. */
export const AnilloProgreso = ({ subidos, total }: { subidos: number; total: number }) => {
  const offset = CIRCUNFERENCIA * (1 - (total ? subidos / total : 0));
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="exv-anillo">
      <circle cx="28" cy="28" r={RADIO} className="exv-anillo-fondo" />
      <circle cx="28" cy="28" r={RADIO} className="exv-anillo-relleno" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={offset} />
      <text x="28" y="32" textAnchor="middle" className="exv-anillo-num">{subidos}/{total}</text>
    </svg>
  );
};

export const IconoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12.5 10 17 19 7" />
  </svg>
);

/** Un icono por estado: la celda de la tabla no tiene espacio para texto. */
export const IconoEstadoMes = ({ clase }: { clase: ClaseEstado }) => {
  const props: SVGProps<SVGSVGElement> = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (clase === 'ok' || clase === 'previo') return <svg {...props}><polyline points="5 12.5 10 17 19 7" /></svg>;
  if (clase === 'parcial') return <svg {...props} strokeWidth={2}><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></svg>;
  if (clase === 'bloqueado') return <svg {...props} strokeWidth={2}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
  if (clase === 'futuro') return <svg {...props}><line x1="7" y1="12" x2="17" y2="12" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /></svg>;
};

export const IconoDescarga = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const IconoArchivo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

export const ChipIndicador = ({ clave, icono }: { clave: string; icono: string | null | undefined }) => (
  <span className="exv-chip-ind">{icono && <img src={icono} alt="" />}{clave}</span>
);
