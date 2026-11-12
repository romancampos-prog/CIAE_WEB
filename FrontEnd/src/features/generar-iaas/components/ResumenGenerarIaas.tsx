// propios
import { IconoAlerta, IconoFlechaDerecha, IconoPalomita, IconoReloj } from '@/components/icons';
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
            <IconoAlerta />
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
              {excelGlobal ? <IconoPalomita tamano={10} /> : '·'} Excel global
            </span>
            <span className={`ia-pill ${todasCompletas ? 'ia-pill--ok' : ''}`}>
              {todasCompletas ? <IconoPalomita tamano={10} /> : '·'} {completos}/{unidades.length} unidades
            </span>
          </div>
          <button
            className="ia-btn-tardia"
            title="Completar unidad tardía"
            onClick={iaas.abrirModalTardia}
          >
            <IconoReloj tamano={14} />
            {unidadesPendientes.length > 0 && (
              <span className="ia-btn-tardia-badge">{unidadesPendientes.length}</span>
            )}
          </button>

          <button className={`ia-btn-gen ${advertencias ? 'ia-btn-gen--warn' : ''}`} onClick={iaas.generar}>
            {advertencias ? 'Generar de todas formas' : 'Generar reportes'}
            <IconoFlechaDerecha tamano={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumenGenerarIaas;
