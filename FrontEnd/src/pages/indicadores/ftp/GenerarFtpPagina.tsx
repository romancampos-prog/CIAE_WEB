// react
import { useEffect } from 'react';
// propios
import TopBar from '@/components/TopBar';
import ModalLoading from '@/components/ui/modal/ModalCargando';
import {
  AccionesPoblacion, AvisoMesesFaltantes, BotonGenerar, IcoAll, IcoDownload, ModalPoblacion, ModalRegenerarFtp,
  ModalRestricciones, PeriodoReporte, RangosDesempeno, ResultadoCategoria, SidebarCategorias, TarjetaSeleccion,
  useGenerarFtp, usePanelCategorias, usePoblacionActual,
} from '@/features/generar-ftp';
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
      mesesDisponibles={ftp.mesesDisponibles}
      catColor={ftp.catColor}
      esVisor={ftp.esVisor}
      style={ftp.indicadorSel ? undefined : { marginBottom: 12 }}
      onTipoChange={ftp.setTipo}
      onDatosChange={ftp.setDatos}
    />
  );

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

      <main className="ind-hub-main">

        <SidebarCategorias
          categorias={ftp.categorias}
          cargandoLista={ftp.cargandoLista}
          categoria={ftp.categoria}
          indicadorSel={ftp.indicadorSel}
          abiertas={panel.abiertas}
          onToggle={panel.alternarCategoria}
          onSelectIndicador={(cat, ind) => {
            ftp.setCategoria(cat);
            ftp.setIndicadorSel(ind === ftp.indicadorSel ? null : ind);
          }}
          collapsed={panel.colapsado}
          onToggleCollapse={panel.alternarColapsado}
        />

        <section className="ind-config-panel">
          <div className="ind-config-layout">
          <div className="ind-config-inner">

            {ftp.indicadorSel ? (
              <>
                <TarjetaSeleccion
                  eyebrow="Indicador"
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

                {periodo}

                {ftp.mesesFaltantes.length > 0 && (
                  <AvisoMesesFaltantes meses={ftp.mesesFaltantes} confirmando={ftp.confirmandoFaltantes} />
                )}

                {ftp.semData && ftp.datos.mes && (
                  <RangosDesempeno mes={MESES_LARGOS[ftp.datos.mes]} textos={ftp.semData} />
                )}

                {ftp.puedeGenFTP && (
                  <BotonGenerar
                    color={ftp.confirmandoFaltantes ? '#ea580c' : ftp.catColor}
                    habilitado={ftp.canGenerar}
                    generando={ftp.cargando}
                    textoGenerando="Generando…"
                    onClick={ftp.generarReporte}
                  >
                    {ftp.confirmandoFaltantes
                      ? <><IcoDownload /> Generar de todas formas</>
                      : <><IcoDownload /> Generar – {ftp.indicadorSel}</>}
                  </BotonGenerar>
                )}
              </>

            ) : (
              <>
                <TarjetaSeleccion
                  eyebrow="Categoría · generar todos"
                  nombre={ftp.categoria}
                  descripcion={`${ftp.indicadores.length} indicador${ftp.indicadores.length !== 1 ? 'es' : ''} · se generará un Excel con una pestaña por indicador`}
                  color={ftp.catColor}
                  icono={catIcon}
                />

                {periodo}

                <div className="ind-batch-panel">
                  <ResultadoCategoria
                    indicadores={ftp.indicadores}
                    color={ftp.catColor}
                    resultado={ftp.resultadoBatch}
                    onVerRestricciones={ftp.restriccionesData ? () => ftp.setMostrarRestricciones(true) : undefined}
                  />

                  {ftp.puedeGenFTP && (
                    <BotonGenerar
                      color={ftp.catColor}
                      habilitado={ftp.canBatch}
                      generando={ftp.cargandoBatch}
                      textoGenerando={`Generando ${ftp.indicadores.length} indicadores…`}
                      onClick={ftp.generarTodos}
                    >
                      <IcoAll /> Generar todos · {ftp.categoria} ({ftp.indicadores.length})
                    </BotonGenerar>
                  )}

                  <p className="ind-batch-tip">
                    O selecciona un indicador específico del panel izquierdo.
                  </p>
                </div>
              </>
            )}

          </div>{/* ind-config-inner */}

          {catIcon && (
            <div className="ind-icon-side" style={{ '--ic': ftp.catColor }}>
              <div className="ind-icon-side-inner">
                <img src={catIcon} alt="" className="ind-icon-side-img" />
              </div>
            </div>
          )}
          </div>{/* ind-config-layout */}
        </section>

      </main>

      <ModalLoading
        isOpen={ftp.cargando || ftp.cargandoBatch}
        nota={<>Este proceso <strong>solo consulta</strong> la información de los archivos FTP originales — <strong>no los modifica, edita ni elimina</strong> en ningún momento.</>}
      />
      <ModalRestricciones
        isOpen={ftp.mostrarRestricciones}
        restricciones={ftp.restriccionesData}
        onClose={() => ftp.setMostrarRestricciones(false)}
      />
      <ModalRegenerarFtp
        abierto={ftp.mostrarConfirmarRegenerar}
        modo={ftp.regenerarModo}
        indicador={ftp.indicadorSel}
        categoria={ftp.categoria}
        totalIndicadores={ftp.indicadores.length}
        periodo={ftp.datos}
        color={ftp.catColor}
        regenerando={ftp.regenerando}
        error={ftp.errorRegenerar}
        onCerrar={() => ftp.setMostrarConfirmarRegenerar(false)}
        onConfirmar={ftp.confirmarRegenerar}
      />
    </div>
  );
};

export default GenerarFtpPagina;
