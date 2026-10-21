/**
 * Unidades del mes con denominador chico (menos de perfil.umbralDenominadorChico, del
 * backend): ahí un solo caso mueve mucho el resultado, así que su color se lee con cuidado.
 *
 * Props:
 *   filas   — [{ unidad, denominador }] del mes
 *   umbral  — número del backend, o null si no aplica a este indicador
 *   mes     — "Agosto"
 */
const AvisoDenominador = ({ filas, umbral, mes }) => {
  if (umbral == null) return null;
  const chicas = filas
    .filter(f => f.denominador != null && f.denominador > 0 && f.denominador < umbral)
    .sort((a, b) => a.denominador - b.denominador);
  if (!chicas.length) return null;

  return (
    <section className="ige-tarjeta gi-aviso-denominador">
      <header className="ige-tarjeta-header">
        <h2 className="ige-tarjeta-titulo">Denominador chico · {mes}</h2>
        <p className="ige-tarjeta-sub">
          {chicas.length} {chicas.length === 1 ? 'unidad tiene' : 'unidades tienen'} menos de {umbral} en el denominador:
          un solo caso mueve mucho su resultado, así que su semáforo se lee con cuidado.
        </p>
      </header>
      <ul className="gi-chips">
        {chicas.map(f => <li key={f.unidad}>{f.unidad} <strong>{f.denominador}</strong></li>)}
      </ul>
    </section>
  );
};

export default AvisoDenominador;
