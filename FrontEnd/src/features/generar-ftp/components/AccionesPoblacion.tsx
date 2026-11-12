// propios
import { IconoCandado, IconoSubir } from '@/components/icons';

interface Props {
  esVisor: boolean;
  archivo: string | null;
  periodo: string | null;
  onActualizar: () => void;
}

/** Lo que va a la derecha del TopBar en Generar FTP: población vigente, botón para actualizarla y la nota legal. */
const AccionesPoblacion = ({ esVisor, archivo, periodo, onActualizar }: Props) => (
  <>
    {!esVisor && archivo && (
      <span className="ind-pob-archivo" title={archivo}>
        {periodo ? `Población: ${periodo}` : archivo}
      </span>
    )}
    {!esVisor && (
      <button className="ind-btn-pob" onClick={onActualizar}>
        <IconoSubir tamano={13} strokeWidth="2" />
        <span className="ind-btn-pob-label">Actualizar Población</span>
      </button>
    )}
    <span className="ind-legal-note" title="Este sistema solo consulta la información de los archivos FTP originales para generar los reportes — no los modifica, edita ni elimina en ningún momento.">
      <IconoCandado />
    </span>
  </>
);

export default AccionesPoblacion;
