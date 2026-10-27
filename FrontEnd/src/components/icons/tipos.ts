// react
import type { SVGProps } from 'react';

/** Props de un ícono: las de cualquier <svg> y `tamano` (ancho = alto). */
export type PropsIcono = SVGProps<SVGSVGElement> & { tamano?: number | string };
