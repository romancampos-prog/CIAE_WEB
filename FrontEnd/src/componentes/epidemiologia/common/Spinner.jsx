export default function DengueSpinner({ texto = 'Cargando…' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '32px 0' }}>
      <div style={{
        width: 22, height: 22,
        border: '3px solid rgba(11,84,69,0.15)',
        borderTopColor: '#0b5445',
        borderRadius: '50%',
        animation: 'epi-girar 0.75s linear infinite',
        flexShrink: 0,
      }} />
      <span style={{ color: '#475569', fontSize: 14, fontWeight: 500 }}>{texto}</span>
      <style>{`@keyframes epi-girar { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
