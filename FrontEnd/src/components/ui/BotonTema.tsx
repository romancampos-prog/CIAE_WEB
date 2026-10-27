// propios
import { IconoLuna, IconoSol } from '@/components/icons';
import useTema from '@/hooks/useTema';
import './botonTema.css';

/**
 * Alterna modo claro / oscuro. Muestra el ícono del tema al que se va a
 * cambiar (luna en claro, sol en oscuro), igual que la mayoría de apps.
 * - `className` (opcional): clases extra para colocarlo fuera del TopBar (p. ej. el login).
 */
const BotonTema = ({ className = '' }) => {
  const { esOscuro, alternarTema } = useTema();
  const etiqueta = esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      className={`boton-tema ${className}`.trim()}
      onClick={alternarTema}
      aria-label={etiqueta}
      aria-pressed={esOscuro}
      title={etiqueta}
    >
      {esOscuro ? (
        <IconoSol />
      ) : (
        <IconoLuna />
      )}
    </button>
  );
};

export default BotonTema;
