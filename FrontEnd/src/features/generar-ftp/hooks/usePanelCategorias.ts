// react
import { useState } from 'react';

/**
 * Estado del panel lateral de categorías: cuál está abierta y si está colapsado. Solo hay una abierta
 * y es siempre la elegida, para que no se vean dos familias marcadas a la vez.
 */
export function usePanelCategorias(
  categoria: string,
  setCategoria: (categoria: string) => void,
  setIndicadorSel: (indicador: string | null) => void,
) {
  // Colapsado por defecto en pantallas angostas para no robarle ancho al contenido.
  const [colapsado, setColapsado] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [abierta, setAbierta]     = useState<string | null>(categoria);

  // Otra familia: se elige y se abre. La que ya está elegida: solo abre o cierra su lista.
  const alternarCategoria = (cat: string) => {
    if (cat !== categoria) {
      setCategoria(cat);
      setIndicadorSel(null);
      setAbierta(cat);
      return;
    }
    setAbierta(actual => (actual === cat ? null : cat));
  };

  return {
    abierta,
    alternarCategoria,
    colapsado,
    alternarColapsado: () => setColapsado(c => !c),
  };
}
