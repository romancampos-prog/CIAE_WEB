// propios
import { IconoAlerta } from '@/components/icons';

interface Props {
  meses: string[];
  /** true después del primer clic: el siguiente genera de todas formas. */
  confirmando: boolean;
}

/** Meses anteriores sin reporte final: se avisa antes de generar con el historial incompleto. */
const AvisoMesesFaltantes = ({ meses, confirmando }: Props) => (
  <div
    className="cfg-warning"
    style={confirmando ? {
      background: 'rgba(234,88,12,0.1)',
      borderColor: '#ea580c',
      boxShadow: '0 0 0 3px rgba(234,88,12,0.15)',
    } : undefined}
  >
    <IconoAlerta stroke={confirmando ? '#ea580c' : 'currentColor'} />
    <div>
      <strong style={confirmando ? { color: '#ea580c' } : {}}>
        {confirmando ? '¿Generar sin estos meses?' : 'Meses pendientes:'}
      </strong>{' '}
      {meses.join(', ')}
      <p>
        {confirmando
          ? 'El historial quedará incompleto. Haz clic de nuevo para confirmar.'
          : 'Généralos primero para tener el historial completo.'}
      </p>
    </div>
  </div>
);

export default AvisoMesesFaltantes;
