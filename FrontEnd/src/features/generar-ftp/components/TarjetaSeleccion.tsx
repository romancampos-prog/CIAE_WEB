// react
import type { ReactNode } from 'react';
// propios
import { textoAcento } from '@/utils/colorAcento';

interface Props {
  eyebrow: string;
  nombre: string;
  descripcion?: ReactNode;
  color: string;
  icono: string | null;
  children?: ReactNode;
}

/** Tarjeta de lo que se va a generar: un indicador o toda la categoría. */
const TarjetaSeleccion = ({ eyebrow, nombre, descripcion, color, icono, children }: Props) => (
  <div className="ind-sel-card" style={{ '--fc': color }}>
    {icono && <img src={icono} alt="" className="ind-sel-card-icon" />}
    <p className="ind-sel-eyebrow">{eyebrow}</p>
    <h2 className="ind-sel-name" style={{ color: textoAcento(color) }}>{nombre}</h2>
    {descripcion && <p className="ind-sel-desc">{descripcion}</p>}
    {children}
  </div>
);

export default TarjetaSeleccion;
