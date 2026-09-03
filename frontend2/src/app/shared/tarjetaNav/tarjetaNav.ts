import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-tarjeta-nav',
  templateUrl: './tarjetaNav.html',
  styleUrl: './tarjetaNav.css',
})
export class TarjetaNav {
  @Input() titulo = '';
  @Input() antetitulo = '';
  @Input() descripcion = '';
  @Input() etiquetas: string[] = [];
  @Input() color: 'green' | 'gold' | 'tinto' = 'green';
  @Input() deshabilitado = false;
  @Input() mensajeDeshabilitado = 'Sin permiso';
  @Output() activar  = new EventEmitter<void>();
  
  onClick(): void  {
    if(!this.deshabilitado) {
      this.activar.emit();
    } 
  }
}
