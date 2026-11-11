// react
import { useState } from 'react';
// propios
import ExcelGlobalIaas from './ExcelGlobalIaas';
import type { EstadoGenerarIaas } from '@/features/generar-iaas/hooks/useGenerarIaas';

/**
 * El Excel global de IAAS 01 en escritorio, arriba de la tabla: es uno solo para todas las unidades,
 * así que va aparte y no como una columna más. En teléfono lo pone TarjetasCapturaIaas.
 */
const TarjetaGlobalIaas = ({ iaas }: { iaas: EstadoGenerarIaas }) => {
  const [encima, setEncima] = useState(false);
  const { unidades, infoIaas01, excelGlobal } = iaas;

  return (
    <div
      className={`ia-global-card${encima ? ' ia-global-card--over' : ''}${excelGlobal ? ' ia-global-card--done' : ''}`}
      onDragOver={e => { e.preventDefault(); setEncima(true); }}
      onDragLeave={() => setEncima(false)}
      onDrop={e => { e.preventDefault(); setEncima(false); iaas.elegirExcelGlobal(e.dataTransfer.files[0]); }}
    >
      <div className="ia-global-card-titulo">
        <span className="ia-th-ind">IAAS 01</span>
        <small>{infoIaas01?.columnaDenominador}</small>
      </div>
      <ExcelGlobalIaas
        archivo={excelGlobal}
        nota={`Un solo archivo para las ${unidades.length} unidades`}
        onElegir={iaas.elegirExcelGlobal}
      />
    </div>
  );
};

export default TarjetaGlobalIaas;
