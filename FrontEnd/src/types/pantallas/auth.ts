// Sesión del usuario en el front.

// propios
import type { Rol } from '@/types/api/auth';

// Tipos propios de la pantalla (lo que responde el backend está en src/api/).

export interface Sesion {
  user: string;
  rol: Rol;
}
