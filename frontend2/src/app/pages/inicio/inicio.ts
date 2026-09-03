import { Component, inject } from '@angular/core';
import { TarjetaNav } from '../../shared/tarjetaNav/tarjetaNav';
import { Router } from "@angular/router";



@Component({
  selector: 'app-inicio',
  imports: [TarjetaNav],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})


export class Inicio {
  private router = inject(Router);

  
  protected readonly saludo = obtenerSaludo();


  irAIndicadoresPanel() {
    this.router.navigate(['/CIAE/IndicadoresMedicos']);
  }


}






type Saludo = { texto: string; icono: 'dia' | 'tarde' | 'noche' };
function obtenerSaludo(): Saludo {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 12) return { texto: 'Buenos días', icono: 'dia' };
  if (hora >= 12 && hora < 19) return { texto: 'Buenas tardes', icono: 'tarde' };
  return { texto: 'Buenas noches', icono: 'noche' };
}
