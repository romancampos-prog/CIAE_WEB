import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TarjetaNav } from '../../../../shared/tarjetaNav/tarjetaNav';

@Component({
  selector: 'app-panel-indicadores',
  imports: [TarjetaNav],
  styleUrl: './panelIndicadores.css',
  templateUrl: './panelIndicadores.html',
})
export class PanelIndicadores {
  private router = inject(Router);

  irAGraficas() {
    this.router.navigate(['/CIAE/IndicadoresMedicos/Graficas']);
  }
}
