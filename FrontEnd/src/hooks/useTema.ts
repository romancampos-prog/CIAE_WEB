// react
import { useContext } from 'react';
// propios
import type { ValorTema } from '@/types/pantallas/tema';
import { TemaContext } from '@/app/providers/ThemeProvider';

/** Los componentes que pintan colores por JS (gráficas, mapa) lo usan para repintar al alternar el tema. */
export default function useTema(): ValorTema {
  const valor = useContext(TemaContext);
  if (!valor) throw new Error('useTema se usa dentro de <ThemeProvider>');
  return valor;
}
