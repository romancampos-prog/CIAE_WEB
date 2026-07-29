import TopBar from '../../../../shared/componentes/TopBar'

/**
 * Barra superior del módulo Epidemiología.
 * Usa el header compartido TopBar (logo, chip de usuario y botón volver);
 * el label "Epidemiología · Dengue" va como contenido extra junto al logo.
 */
export default function DengueHeader() {
  return (
    <TopBar backTo="/CIAE/Epidemiologia">
      <div>
        <div className="epi-nav-label">Epidemiología · Dengue</div>
        <div className="epi-nav-sublabel">IMSS OOAD Guanajuato</div>
      </div>
    </TopBar>
  )
}
