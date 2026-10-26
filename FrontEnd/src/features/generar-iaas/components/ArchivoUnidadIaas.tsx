// propios
import { UploadIcon, XIcon } from '@/components/ui/Iconos';

interface Props {
  archivo: File | undefined;
  textoSubir: string;
  onElegir: (archivo: File | undefined) => void;
  onQuitar: () => void;
}

/** El Excel numerador de una unidad: el nombre con botón para quitarlo, o el botón para subirlo. */
const ArchivoUnidadIaas = ({ archivo, textoSubir, onElegir, onQuitar }: Props) => (archivo ? (
  <div className="ia-mini-archivo">
    <span title={archivo.name}>{archivo.name.replace('.xlsx', '')}</span>
    <button title="Quitar archivo" onClick={onQuitar}>
      <XIcon />
    </button>
  </div>
) : (
  <label className="ia-mini-subir">
    <input type="file" accept=".xlsx" hidden onChange={e => onElegir(e.target.files?.[0])} />
    <UploadIcon /><span>{textoSubir}</span>
  </label>
));

export default ArchivoUnidadIaas;
