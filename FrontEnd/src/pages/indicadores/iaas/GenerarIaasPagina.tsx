// propios
import { IconoCandado } from '@/components/icons';
import TopBar from '@/components/TopBar';
import ModalLoading from '@/components/ui/modal/ModalCargando';
import {
  AvisoErroresIaas, AvisoPendientesIaas, ModalUnidadTardia, PanelValidacionIaas, ResumenGenerarIaas,
  SelectorPeriodoIaas, TablaCapturaIaas, TarjetasCapturaIaas, useGenerarIaas,
} from '@/features/generar-iaas';
import { FichaTecnicaBoton } from '@/features/indicadores';
import iconoIaas from '@/assets/icono_iaas.png';
import './generarIaas.css';

/** Generar IAAS: Excel por unidad, Excel global de IAAS 01 y denominadores, para los reportes del mes. */
const GenerarIaasPagina = () => {
  const iaas = useGenerarIaas();
  const { periodo } = iaas;
  const listaIaas = iaas.todosIndicadores.map(i => i.indicador);

  return (
    <>
      <div className="ia-root">
        <div className="ia-bg" aria-hidden>
          <div className="ia-orb ia-orb-1" />
          <div className="ia-orb ia-orb-2" />
          <div className="ia-orb ia-orb-3" />
          <div className="ciae-grid" />
        </div>

        <TopBar backTo="/CIAE/IndicadoresMedicos/Generar">
          <span className="ia-legal-note" title="Este sistema solo extrae los valores de los Excel que subes para generar el reporte — no modifica ni altera los archivos originales en ningún momento.">
            <IconoCandado />
          </span>
        </TopBar>

        <main className="ia-main">
          <div className="ia-hero">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div className="ia-hero-title-row" title="Infecciones Asociadas a la Atención de la Salud">
                <span className="ia-hero-label">IAAS</span>
                <span className="ia-hero-sep">·</span>
                <h1 className="ia-hero-title-main">Nuevo reporte</h1>
              </div>
              <FichaTecnicaBoton
                indicador={listaIaas}
                color="#1a5276"
                iconos={Object.fromEntries(listaIaas.map(ind => [ind, iconoIaas]))}
              />
            </div>
          </div>

          <div className="ia-steps">

            <div className="ia-tabla-card">
              <div className="ia-tabla-head">
                <p className="ia-hero-sub">
                  Carga los archivos de cada unidad y captura los denominadores para generar los reportes IAAS del mes
                </p>
                <div className="ia-tabla-head-right">
                  <SelectorPeriodoIaas periodo={periodo} />
                </div>
              </div>

              <div className="ia-table-wrap">
                {iaas.cargando ? (
                  <div className="ia-shimmer-stack">
                    {[1,2,3,4].map(i => <div key={i} className="ia-shimmer-row" />)}
                  </div>
                ) : (
                  <TablaCapturaIaas iaas={iaas} />
                )}
              </div>

              <TarjetasCapturaIaas iaas={iaas} />
            </div>

            <ResumenGenerarIaas iaas={iaas} />

          </div>
        </main>
      </div>

      <AvisoPendientesIaas
        key={`${periodo.anio}-${periodo.mes}`}
        pendientes={iaas.unidadesPendientes}
        mesNombre={iaas.sesion?.mes_nombre ?? periodo.mesNombre}
        anio={periodo.anio}
        onAbrir={iaas.abrirModalTardia}
      />

      <ModalLoading
        isOpen={iaas.generando}
        nota={<>Este proceso <strong>solo extrae</strong> los valores del Excel que subes para generar el reporte — <strong>no modifica ni altera</strong> el archivo original.</>}
      />
      <AvisoErroresIaas mensaje={iaas.errorMensaje} trigger={iaas.errorTrigger} />
      <PanelValidacionIaas errores={iaas.errorLista} trigger={iaas.errorListaTrigger} />

      {iaas.modalTardia && (
        <ModalUnidadTardia
          onClose={iaas.cerrarModalTardia}
          anio={periodo.anio}
          mes={periodo.mes}
          unidades={iaas.unidades}
          todosIndicadores={listaIaas}
          sesion={iaas.sesion}
          indicadoresInfo={iaas.indicadores}
          onSuccess={iaas.alCompletarTardia}
        />
      )}
    </>
  );
};

export default GenerarIaasPagina;
