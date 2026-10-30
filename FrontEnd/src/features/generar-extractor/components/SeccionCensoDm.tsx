// propios
import { IconoCerrar, IconoDocumento, IconoPalomitaAncha, IconoSubir } from '@/components/icons';
import ZonaArchivo from './ZonaArchivo';
import { useCensoDm } from '@/features/generar-extractor/hooks/useCensoDm';

/** Censo de pacientes con DM (denominador que pide el mapeo): los años subidos y el panel para subir uno. */
const SeccionCensoDm = () => {
  const censo = useCensoDm();

  return (
    <>
      <section className="exv-panel exc-censo">
        <div className="exc-censo-lista">
          {censo.censos.length === 0 && <p className="exc-censo-vacio">Todavía no se ha subido ningún censo.</p>}
          {censo.censos.map(c => (
            <p key={c.anio} className="exc-censo-fila">
              <IconoDocumento />
              <strong>Censo DM {c.anio}</strong>
              <span title={c.archivo}>{c.archivo}</span>
              <span className="exc-censo-fecha">{c.fecha_carga}</span>
            </p>
          ))}
        </div>
        <button type="button" className="ex-boton-confirmar exc-censo-boton" onClick={censo.abrirPanel}>
          <IconoSubir tamano={14} strokeWidth="2.2" /> Subir censo
        </button>
      </section>

      {censo.panelAbierto && (
        <div className="exa-capa" onClick={censo.cerrarPanel}>
          <aside className="exa-panel" role="dialog" aria-modal="true" aria-labelledby="exc-panel-titulo" onClick={e => e.stopPropagation()}>
            <header className="exa-panel-header">
              <span className="exv-archivo-icono"><IconoDocumento /></span>
              <div className="exa-panel-titulos">
                <h2 id="exc-panel-titulo">Censo de pacientes con DM</h2>
                <p>Excel por unidad médica de adscripción</p>
              </div>
              <button type="button" className="exa-panel-cerrar" onClick={censo.cerrarPanel} aria-label="Cerrar panel" autoFocus>
                <IconoCerrar tamano={18} strokeWidth="2.4" />
              </button>
            </header>

            <div className="exa-panel-cuerpo">
              {censo.resultado ? (
                <>
                  <div className="exa-resultado-encabezado">
                    <span className="exa-resultado-ok"><IconoPalomitaAncha /></span>
                    <div>
                      <p className="exa-resultado-titulo">Censo DM {censo.resultado.datos.anio} cargado</p>
                      <p className="exa-resultado-sub">{censo.resultado.mensaje}</p>
                    </div>
                  </div>
                  {censo.resultado.datos.no_encontradas.length > 0 && (
                    <p className="ex-aviso-reemplazo">Sin dato en el censo: {censo.resultado.datos.no_encontradas.join(', ')}.</p>
                  )}
                  {censo.resultado.datos.extras.length > 0 && (
                    <p className="ex-aviso-reemplazo">Claves del censo que no están en el catálogo: {censo.resultado.datos.extras.join(', ')}.</p>
                  )}
                </>
              ) : (
                <>
                  <ZonaArchivo sugerido="Tabla_2_Censo_DM_por_Unidad_AAAA.xlsx" archivo={censo.archivo} onSeleccionar={censo.setArchivo} />
                  {censo.error && <p className="ex-error">{censo.error}</p>}
                </>
              )}
            </div>

            <footer className="exa-panel-pie">
              {censo.resultado ? (
                <button type="button" className="ex-boton-confirmar" onClick={censo.cerrarPanel}>Listo</button>
              ) : (
                <>
                  <button type="button" className="exa-boton-secundario" onClick={censo.cerrarPanel}>Cancelar</button>
                  <button type="button" className="ex-boton-confirmar" onClick={censo.subir} disabled={!censo.archivo || censo.subiendo}>
                    {censo.subiendo ? 'Subiendo…' : 'Subir censo'}
                  </button>
                </>
              )}
            </footer>
          </aside>
        </div>
      )}
    </>
  );
};

export default SeccionCensoDm;
