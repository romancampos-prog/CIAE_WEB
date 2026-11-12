// react
import type { ReactNode } from 'react';
// propios
import { textoAcento } from '@/utils/colorAcento';

interface Props {
  eyebrow: string;
  iconoEyebrow: ReactNode;
  nombre: string;
  descripcion?: ReactNode;
  color: string;
  icono: string | null;
  children?: ReactNode;
}

/** Tarjeta de lo que se va a generar: un indicador o toda la categoría. */
const TarjetaSeleccion = ({ eyebrow, iconoEyebrow, nombre, descripcion, color, icono, children }: Props) => (
  <div className="ind-sel-card" style={{ '--fc': color }}>
    <div className="ind-sel-card-texto">
      <p className="ind-sel-eyebrow">{iconoEyebrow} {eyebrow}</p>
      <h2 className="ind-sel-name" style={{ color: textoAcento(color) }}>{nombre}</h2>
      {descripcion && <p className="ind-sel-desc">{descripcion}</p>}
      {children}
    </div>
    {icono && <span className="ind-sel-card-imagen"><img src={icono} alt="" /></span>}
  </div>
);

export default TarjetaSeleccion;
