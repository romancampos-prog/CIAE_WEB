// propios
import { IconoCerrar, IconoDocumento, IconoPalomitaAncha } from '@/components/icons';
import { DESCRIPCION_ESTADO, ESTADO_MES } from '@/features/generar-extractor/constants/estadosMes';
import { numeroMes, resumenIndicador } from '@/features/generar-extractor/utils/textosExtractor';
import ChipIndicador from './ChipIndicador';
import IconoEstadoMes from './IconoEstadoMes';
import ZonaArchivo from './ZonaArchivo';
import type { EstadoGenerarExtractor } from '@/features/generar-extractor/hooks/useGenerarExtractor';

/** Panel lateral para subir el archivo del mes elegido y ver qué pasó con cada indicador. */
const PanelSubidaExtractor = ({ ex }: { ex: EstadoGenerarExtractor }) => {
  const { panel, archivoDelPanel, estadoDelPanel, resultado, anio } = ex;
  if (!panel || !archivoDelPanel) return null;

  const estado = estadoDelPanel?.estado;
  const visual = (estado && ESTADO_MES[estado]) || ESTADO_MES.pendiente;
  const yaSubido = estado === 'completo' || estado === 'parcial' || estado === 'sin_registro';
  const usaCruce = ex.archivos.some(a => a.tipo === 'cruce' && a.indicadores.some(i => archivoDelPanel.indicadores.includes(i)));

  return (
    <div className="exa-capa" onClick={ex.cerrarPanel}>
      <aside
        className="exa-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exa-panel-titulo"
        onClick={e => e.stopPropagation()}
      >
        <header className="exa-panel-header">
          <span className={`exv-archivo-icono${panel.tipo === 'cruce' ? ' exa-icono--cruce' : ''}`}><IconoDocumento /></span>
          <div className="exa-panel-titulos">
            <h2 id="exa-panel-titulo">{panel.archivo}</h2>
            <p>{panel.mes} {anio}</p>
          </div>
          <button type="button" className="exa-panel-cerrar" onClick={ex.cerrarPanel} aria-label="Cerrar panel" autoFocus>
            <IconoCerrar tamano={18} strokeWidth="2.4" />
          </button>
        </header>

        <div className="exa-panel-cuerpo">
          {resultado ? (
            <>
              <div className="exa-resultado-encabezado">
                <span className="exa-resultado-ok"><IconoPalomitaAncha /></span>
                <div>
                  <p className="exa-resultado-titulo">{resultado.archivo} de {resultado.mes} procesado</p>
                  {resultado.mensaje && <p className="exa-resultado-sub">{resultado.mensaje}</p>}
                </div>
              </div>
              {Object.entries(resultado.porIndicador).map(([clave, r]) => {
                const { texto, tono } = resumenIndicador(r);
                return (
                  <div key={clave} className={`exv-resultado-fila exv-resultado-fila--${tono}`}>
                    <div className="exv-iconos">{ex.iconoDe[clave] && <img src={ex.iconoDe[clave]} alt="" />}</div>
                    <div>
                      <p className="exv-resultado-titulo">{clave}</p>
                      <p className="exv-resultado-texto">{texto}</p>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <p className={`exa-estado-mes exa-estado-mes--${visual.clase}`}>
                <IconoEstadoMes clase={visual.clase} />
                {(estado && DESCRIPCION_ESTADO[estado]) ?? DESCRIPCION_ESTADO.pendiente}
                {estado === 'parcial' && !!estadoDelPanel?.faltan?.length && ` Falta en ${estadoDelPanel.faltan.join(', ')}.`}
              </p>

              <p className="exv-archivo-uso">{archivoDelPanel.uso}</p>
              <div className="exv-alimenta">
                <span>Alimenta a</span>
                {archivoDelPanel.indicadores.map(c => <ChipIndicador key={c} clave={c} icono={ex.iconoDe[c]} />)}
              </div>

              {yaSubido && (
                <p className="ex-aviso-reemplazo">
                  Al procesarlo de nuevo se reemplazan los datos en {archivoDelPanel.indicadores.join(', ')}
                  {' '}y se recalculan los cortes cerrados que lo incluyan.
                  {panel.tipo === 'principal' && usaCruce
                    && ' Los indicadores que usan Egresos Pacientes quedan con la vía 2 pendiente: después vuelve a subir el Egresos Pacientes de este mes.'}
                </p>
              )}

              <ZonaArchivo
                sugerido={archivoDelPanel.nombreSugerido.replace('{MM}', numeroMes(panel.mes)).replace('{AAAA}', String(anio))}
                archivo={ex.archivoSeleccionado}
                onSeleccionar={ex.setArchivoSeleccionado}
              />

              {ex.error && <p className="ex-error">{ex.error}</p>}
            </>
          )}
        </div>

        <footer className="exa-panel-pie">
          {resultado ? (
            <>
              <button type="button" className="exa-boton-secundario" onClick={ex.subirDeNuevo}>Subir de nuevo</button>
              <button type="button" className="ex-boton-confirmar" onClick={ex.cerrarPanel}>Listo</button>
            </>
          ) : (
            <>
              <button type="button" className="exa-boton-secundario" onClick={ex.cerrarPanel}>Cancelar</button>
              <button type="button" className="ex-boton-confirmar" onClick={ex.procesar} disabled={!ex.archivoSeleccionado}>
                {panel.tipo === 'principal' ? 'Procesar' : 'Cruzar'} {panel.archivo}
              </button>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
};

export default PanelSubidaExtractor;
