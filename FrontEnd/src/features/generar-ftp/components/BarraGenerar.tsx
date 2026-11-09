// react
import type { ReactNode } from 'react';
// propios
import { IconoExcel } from '@/components/icons';

interface Props {
  /** Qué se va a generar; null mientras falte elegir el mes. */
  resumen: string | null;
  children: ReactNode;
}

/** Abajo de la página: confirma qué se va a generar, junto al botón. */
const BarraGenerar = ({ resumen, children }: Props) => (
  <div className="ind-barra-generar">
    <span className="ind-barra-icono" aria-hidden="true"><IconoExcel tamano={26} /></span>
    <div className="ind-barra-texto">
      <small>{resumen ? 'Vas a generar' : 'Falta un dato'}</small>
      <strong>{resumen ?? 'Elige un mes para continuar'}</strong>
    </div>
    {children}
  </div>
);

export default BarraGenerar;
