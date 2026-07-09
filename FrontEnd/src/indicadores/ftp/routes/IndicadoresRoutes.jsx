import { Routes, Route } from 'react-router-dom';
import HubIndicadoresMedicos  from '@ftp/paginas/FTPPage';
import GraficasUnificadas     from '@ftp/paginas/GraficasUnificadasPage';
import GenerarHub             from '@ftp/paginas/GenerarHub';
import FTPMenu                from '@ftp/paginas/FTPLanding';
import FTPGenerar             from '@ftp/paginas/IndicadoresPage';
import FTPGraficas            from '@ftp/paginas/FTPGraficasPage';
import IASSMenu               from '@iass/paginas/IASSLanding';
import IASSReporte            from '@iass/paginas/IASSPage';
import IASSDatos              from '@iass/paginas/IASSGraficasPage';
import ConfiguracionReporte   from '@indReportes/paginas/ConfigPage';
import GraficaReporte         from '@indReportes/paginas/pageGraficas';
import ReporteRestricciones   from '@paginas/restricciones/Restriciones';

export default function IndicadoresRoutes() {
  return (
    <Routes>
      <Route index                    element={<HubIndicadoresMedicos />} />
      <Route path="Graficas"          element={<GraficasUnificadas />} />
      <Route path="Generar"           element={<GenerarHub />} />
      <Route path="FTP"               element={<FTPMenu />} />
      <Route path="FTP/Generar"       element={<FTPGenerar />} />
      <Route path="FTP/Graficas"      element={<FTPGraficas />} />
      <Route path="IASS"              element={<IASSMenu />} />
      <Route path="IASS/Reporte"      element={<IASSReporte />} />
      <Route path="IASS/Datos"        element={<IASSDatos />} />
      <Route path="Config"            element={<ConfiguracionReporte />} />
      <Route path="GraficaReporte"    element={<GraficaReporte />} />
      <Route path="Restricciones"     element={<ReporteRestricciones />} />
    </Routes>
  );
}
