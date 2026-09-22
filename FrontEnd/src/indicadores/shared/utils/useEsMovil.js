import { useState, useEffect } from 'react';

/**
 * True cuando el viewport está por debajo del punto de corte -- mismo
 * breakpoint que usa el CSS de gráficas (@media max-width: 820px en
 * graficas.css) para pasar de panel lateral a chip+hoja, así el JS y el CSS
 * cambian de layout en el mismo punto. Reactivo: se actualiza si el usuario
 * rota el celular o cambia el tamaño de la ventana.
 * @param {number} [breakpoint=820]
 * @returns {boolean}
 */
export function useEsMovil(breakpoint = 820) {
  const consulta = `(max-width: ${breakpoint}px)`;
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(consulta);
    const actualizar = (e) => setEsMovil(e.matches);
    mql.addEventListener('change', actualizar);
    setEsMovil(mql.matches);
    return () => mql.removeEventListener('change', actualizar);
  }, [consulta]);

  return esMovil;
}
