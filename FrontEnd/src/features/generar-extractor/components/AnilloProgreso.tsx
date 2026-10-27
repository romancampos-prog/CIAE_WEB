const RADIO = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Anillo con los meses subidos de una ventana de corte. */
const AnilloProgreso = ({ subidos, total }: { subidos: number; total: number }) => {
  const offset = CIRCUNFERENCIA * (1 - (total ? subidos / total : 0));
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="exv-anillo">
      <circle cx="28" cy="28" r={RADIO} className="exv-anillo-fondo" />
      <circle cx="28" cy="28" r={RADIO} className="exv-anillo-relleno" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={offset} />
      <text x="28" y="32" textAnchor="middle" className="exv-anillo-num">{subidos}/{total}</text>
    </svg>
  );
};

export default AnilloProgreso;
