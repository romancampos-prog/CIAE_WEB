// propios
import { IconoCalendario } from '@/components/icons';
import type { usePeriodoIaas } from '@/features/generar-iaas/hooks/usePeriodoIaas';

/** Año y mes del reporte IAAS, en la píldora del encabezado de la tabla. */
const SelectorPeriodoIaas = ({ periodo }: { periodo: ReturnType<typeof usePeriodoIaas> }) => (
  <div className="ia-periodo-pill">
    <IconoCalendario />
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
