// propios
import type { TextosSemaforo } from '@/features/generar-ftp/tipos';

/** Rangos del semáforo del indicador en el mes elegido. */
const RangosDesempeno = ({ mes, textos }: { mes: string; textos: TextosSemaforo }) => (
  <div className="cfg-sem-section ind-sem-block">
    <p className="cfg-sem-label">Rangos de desempeño – {mes}</p>
    <div className="cfg-sem-grid">
      <div className="cfg-sem-block cfg-sem-verde">
        <span className="cfg-sem-dot" /><div><small>Esperado</small><strong>{textos.txtVerde}</strong></div>
      </div>
      {textos.txtAmarillo && (
        <div className="cfg-sem-block cfg-sem-amarillo">
          <span className="cfg-sem-dot" /><div><small>Medio</small><strong>{textos.txtAmarillo}</strong></div>
        </div>
      )}
      <div className="cfg-sem-block cfg-sem-rojo">
        <span className="cfg-sem-dot" /><div><small>Rojo</small><strong>{textos.txtRojo}</strong></div>
      </div>
    </div>
  </div>
);

export default RangosDesempeno;
