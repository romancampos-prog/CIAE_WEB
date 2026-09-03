import { Component } from '@angular/core';

type Categoria = { nombre: string; cantidad: number };
type Kpi = { color: string; colorHex: string; cantidad: number; porcentaje: number };

@Component({
  selector: 'app-grafica-indicadores',
  templateUrl: './graficaIndicadores.html',
  styleUrl: './graficaIndicadores.css',
})
export class GraficaIndicadores {
  drawerAbierto = false;
  categoriaSeleccionada = 'CACU';

  // Datos de ejemplo — se reemplazan cuando conectemos el backend.
  categorias: Categoria[] = [
    { nombre: 'CAMA', cantidad: 4 },
    { nombre: 'CACU', cantidad: 3 },
    { nombre: 'EH', cantidad: 2 },
    { nombre: 'DM', cantidad: 5 },
    { nombre: 'MT', cantidad: 3 },
    { nombre: 'CUPN', cantidad: 2 },
    { nombre: 'S_Ob', cantidad: 2 },
    { nombre: 'CE', cantidad: 4 },
    { nombre: 'IAAS', cantidad: 6 },
  ];

  kpis: Kpi[] = [
    { color: 'Esperado', colorHex: 'var(--color-verde)', cantidad: 18, porcentaje: 60 },
    { color: 'Medio', colorHex: 'var(--color-oro)', cantidad: 7, porcentaje: 23 },
    { color: 'Bajo', colorHex: 'var(--color-tinto)', cantidad: 5, porcentaje: 17 },
  ];

  unidadesEjemplo = ['TOTAL OOAD', 'HGZ 1', 'HGZ 2', 'UMF 3', 'UMF 5'];

  seleccionarCategoria(nombre: string): void {
    this.categoriaSeleccionada = nombre;
    this.drawerAbierto = false;
  }
}
