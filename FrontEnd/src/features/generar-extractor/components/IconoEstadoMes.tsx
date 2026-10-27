// propios
import type { ClaseEstado } from '@/types/pantallas/generarExtractor';
import { IconoCandadoChico, IconoGuion, IconoMedioLleno, IconoPalomitaAncha, IconoPunto } from '@/components/icons';

/** Un ícono por estado del mes: la celda de la tabla no tiene espacio para texto. */
const IconoEstadoMes = ({ clase }: { clase: ClaseEstado }) => {
  if (clase === 'ok' || clase === 'previo') return <IconoPalomitaAncha tamano={16} strokeWidth={2.6} aria-hidden />;
  if (clase === 'parcial') return <IconoMedioLleno aria-hidden />;
  if (clase === 'bloqueado') return <IconoCandadoChico aria-hidden />;
  if (clase === 'futuro') return <IconoGuion aria-hidden />;
  return <IconoPunto aria-hidden />;
};

export default IconoEstadoMes;
