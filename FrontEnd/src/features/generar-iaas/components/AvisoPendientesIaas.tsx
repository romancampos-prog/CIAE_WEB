// propios
import { IconoFlechaDerecha, IconoReloj } from '@/components/icons';

interface Props {
  pendientes: string[];
  mesNombre: string;
  anio: string;
  onAbrir: () => void;
}

/** Aviso fijo con las unidades pendientes del mes elegido; abre el modal de unidades tardías. */
const AvisoPendientesIaas = ({ pendientes, mesNombre, anio, onAbrir }: Props) => {
  if (!pendientes.length) return null;
  const plural = pendientes.length > 1;
  return (
    <button className="ia-toast-pendiente" onClick={onAbrir}>
      <div className="ia-toast-icon">
        <IconoReloj tamano={15} />
      </div>
      <div className="ia-toast-body">
        <strong>{pendientes.length} unidad{plural ? 'es' : ''} pendiente{plural ? 's' : ''}</strong>
        <span>{mesNombre} {anio}</span>
      </div>
      <IconoFlechaDerecha tamano={13} />
    </button>
  );
};

export default AvisoPendientesIaas;
