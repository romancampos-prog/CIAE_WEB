import {Routes} from "@angular/router";
import {PanelIndicadores} from "./pages/panelIndicadores/panelIndicadores";
import {GraficaIndicadores} from "./pages/graficaIndicadores/graficaIndicadores";

export const INDICADORES_ROUTES: Routes = [
  { path: '', component: PanelIndicadores },
  { path: 'Graficas', component: GraficaIndicadores }
];