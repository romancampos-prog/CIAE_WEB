// react
import { useState } from 'react';
import { createPortal } from 'react-dom';
// propios
import type { Restricciones } from '@/types/api/indicadores/ftp';
import { IconoAlerta, IconoChevronDerecha } from '@/components/icons';
import { ModalRestricciones } from '@/features/generar-ftp';

/**
 * Solo admin: un aviso compacto con cuántas unidades fallaron en la extracción; al tocarlo abre
 * el mismo modal de restricciones de indicadores FTP (el backend manda los errores con esa forma).
 */
export default function ErroresExtraccion({ errores }: { errores: Restricciones }) {
  const [abierto, setAbierto] = useState(false);
  const total = new Set(Object.values(errores).flatMap(e => Object.keys(e.unidades))).size;

  if (total === 0) return null;

  return (
    <>
      <button className="acc-aviso" onClick={() => setAbierto(true)}>
        <IconoAlerta />
        <span className="acc-aviso-texto">{total} unidades sin extraer</span>
        <span className="acc-aviso-ver">Ver detalle <IconoChevronDerecha /></span>
      </button>

      {/* En un portal: así queda encima del TopBar sin importar el z-index de la página. */}
      {abierto && createPortal(
        <ModalRestricciones
          isOpen
          restricciones={errores}
          nota="Las demás unidades sí quedaron guardadas. Al volver a extraer el periodo se intentan de nuevo."
          onClose={() => setAbierto(false)}
        />,
        document.body,
      )}
    </>
  );
}
