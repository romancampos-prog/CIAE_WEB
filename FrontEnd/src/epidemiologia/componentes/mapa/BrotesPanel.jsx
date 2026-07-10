import PanelDeslizante from '../comun/PanelDeslizante'

const estiloSeccion = { borderBottom: '1px solid #f0ece4', padding: '16px 20px' }
const estiloTitulo  = {
  fontSize: 11, fontWeight: 700, color: '#245C4F',
  textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12,
}

/**
 * Panel deslizante que agrupa los brotes detectados: espaciales (concentración geográfica)
 * y temporales (incremento inusual semana a semana). Delega la apertura/cierre a PanelDeslizante.
 * @param {{ brotes_espacial?: object[], brotes_temporal?: object[], ocultarBoton?: boolean, open?: boolean, onToggle?: Function }} props
 */
export default function BrotesPanel({ brotes_espacial = [], brotes_temporal = [], ocultarBoton, open, onToggle }) {
  const total = brotes_espacial.length + brotes_temporal.length

  return (
    <PanelDeslizante
      titulo="⚠ Posibles brotes detectados"
      badge={total}
      labelBoton="⚠ Alertas · Posibles brotes"
      ocultarBoton={ocultarBoton}
      open={open}
      onToggle={onToggle}
    >
      {total === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#2e8b57' }}>
          ✓ Sin brotes detectados en el período actual
        </div>
      ) : (
        <>
          {brotes_espacial.length > 0 && (
            <div style={estiloSeccion}>
              <div style={estiloTitulo}>🔴 Brotes espaciales ({brotes_espacial.length})</div>
              <table className="dengue-tabla" style={{ fontSize: 12 }}>
                <thead><tr><th>Ventana</th><th>Colonia</th><th>Municipio</th><th>Casos</th></tr></thead>
                <tbody>
                  {brotes_espacial.map((b, i) => (
                    <tr key={i}>
                      <td>Sem {b.ventana}</td>
                      <td>{b.colonia}</td>
                      <td>{b.municipio}</td>
                      <td style={{ fontWeight: 700 }}>{b.casos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {brotes_temporal.length > 0 && (
            <div style={estiloSeccion}>
              <div style={estiloTitulo}>⬆️ Aumentos inusuales ({brotes_temporal.length})</div>
              <table className="dengue-tabla" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Ventana</th><th>Colonia</th><th>Municipio</th>
                    <th>Actual</th><th>Umbral</th><th>Inc.%</th>
                  </tr>
                </thead>
                <tbody>
                  {brotes_temporal.map((b, i) => (
                    <tr key={i}>
                      <td>Sem {b.ventana}</td>
                      <td>{b.colonia}</td>
                      <td>{b.municipio}</td>
                      <td style={{ fontWeight: 700 }}>{b.casos_actual}</td>
                      <td>{b.umbral}</td>
                      <td style={{ color: '#cc0000' }}>+{b.incremento}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PanelDeslizante>
  )
}
