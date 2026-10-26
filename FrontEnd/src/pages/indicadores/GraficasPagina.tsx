// propios
import TopBar from '@/components/TopBar';
import { GraficaIndicador, SelectorIndicadores, useSeleccionIndicador } from '@/features/graficas';
import './indicadores.css';
import './graficas.css';

/** Gráficas: el maestro (lista de indicadores) a un lado y el detalle (la gráfica del elegido). */
const GraficasPagina = () => {
  const seleccion = useSeleccionIndicador();

  return (
    <div className="ia-root">
      <div className="ia-bg" aria-hidden>
        <div className="ia-orb ia-orb-1" />
        <div className="ia-orb ia-orb-2" />
        <div className="ia-orb ia-orb-3" />
        <div className="ciae-grid" />
      </div>

      <TopBar backTo="/CIAE/IndicadoresMedicos" />

      <SelectorIndicadores {...seleccion} />

      {/* El mismo contenido para FTP, IAAS y Extractor: el backend dice cómo es cada indicador. */}
      {seleccion.indicador && (
        <GraficaIndicador
          indSel={seleccion.indicador}
          onIndSelChange={seleccion.seleccionar}
          iconSrc={seleccion.icono}
          indsHermanos={seleccion.hermanos}
          colorFamilia={seleccion.color}
        />
      )}
    </div>
  );
};

export default GraficasPagina;
