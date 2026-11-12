// propios
import { IconoCerrar, IconoPalomita, IconoSubirNube } from '@/components/icons';

interface Props {
  archivo: File | null;
  nota: string;
  onElegir: (archivo: File | null | undefined) => void;
}

/** El Excel global de IAAS 01 (uno para todas las unidades): elegido o la zona para subirlo. */
const ExcelGlobalIaas = ({ archivo, nota, onElegir }: Props) => (archivo ? (
  <div className="ia-td-global-listo">
    <span className="ia-td-global-nota">{nota}</span>
    <span className="ia-td-global-check"><IconoPalomita tamano={16} /></span>
    <span className="ia-td-global-archivo" title={archivo.name}>
      {archivo.name.replace('.xlsx', '')}
    </span>
    <div className="ia-td-global-acciones">
      <label className="ia-td-global-cambiar">
        <input type="file" accept=".xlsx" hidden onChange={e => onElegir(e.target.files?.[0])} />
        Cambiar archivo
      </label>
      <button className="ia-td-global-quitar" title="Quitar archivo" onClick={() => onElegir(null)}>
        <IconoCerrar strokeLinejoin="round" />
      </button>
    </div>
  </div>
) : (
  <label className="ia-td-global-dropzone">
    <input type="file" accept=".xlsx" hidden onChange={e => onElegir(e.target.files?.[0])} />
    <span className="ia-td-global-nota">{nota}</span>
    <IconoSubirNube />
    <strong>Arrastra tu Excel aquí</strong>
    <span>o haz clic para buscar</span>
  </label>
));

export default ExcelGlobalIaas;
