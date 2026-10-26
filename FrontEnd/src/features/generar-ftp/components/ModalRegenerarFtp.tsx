// propios
import ModalConfirmarPassword from '@/components/ui/modal/ModalConfirmarPassword';
import { MESES_LARGOS } from '@/features/indicadores';
import type { PeriodoFtp } from '@/features/generar-ftp/tipos';

interface Props {
  abierto: boolean;
  modo: 'individual' | 'batch';
  indicador: string | null;
  categoria: string;
  totalIndicadores: number;
  periodo: PeriodoFtp;
  color: string;
  regenerando: boolean;
  error: string;
  onCerrar: () => void;
  onConfirmar: (password: string) => void;
}

/** Pide contraseña para sobrescribir un mes definitivo que ya se generó (un indicador o la categoría). */
const ModalRegenerarFtp = ({ abierto, modo, indicador, categoria, totalIndicadores, periodo, color, regenerando, error, onCerrar, onConfirmar }: Props) => {
  const mes = { label: 'Mes', value: `${MESES_LARGOS[periodo.mes]} ${periodo.ano}` };
  return (
    <ModalConfirmarPassword
      isOpen={abierto}
      onClose={() => !regenerando && onCerrar()}
      onConfirm={onConfirmar}
      enviando={regenerando}
      error={error}
      color={color}
      titulo="Regenerar mes definitivo"
      subtitulo={
        modo === 'batch'
          ? 'Este mes ya tiene reporte generado para todos los indicadores de la categoría. Ingresa tu contraseña para sobrescribirlos.'
          : 'Este mes ya tiene un reporte generado. Ingresa tu contraseña para sobrescribirlo.'
      }
      confirmLabel={regenerando ? 'Regenerando…' : 'Regenerar'}
      infoRows={
        modo === 'batch'
          ? [{ label: 'Categoría', value: `${categoria} (${totalIndicadores} indicadores)` }, mes]
          : [{ label: 'Indicador', value: indicador ?? '' }, mes]
      }
    />
  );
};

export default ModalRegenerarFtp;
