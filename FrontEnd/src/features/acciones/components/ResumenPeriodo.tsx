// propios
import type { EstadisticasExtraccion } from '@/types/api/epidemiologia/ftp';
import { IconoCapas, IconoListaBarras } from '@/components/icons';

interface Props {
  estadisticas: EstadisticasExtraccion;
}

/** Los totales del periodo que se está viendo, en el encabezado junto al mes (salen del backend). */
export default function ResumenPeriodo({ estadisticas }: Props) {
  return (
    <div className="acc-kpis">
      <div className="acc-kpi acc-kpi--guinda">
        <span className="acc-kpi-icono" aria-hidden="true"><IconoListaBarras tamano={18} /></span>
        <span className="acc-kpi-valor">{estadisticas.totalRegistros.toLocaleString('es-MX')}</span>
        <span className="acc-kpi-etiqueta">Registros</span>
      </div>
      <div className="acc-kpi acc-kpi--verde">
        <span className="acc-kpi-icono" aria-hidden="true"><IconoCapas tamano={18} /></span>
        <span className="acc-kpi-valor">{estadisticas.unidadesConRegistros.toLocaleString('es-MX')}</span>
        <span className="acc-kpi-etiqueta">Unidades con registros</span>
      </div>
    </div>
  );
}
