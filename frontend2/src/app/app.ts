import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Encabezado } from './shared/encabezado/encabezado';
import { PiePagina } from './shared/piePagina/piePagina';

@Component({
  imports: [RouterOutlet, Encabezado, PiePagina],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend2');
}
