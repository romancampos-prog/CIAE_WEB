// react
import { useEffect } from 'react';
// propios
import { IconoCapas, IconoDescargar, IconoGenerarTodos, IconoInfo, IconoTendencia } from '@/components/icons';
import TopBar from '@/components/TopBar';
import ModalLoading from '@/components/ui/modal/ModalCargando';
import { AccionesPoblacion, AvisoMesesFaltantes, BarraGenerar, BotonGenerar, ModalPoblacion, ModalRegenerarFtp, PeriodoReporte, RangosDesempeno, ResultadoCategoria, SidebarCategorias, TarjetaSeleccion, useGenerarFtp, usePanelCategorias, usePoblacionActual, VentanaErroresFtp } from '@/features/generar-ftp';
import { FichaTecnicaBoton, MESES_LARGOS, urlIcono } from '@/features/indicadores';
import '@/pages/indicadores/indicadores.css';
import './generarFtp.css';
import './generarFtpConfig.css';

/** Generar FTP: panel de categorías a la izquierda y, a la derecha, un indicador o toda la categoría. */
const GenerarFtpPagina = () => {
  const ftp = useGenerarFtp();
  const panel = usePanelCategorias(ftp.categoria, ftp.setCategoria, ftp.setIndicadorSel);
  const poblacion = usePoblacionActual();

  useEffect(() => { document.title = 'Indicadores FTP | CIAE'; }, []);

  const catIcon = urlIcono(ftp.categorias.find(c => c.categoriaIndicador === ftp.categoria)?.imagen);
  const periodo = (
    <PeriodoReporte
      tipo={ftp.tipo}
      datos={ftp.datos}
      meses={ftp.meses}
      avisoMeses={ftp.avisoMeses}
      catColor={ftp.catColor}
      esVisor={ftp.esVisor}
      onTipoChange={ftp.setTipo}
      onDatosChange={ftp.setDatos}
    />
  );

  // Hasta 3 indicadores se nombran; con más, la categoría y cuántos son
  const queSeGeneraEnCategoria = ftp.indicadores.length <= 3
    ? ftp.indicadores.join(', ')
    : `${ftp.categoria} (${ftp.indicadores.length} indicadores)`;

  return (
    <div className="ind-root">
      <div className="ind-bg" aria-hidden>
        <div className="ind-blob ind-blob-1" />
        <div className="ind-blob ind-blob-2" />
        <div className="ind-grid" />
      </div>

      <TopBar
        backTo="/CIAE/IndicadoresMedicos/Generar"
        rightExtra={<AccionesPoblacion esVisor={ftp.esVisor} archivo={poblacion.archivo} periodo={poblacion.periodo} onActualizar={poblacion.abrirModal} />}
      />

      {poblacion.modalAbierto && <ModalPoblacion onClose={poblacion.cerrarModal} archivoActual={poblacion.archivo} />}

      <main className="ind-hub-main" style={{ '--familia': ftp.catColor }}>

        <SidebarCategorias
          categorias={ftp.categorias}
          cargandoLista={ftp.cargandoLista}
          categoria={ftp.categoria}
          indicadorSel={ftp.indicadorSel}
          abierta={panel.abierta}
          onToggle={panel.alternarCategoria}
          onSelectIndicador={(cat, ind) => {
            ftp.setCategoria(cat);
            ftp.setIndicadorSel(ind === ftp.indicadorSel ? null : ind);
          }}
          onSelectTodos={cat => {
            ftp.setCategoria(cat);
            ftp.setIndicadorSel(null);
          }}
          collapsed={panel.colapsado}
          onToggleCollapse={panel.alternarColapsado}
        />

        <section className="ind-config-panel">
          <div className="ind-config-inner">

            {ftp.indicadorSel ? (
              <>
                <TarjetaSeleccion
                  eyebrow="Indicador"
                  iconoEyebrow={<IconoTendencia tamano={13} />}
                  nombre={ftp.indicadorSel}
                  descripcion={ftp.infoIndicador?.informacion?.titulo}
                  color={ftp.catColor}
                  icono={catIcon}
                >
                  {ftp.infoIndicador && (
                    <div style={{ marginTop: 14 }}>
                      <FichaTecnicaBoton indicador={ftp.indicadorSel} color={ftp.catColor} />
                    </div>
                  )}
                </TarjetaSeleccion>

                <div className="ind-gen-columnas">
                  {periodo}
                  {ftp.semData && ftp.datos.mes && (
                    <aside className="ind-gen-lateral">
                      <RangosDesempeno mes={MESES_LARGOS[ftp.datos.mes]} textos={ftp.semData} />
                    </aside>
                  )}
                </div>

                {ftp.mesesFaltantes.length > 0 && (
                  <AvisoMesesFaltantes meses={ftp.mesesFaltantes} confirmando={ftp.confirmandoFaltantes} />
                )}

                {ftp.puedeGenFTP && (
                  <BarraGenerar resumen={ftp.textoPeriodo && `${ftp.indicadorSel} · ${ftp.textoPeriodo}`}>
                    <BotonGenerar
                      color={ftp.confirmandoFaltantes ? '#ea580c' : ftp.catColor}
                      habilitado={ftp.canGenerar}
                      generando={ftp.cargando}
                      textoGenerando="Generando…"
                      onClick={ftp.generarReporte}
                    >
                      {ftp.confirmandoFaltantes
                        ? <><IconoDescargar /> Generar de todas formas</>
                        : <><IconoDescargar /> Generar · {ftp.indicadorSel}</>}
                    </BotonGenerar>
                  </BarraGenerar>
                )}
              </>

            ) : (
              <>
                <TarjetaSeleccion
                  eyebrow="Categoría · generar todos"
                  iconoEyebrow={<IconoCapas tamano={13} />}
                  nombre={ftp.categoria}
                  descripcion={`${ftp.indicadores.length} indicador${ftp.indicadores.length !== 1 ? 'es' : ''} · se generará un Excel con una pestaña por indicador`}
                  color={ftp.catColor}
                  icono={catIcon}
                >
                  {ftp.indicadores.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <FichaTecnicaBoton indicador={ftp.indicadores} color={ftp.catColor} />
                    </div>
                  )}
                </TarjetaSeleccion>

                <div className="ind-gen-columnas">
                  {periodo}
                  <aside className="ind-gen-lateral ind-batch-panel">
                    <ResultadoCategoria
                      indicadores={ftp.indicadores}
                      color={ftp.catColor}
                      resultado={ftp.resultadoBatch}
                      onVerRestricciones={ftp.restriccionesData ? () => ftp.setMostrarRestricciones(true) : undefined}
                    />
                    <p className="ind-batch-tip"><IconoInfo tamano={13} /> O selecciona un indicador específico en la barra de categorías.</p>
                  </aside>
                </div>

                {ftp.puedeGenFTP && (
                  <BarraGenerar resumen={ftp.textoPeriodo && `${queSeGeneraEnCategoria} · ${ftp.textoPeriodo}`}>
                    <BotonGenerar
                      color={ftp.catColor}
                      habilitado={ftp.canBatch}
                      generando={ftp.cargandoBatch}
                      textoGenerando={`Generando ${ftp.indicadores.length} indicadores…`}
                      onClick={ftp.generarTodos}
                    >
                      <IconoGenerarTodos /> Generar todos · {ftp.categoria} ({ftp.indicadores.length})
                    </BotonGenerar>
                  </BarraGenerar>
                )}
              </>
            )}

          </div>
        </section>

      </main>

      <ModalLoading
        isOpen={ftp.cargando || ftp.cargandoBatch}
        nota={<>Este proceso <strong>solo consulta</strong> la información de los archivos FTP originales — <strong>no los modifica, edita ni elimina</strong> en ningún momento.</>}
      />
      {ftp.mostrarRestricciones && ftp.restriccionesData && (
        <VentanaErroresFtp
          restricciones={ftp.restriccionesData}
          subtitulo={ftp.origenRestricciones}
          color={ftp.catColor}
          onClose={() => ftp.setMostrarRestricciones(false)}
        />
      )}
      <ModalRegenerarFtp
        abierto={ftp.mostrarConfirmarRegenerar}
        modo={ftp.regenerarModo}
        indicador={ftp.indicadorSel}
        categoria={ftp.categoria}
        totalIndicadores={ftp.indicadores.length}
        periodo={ftp.datos}
        color={ftp.catColorFuerte}
        regenerando={ftp.regenerando}
        error={ftp.errorRegenerar}
        onCerrar={() => ftp.setMostrarConfirmarRegenerar(false)}
        onConfirmar={ftp.confirmarRegenerar}
      />
    </div>
  );
};

export default GenerarFtpPagina;
