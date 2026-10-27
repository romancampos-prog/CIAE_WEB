// Tema claro/oscuro y hora del día.

export type Tema = 'light' | 'dark';

export type PeriodoDelDia = 'day' | 'afternoon' | 'night';

export interface ValorTema {
  tema: Tema;
  esOscuro: boolean;
  alternarTema: () => void;
}
