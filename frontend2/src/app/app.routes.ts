import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';

export const routes: Routes = [
  { path: 'CIAE/Inicio', component: Inicio },
  { path: '', redirectTo: 'CIAE/Inicio', pathMatch: 'full' },
  { path: 'CIAE/IndicadoresMedicos', loadChildren: () => import('./pages/indicadores/indicadores.routes').then(m => m.INDICADORES_ROUTES)}
];
