// react
import type { RefObject } from 'react';
// propios
import { IconoDocumento } from '@/components/icons';
import { MESES_LARGOS_ARR } from '@/features/indicadores';

interface Props {
  ventana: RefObject<HTMLDialogElement | null>;
  anio: number;
  mes: number | null;
  onGenerar: () => void;
}

/** Solo admin: al elegir un mes sin reporte pregunta si se quiere generar; "Sí" abre la ventana de generar con ese mes. */
export default function AvisoMesSinReporte({ ventana, anio, mes, onGenerar }: Props) {
  const nombre = mes ? `${MESES_LARGOS_ARR[mes - 1]} ${anio}` : '';

  return (
    <dialog ref={ventana} className="acc-ventana acc-ventana--aviso" aria-labelledby="acc-aviso-titulo">
      <span className="acc-aviso-icono" aria-hidden="true"><IconoDocumento /></span>
      <h2 id="acc-aviso-titulo" className="acc-ventana-titulo">{nombre} no cuenta con reporte</h2>
      <p className="acc-tarjeta-nota">¿Deseas generarlo ahora desde el FTP?</p>
      <footer className="acc-ventana-pie">
        <button type="button" className="acc-boton-secundario" onClick={() => ventana.current?.close()}>No</button>
        <button type="button" className="acc-boton" onClick={() => { ventana.current?.close(); onGenerar(); }}>Sí, generar</button>
      </footer>
    </dialog>
  );
}
