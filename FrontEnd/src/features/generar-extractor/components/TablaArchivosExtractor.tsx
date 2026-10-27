// propios
import { MESES_LARGOS_ARR } from '@/features/indicadores';
import { ESTADO_FUTURO, ESTADO_MES } from '@/features/generar-extractor/constants/estadosMes';
import IconoEstadoMes from './IconoEstadoMes';
import type { EstadoGenerarExtractor } from '@/features/generar-extractor/hooks/useGenerarExtractor';

/** Todo el año en una tabla: filas = archivos, columnas = meses. Clic en un mes abre el panel de subida. */
const TablaArchivosExtractor = ({ ex }: { ex: EstadoGenerarExtractor }) => (
  <section className="exv-panel exa-tabla" aria-label={`Archivos subidos en ${ex.anio}`}>
    <div className="exa-fila exa-fila--encabezado" aria-hidden>
      <span className="exa-col-archivo">Archivo</span>
      {MESES_LARGOS_ARR.map(m => <span key={m} className="exa-col-mes">{m.slice(0, 3)}</span>)}
    </div>

    {ex.archivos.map(archivo => {
      const subidos = archivo.meses.filter(m => m.estado === 'completo').length;
      return (
        <div key={archivo.archivo} className={`exa-fila exa-fila--${archivo.tipo}`}>
          <div className="exa-col-archivo exa-archivo">
            <div className="exa-archivo-nombre">
              <strong>{archivo.archivo}</strong>
              <span className={`exv-tag ${archivo.requerido ? 'exv-tag--requerido' : 'exv-tag--opcional'}`}>
                {archivo.requerido ? 'Obligatorio' : 'Opcional'}
              </span>
            </div>
            <div className="exa-archivo-pie">
              <span className="exa-alimenta" title={`Alimenta a ${archivo.indicadores.join(', ')}`}>
                {archivo.indicadores.map(c => (
                  <span key={c} className="exa-mini-ind">{ex.iconoDe[c] && <img src={ex.iconoDe[c]} alt="" />}{c}</span>
                ))}
              </span>
              <span className="exa-conteo">{subidos}/12</span>
            </div>
          </div>

          {archivo.meses.map(({ mes, estado, faltan }) => {
            const futuro = ex.esFuturo(mes);
            const bloqueado = futuro || estado === 'sin_principal';
            const visual = futuro ? ESTADO_FUTURO : (ESTADO_MES[estado] ?? ESTADO_MES.pendiente);
            const activo = ex.panel?.archivo === archivo.archivo && ex.panel?.mes === mes;
            const detalle = estado === 'parcial' && faltan?.length ? ` (falta en ${faltan.join(', ')})` : '';
            return (
              <button
                key={mes}
                type="button"
                disabled={bloqueado}
                title={`${mes}: ${visual.texto}${detalle}`}
                aria-label={`${archivo.archivo}, ${mes}: ${visual.texto}${detalle}`}
                onClick={() => ex.abrir(archivo, mes)}
                className={`exa-celda exa-celda--${visual.clase}${activo ? ' exa-celda--activa' : ''}`}
              >
                <span className="exa-celda-mes">{mes.slice(0, 3)}</span>
                <IconoEstadoMes clase={visual.clase} />
              </button>
            );
          })}
        </div>
      );
    })}

    <ul className="exa-leyenda">
      {[ESTADO_MES.completo, ESTADO_MES.parcial, ESTADO_MES.pendiente, ESTADO_MES.sin_principal, ESTADO_MES.sin_registro].map(e => (
        <li key={e.clase}><span className={`exa-celda exa-celda--${e.clase} exa-celda--muestra`}><IconoEstadoMes clase={e.clase} /></span>{e.texto}</li>
      ))}
    </ul>
    <p className="exv-nota-mes">Da clic en un mes para subir o reemplazar su archivo.</p>
  </section>
);

export default TablaArchivosExtractor;
