// El backend manda el nombre del icono de cada familia (mapeo/catalogos/familias.json, ej. "icono_mt.png");
// aqui solo se traduce ese nombre a la URL que arma Vite, sin una tabla por familia en el front.
const ICONOS = import.meta.glob<string>('../../../assets/icono_*.png', { eager: true, import: 'default' });

export const urlIcono = (nombre: string | null | undefined): string | null =>
  (nombre ? ICONOS[`../../../assets/${nombre}`] ?? null : null);
