// propios
import type { usePeriodoIaas } from '@/features/generar-iaas/hooks/usePeriodoIaas';

/** Año y mes del reporte IAAS, en la píldora del encabezado de la tabla. */
const SelectorPeriodoIaas = ({ periodo }: { periodo: ReturnType<typeof usePeriodoIaas> }) => (
  <div className="ia-periodo-pill">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    <select className="ia-select" value={periodo.anio} onChange={e => periodo.cambiarAnio(e.target.value)}>
      {periodo.aniosDisponibles.map(a => (
        <option key={a} value={a}>{a}</option>
      ))}
    </select>
    <select className="ia-select" value={periodo.mes} onChange={e => periodo.cambiarMes(e.target.value)}>
      {periodo.mesesDisponibles.map(({ valor, nombre }) => (
        <option key={valor} value={valor}>{nombre}</option>
      ))}
    </select>
  </div>
);

export default SelectorPeriodoIaas;
