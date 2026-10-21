/**
 * El único selector de mes de la página: lo que se elige aquí lo usan los KPIs, las
 * tres pestañas y la brecha. Los indicadores por corte lo rotulan como "Corte".
 *
 * Props:
 *   meses       — ["Enero", ..., "Agosto"] en orden
 *   mesSel      — mes elegido
 *   mesParcial  — mes del semanal que aún no cierra (o null)
 *   semana      — número de semana del parcial
 *   anio        — "2026"
 *   esCorte     — true si el indicador se publica por corte
 *   onCambiar   — fn(mes)
 */
const SelectorMes = ({ meses, mesSel, mesParcial, semana, anio, esCorte, onCambiar }) => {
  const etiqueta = (mes) => {
    const base = esCorte ? `Corte de ${mes.toLowerCase()} ${anio}` : `${mes} ${anio}`;
    return mes === mesParcial ? `${base} (parcial · semana ${semana})` : base;
  };

  return (
    <label className="gi-selector-mes">
      <span>{esCorte ? 'Corte de toda la página' : 'Mes de toda la página'}</span>
      <select className="ig-select" value={mesSel} onChange={e => onCambiar(e.target.value)} disabled={!meses.length}>
        {[...meses].reverse().map(mes => <option key={mes} value={mes}>{etiqueta(mes)}</option>)}
      </select>
    </label>
  );
};

export default SelectorMes;
