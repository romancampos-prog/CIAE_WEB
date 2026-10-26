// API publica de la feature generar-ftp: lo unico que se puede usar fuera de features/generar-ftp/.
export { default as AccionesPoblacion } from './components/AccionesPoblacion';
export { default as AvisoMesesFaltantes } from './components/AvisoMesesFaltantes';
export { default as BotonGenerar, IcoAll, IcoDownload } from './components/BotonGenerar';
export { default as ModalPoblacion } from './components/ModalPoblacion/ModalPoblacion';
export { default as ModalRegenerarFtp } from './components/ModalRegenerarFtp';
export { default as ModalRestricciones } from './components/ModalRestricciones/ModalRestricciones';
export { default as PeriodoReporte } from './components/PeriodoReporte';
export { default as RangosDesempeno } from './components/RangosDesempeno';
export { default as ResultadoCategoria } from './components/ResultadoCategoria';
export { default as SidebarCategorias } from './components/SidebarCategorias';
export { default as TarjetaSeleccion } from './components/TarjetaSeleccion';
export { useGenerarFtp } from './hooks/useGenerarFtp';
export { usePanelCategorias } from './hooks/usePanelCategorias';
export { usePoblacionActual } from './hooks/usePoblacionActual';
