// react
import { useState } from 'react';

/**
 * Estado del panel lateral de categorías: qué acordeones están abiertos y si está colapsado.
 * Abrir otra categoría la vuelve la activa (y quita el indicador elegido).
 */
export function usePanelCategorias(
  categoria: string,
  setCategoria: (categoria: string) => void,
  setIndicadorSel: (indicador: string | null) => void,
) {
  // Colapsado por defecto en pantallas angostas para no robarle ancho al contenido.
  const [colapsado, setColapsado] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [abiertas, setAbiertas]   = useState(() => new Set([categoria]));

  const alternarCategoria = (cat: string) => {
    const seAbre = !abiertas.has(cat);
    setAbiertas(previas => {
      const siguientes = new Set(previas);
      if (seAbre) siguientes.add(cat);
      else siguientes.delete(cat);
      return siguientes;
    });
    if (seAbre && cat !== categoria) {
      setCategoria(cat);
      setIndicadorSel(null);
    }
  };

  return {
    abiertas,
    alternarCategoria,
    colapsado,
    alternarColapsado: () => setColapsado(c => !c),
  };
}
