import DengueSpinner from '../componentes/comun/Spinner'
import SeccionDuplicados from '../componentes/duplicados/SeccionDuplicados'
import SeccionPosiblesDuplicados from '../componentes/duplicados/SeccionPosiblesDuplicados'
import { useDengueReporte } from '../hooks/useDengueReportes'
import { getDuplicados, getPosiblesDuplicados } from '../api/reportes'
import { agruparPorMetodo } from '../utils/calculos'

const COLOR        = '#4f46e5'
const COLOR_POSIBLE = '#b45309'

/**
 * Página de duplicados detectados en la base de dengue.
 * Muestra los registros eliminados (confirmados) separados de los posibles
 * duplicados que requieren revisión manual.
 */
export default function DuplicadosPage() {
  const { datos: datosConf,    cargando: cargConf,    error: errConf    } = useDengueReporte(getDuplicados)
  const { datos: datosPosible, cargando: cargPosible, error: errPosible } = useDengueReporte(getPosiblesDuplicados)

  if (cargConf || cargPosible) return <DengueSpinner texto="Cargando duplicados…" />

  if (errConf || errPosible) return (
    <div className="dengue-estado-vacio">
      <div className="dengue-icono">⚠️</div>
      <p>{errConf || errPosible}</p>
    </div>
  )

  const confirmados = Array.isArray(datosConf)    ? datosConf    : []
  const posibles    = Array.isArray(datosPosible) ? datosPosible : []
  const metodos     = agruparPorMetodo(confirmados)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero */}
      <div className="epi-canal-hero" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="epi-canal-titleblock">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            background: `${COLOR}10`, border: `1px solid ${COLOR}30`,
            borderRadius: 100, padding: '0.1875rem 0.75rem',
            fontSize: '0.6rem', fontWeight: 700, color: COLOR,
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.625rem',
          }}>
            ⧉ Depuración de base
          </div>
          <h1 className="epi-canal-titulo" style={{
            fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 800,
            color: '#1e293b', letterSpacing: '-0.8px', margin: '0 0 0.25rem',
          }}>
            Duplicados{' '}
            <span style={{
              backgroundImage: `linear-gradient(90deg, ${COLOR}, #7c3aed)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>detectados</span>
          </h1>
          <p className="epi-canal-sub" style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
            IMSS OOAD Guanajuato · haz clic en cada fila para ver el detalle
          </p>
        </div>

        {/* KPIs */}
        <div className="epi-canal-kpis" style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          {[
            { valor: confirmados.length, label: 'Confirmados eliminados', color: COLOR,         borde: `${COLOR}25`           },
            { valor: Object.keys(metodos).length, label: 'Métodos usados', color: '#7c3aed',    borde: 'rgba(124,58,237,0.2)' },
            { valor: posibles.length,    label: 'Para revisión manual',   color: COLOR_POSIBLE, borde: `${COLOR_POSIBLE}30`   },
          ].map(({ valor, label, color, borde }) => (
            <div key={label} style={{
              background: 'white', borderRadius: '0.875rem', padding: '0.625rem 1rem',
              border: `1px solid ${borde}`, borderLeft: `0.25rem solid ${color}`,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', textAlign: 'right',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{valor}</div>
              <div style={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500, marginTop: '0.125rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección 1 — duplicados confirmados */}
      <SeccionDuplicados registros={confirmados} />

      {/* Sección 2 — posibles no confirmados */}
      <SeccionPosiblesDuplicados registros={posibles} />

    </div>
  )
}
