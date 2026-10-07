// propios
import useTema from '../hooks/useTema';
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
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};

export default BotonTema;
