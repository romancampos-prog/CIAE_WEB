// propios
import { CheckIcon } from '@/components/ui/Iconos';
import type { EstadoGenerarIaas } from '@/features/generar-iaas/hooks/useGenerarIaas';

/** Advertencias de datos incompletos y la barra de acción (avance, unidades tardías y generar). */
const ResumenGenerarIaas = ({ iaas }: { iaas: EstadoGenerarIaas }) => {
  const { advertencias, unidades, completos, excelGlobal, unidadesPendientes } = iaas;
  const todasCompletas = completos === unidades.length && unidades.length > 0;

  if (!advertencias && !iaas.puedeGenIAAS) return null;

  return (
    <div className="ia-step-card ia-resumen-card">
      {advertencias && (
        <div className="ia-warn-box">
          <div className="ia-warn-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Datos incompletos — puedes generar de todas formas
          </div>
          <ul className="ia-warn-list">
            {advertencias.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {iaas.puedeGenIAAS && (
        <div className="ia-action-bar">
          <div className="ia-progress-pills">
            <span className={`ia-pill ${excelGlobal ? 'ia-pill--ok' : ''}`}>
              {excelGlobal ? <CheckIcon size={10} /> : '·'} Excel global
            </span>
            <span className={`ia-pill ${todasCompletas ? 'ia-pill--ok' : ''}`}>
              {todasCompletas ? <CheckIcon size={10} /> : '·'} {completos}/{unidades.length} unidades
            </span>
          </div>
          <button
            className="ia-btn-tardia"
            title="Completar unidad tardía"
            onClick={iaas.abrirModalTardia}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {unidadesPendientes.length > 0 && (
              <span className="ia-btn-tardia-badge">{unidadesPendientes.length}</span>
            )}
          </button>

          <button className={`ia-btn-gen ${advertencias ? 'ia-btn-gen--warn' : ''}`} onClick={iaas.generar}>
            {advertencias ? 'Generar de todas formas' : 'Generar reportes'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumenGenerarIaas;
