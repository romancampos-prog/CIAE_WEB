// propios
import TopBar from '@/components/TopBar';
import ModalLoading from '@/components/ui/modal/ModalCargando';
import {
  PanelSubidaExtractor, SeccionCensoDm, TablaArchivosExtractor, TarjetaIndicadorExtractor, useGenerarExtractor,
} from '@/features/generar-extractor';
import { FichaTecnicaBoton } from '@/features/indicadores';
import './generarExtractor.css';

/** Extractor: la tabla de archivos del año (clic en un mes = subirlo) y una tarjeta por indicador. */
const GenerarExtractorPagina = () => {
  const ex = useGenerarExtractor();

  return (
    <div className="ex-root">
      <div className="ex-bg" aria-hidden>
        <div className="ex-orb ex-orb-1" />
        <div className="ex-orb ex-orb-2" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo="/CIAE/IndicadoresMedicos/Generar" />

      <main className="ex-page-main exv-main">
        <div className="ex-hero">
          <div className="ex-hero-top">
            <div>
              <h1 className="ex-page-title">Extractor</h1>
              <p className="ex-page-sub">
                Sube cada archivo del mes en su apartado. Cada indicador toma lo que necesita y, según su
                periodicidad, guarda el mes o lo genera.
              </p>
            </div>
            <div className="exv-hero-acciones">
              <label className="exv-anio-select">
                <span>Año</span>
                <select value={ex.anio} onChange={e => ex.cambiarAnio(Number(e.target.value))}>
                  {ex.aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              {ex.indicadores.length > 0 && (
                <FichaTecnicaBoton
                  indicador={ex.indicadores.map(i => i.indicador)}
                  color="#0b5445"
                  iconos={ex.iconoDe}
                />
              )}
            </div>
          </div>
        </div>

        {ex.errorCarga && <p className="ex-error">{ex.errorCarga}</p>}

        <h2 className="exv-seccion-titulo">Archivos de {ex.anio}</h2>
        {ex.cargando && !ex.archivos.length && <p className="ex-cargando">Cargando…</p>}
        {ex.archivos.length > 0 && <TablaArchivosExtractor ex={ex} />}

        <h2 className="exv-seccion-titulo">Censo de pacientes con DM</h2>
        <SeccionCensoDm />

        <h2 className="exv-seccion-titulo">Indicadores</h2>
        <div className="exv-ind-grid">
          {ex.indicadores.map(ind => <TarjetaIndicadorExtractor key={ind.indicador} ind={ind} ex={ex} />)}
        </div>
      </main>

      <PanelSubidaExtractor ex={ex} />

      <ModalLoading isOpen={ex.subiendo} nota={`Procesando el ${ex.panel?.archivo ?? 'archivo'} para los indicadores del Extractor...`} />
    </div>
  );
};

export default GenerarExtractorPagina;
