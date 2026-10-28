// propios
import type { PeriodoExtraccion } from '@/types/api/epidemiologia/ftp';
import { MESES_LARGOS_ARR } from '@/features/indicadores';

interface Props {
  anios: number[];
  anio: number;
  onAnio: (anio: number) => void;
  periodos: PeriodoExtraccion[];
  mes: number | null;
  onMes: (mes: number) => void;
}

/** Año y los 12 meses: solo se eligen los que tienen extracción; cada uno dice si es definitivo o previo. */
export default function MesesAcciones({ anios, anio, onAnio, periodos, mes, onMes }: Props) {
  return (
    <nav className="acc-meses" aria-label="Mes a consultar">
      <select className="acc-control" style={{ width: 96 }} value={anio} onChange={e => onAnio(Number(e.target.value))} aria-label="Año">
        {anios.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      <div className="acc-meses-lista">
        {MESES_LARGOS_ARR.map((nombre, i) => {
          const periodo = periodos.find(p => p.mes === i + 1);
          const estado  = periodo ? (periodo.definitivo ? 'Definitivo' : `Previo S${periodo.ultimaSemana}`) : 'Sin datos';

          return (
            <button
              key={nombre}
              className={`acc-mes${mes === i + 1 ? ' acc-mes--activo' : ''}`}
              disabled={!periodo}
              onClick={() => onMes(i + 1)}
              title={`${nombre}: ${estado}`}
            >
              <span className="acc-mes-nombre">{nombre.slice(0, 3)}</span>
              <span className="acc-mes-estado">{estado}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
