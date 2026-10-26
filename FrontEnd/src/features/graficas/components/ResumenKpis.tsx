// propios
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { formatoNumero as formato } from '@/features/graficas/utils/datosGrafica';
import type { Desempeno, PerfilIndicador, ResumenMes } from '@/features/graficas/tipos';
import './estadisticas.css';

const IconoFlecha = ({ sube }: { sube: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {sube ? <polyline points="6 15 12 9 18 15" /> : <polyline points="6 9 12 15 18 9" />}
  </svg>
);

const Estado = ({ desempeno }: { desempeno: Desempeno }) => (
  <span className="ige-estado">
    <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[desempeno] ?? COLOR_SEMAFORO.Gris }} />
    {desempeno === 'Gris' ? 'Sin dato' : desempeno}
  </span>
);

/**
 * Fila de indicadores clave del mes de referencia. Todo viene calculado del backend
 * (estadisticas.resumenPorMes): aquí solo se pinta.
 *
 * Props:
 *   resumen      — un elemento de resumenPorMes
 *   mesAnterior  — nombre del mes anterior ("Junio") para rotular el cambio, o null
 *   niveles      — niveles del semáforo de este indicador (perfil.niveles): solo esos se nombran
 *   unidadMedida — "%", "por 1,000"... (perfil.unidadMedida)
 *   esCorte      — true en indicadores por corte (rotula "corte" en vez de "mes")
 */
interface Props {
  resumen: ResumenMes | null;
  mesAnterior: string | null;
  niveles?: Desempeno[];
  unidadMedida?: PerfilIndicador['unidadMedida'];
  esCorte?: boolean;
}

const ResumenKpis = ({ resumen, mesAnterior, niveles = ['Esperado', 'Medio', 'Bajo'], unidadMedida, esCorte }: Props) => {
  if (!resumen) return null;
  const { mes, estatal, desempenoEstatal, cambio, meta, mejora, unidades, unidadesConDato, acumulado, desempenoAcumulado } = resumen;
  const sufijo = unidadMedida === '%' ? ' %' : '';
  const otrosNiveles = niveles.filter(n => n !== 'Esperado').map(n => `${unidades[n] ?? 0} en ${n}`);

  // El color del cambio depende de si en este indicador subir es bueno ("mas") o malo ("menos").
  const tonoCambio = cambio == null || cambio === 0 || !mejora
    ? 'neutro'
    : (cambio > 0) === (mejora === 'mas') ? 'bueno' : 'malo';

  return (
    <section className="ige-kpis" aria-label={`Resumen de ${mes}`}>
      <div className="ige-kpi ige-kpi--principal">
        <p className="ige-kpi-etiqueta">Estatal {esCorte ? 'corte de ' : ''}{mes.toLowerCase()}</p>
        <p className="ige-kpi-valor">{formato(estatal)}{estatal != null && sufijo}</p>
        <Estado desempeno={desempenoEstatal} />
        {unidadMedida && unidadMedida !== '%' && <p className="ige-kpi-nota">{unidadMedida}</p>}
      </div>

      <div className="ige-kpi">
        <p className="ige-kpi-etiqueta">Cambio vs {mesAnterior ? mesAnterior.toLowerCase() : esCorte ? 'corte anterior' : 'mes anterior'}</p>
        <p className={`ige-kpi-valor ige-kpi-valor--${tonoCambio}`}>
          {cambio == null ? '—' : <>{cambio !== 0 && <IconoFlecha sube={cambio > 0} />}{cambio > 0 ? '+' : ''}{formato(cambio)}</>}
        </p>
        <p className="ige-kpi-nota">
          {tonoCambio === 'bueno' ? 'Mejoró' : tonoCambio === 'malo' ? 'Empeoró' : cambio == null ? (esCorte ? 'Sin corte anterior' : 'Sin mes anterior') : cambio === 0 ? 'Sin cambio' : cambio > 0 ? 'Subió' : 'Bajó'}
        </p>
      </div>

      <div className="ige-kpi">
        <p className="ige-kpi-etiqueta">Meta (Esperado)</p>
        <p className="ige-kpi-valor ige-kpi-valor--texto">{meta ?? '—'}</p>
        <p className="ige-kpi-nota">{desempenoEstatal === 'Esperado' ? 'El estatal la cumple' : desempenoEstatal === 'Gris' ? 'Sin dato estatal' : 'El estatal no la cumple'}</p>
      </div>

      <div className="ige-kpi">
        <p className="ige-kpi-etiqueta">Unidades en Esperado</p>
        <p className="ige-kpi-valor">
          {unidades.Esperado}<span className="ige-kpi-de"> de {unidadesConDato}</span>
        </p>
        <p className="ige-kpi-nota">{otrosNiveles.join(' · ')}{unidades.Gris ? ` · ${unidades.Gris} sin dato` : ''}</p>
      </div>

      {acumulado != null && (
        <div className="ige-kpi">
          <p className="ige-kpi-etiqueta">Acumulado enero–{mes.toLowerCase()}</p>
          <p className="ige-kpi-valor">{formato(acumulado)}</p>
          <Estado desempeno={desempenoAcumulado ?? 'Gris'} />
        </div>
      )}
    </section>
  );
};

export default ResumenKpis;
