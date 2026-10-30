// propios
import type { Desempeno, Franja, PerfilIndicador, ResumenMes } from '@/types/api/indicadores/reportes';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { ETIQUETA_TOTAL, formatoNumero as formato, textoMeta, textoNivel, type franjasPorGrupo } from '@/features/graficas/utils/datosGrafica';
import './estadisticas.css';

const Estado = ({ desempeno }: { desempeno: Desempeno }) => (
  <span className="ige-estado">
    <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[desempeno] ?? COLOR_SEMAFORO.Gris }} />
    {desempeno === 'Gris' ? 'Sin dato' : desempeno}
  </span>
);

/**
 * Fila de indicadores clave del mes de referencia. Todo viene calculado del backend
 * (estadisticas.resumenPorMes, o resumenAcumuladoPorMes con el switch): aquí solo se pinta.
 *
 * Props:
 *   resumen      — un elemento de resumenPorMes
 *   niveles      — niveles del semáforo de este indicador (perfil.niveles): solo esos se nombran
 *   unidadMedida — "%", "por 1,000"... (perfil.unidadMedida)
 *   esCorte      — true en indicadores por corte (rotula "corte" en vez de "mes")
 *   franjas      — franjas del semáforo del mes (perfil.franjasPorMes): los números de cada nivel
 *   porTipo      — cuando el semáforo va por tipo de hospital (IAAS 01): las franjas de cada tipo
 *   acumulado    — true con el switch Acumulado: el resumen es de enero al mes
 *   etiquetaNumerador, etiquetaDenominador — palabras del mapeo ("tamizadas" / "mujeres de 25 a 64")
 */
interface Props {
  resumen: ResumenMes | null;
  niveles?: Desempeno[];
  unidadMedida?: PerfilIndicador['unidadMedida'];
  esCorte?: boolean;
  franjas?: Franja[];
  porTipo?: ReturnType<typeof franjasPorGrupo>;
  acumulado?: boolean;
  etiquetaNumerador?: string | null;
  etiquetaDenominador?: string | null;
}

/** "97,885 tamizadas de 716,966 mujeres de 25 a 64" (sin etiquetas: "97,885 de 716,966"). */
const textoNumDen = (numerador: number | null, denominador: number | null, etiquetaNum?: string | null, etiquetaDen?: string | null) =>
  numerador == null || denominador == null ? null
    : `${formato(numerador, 0)}${etiquetaNum ? ` ${etiquetaNum}` : ''} de ${formato(denominador, 0)}${etiquetaDen ? ` ${etiquetaDen}` : ''}`;

const ResumenKpis = ({ resumen, niveles = ['Esperado', 'Medio', 'Bajo'], unidadMedida, esCorte, franjas = [], porTipo = [], acumulado = false, etiquetaNumerador, etiquetaDenominador }: Props) => {
  if (!resumen) return null;
  const {
    mes, estatal, numerador, denominador, desempenoEstatal, meta, mejora, unidades, unidadesConDato,
  } = resumen;
  const sufijo = unidadMedida === '%' ? ' %' : '';
  const otrosNiveles = niveles.filter(n => n !== 'Esperado').map(n => `${unidades[n] ?? 0} en ${n}`);
  // Barra del reparto: los niveles del indicador (y Gris si hay) con sus conteos del backend
  const repartidos: Desempeno[] = unidades.Gris ? [...niveles, 'Gris'] : niveles;
  const total = repartidos.reduce((suma, n) => suma + (unidades[n] ?? 0), 0);
  // El backend manda mejora = null cuando la meta es un rango
  const esRango = mejora == null && meta != null;

  return (
    <section className="ige-kpis" aria-label={`Resumen de ${mes}`}>
      <div className="ige-kpi ige-kpi--principal" style={{ '--status': COLOR_SEMAFORO[desempenoEstatal] }}>
        <p className="ige-kpi-etiqueta">{ETIQUETA_TOTAL} · {esCorte ? 'corte de ' : ''}{acumulado ? `enero–${mes.toLowerCase()} (acumulado)` : mes.toLowerCase()}</p>
        <p className="ige-kpi-valor">{formato(estatal)}{estatal != null && sufijo}</p>
        <Estado desempeno={desempenoEstatal} />
        {textoNumDen(numerador, denominador, etiquetaNumerador, etiquetaDenominador) && (
          <p className="ige-kpi-nota">{textoNumDen(numerador, denominador, etiquetaNumerador, etiquetaDenominador)}</p>
        )}
        {unidadMedida && unidadMedida !== '%' && <p className="ige-kpi-nota">{unidadMedida}</p>}
      </div>

      <div className="ige-kpi">
        <p className="ige-kpi-etiqueta">{porTipo.length ? 'Rango de la meta por tipo de hospital' : `${esRango ? 'Rango de la meta' : 'Meta'} · semáforo de ${mes.toLowerCase()}`}</p>
        {!porTipo.length && <p className="ige-kpi-valor ige-kpi-valor--texto">{textoMeta(meta)}</p>}
        {/* Por tipo de hospital: cada tipo con su rango; el Total OOAD usa el del OOAD */}
        {porTipo.length > 0 && (
          <table className="ige-rangos-tipo">
            <thead>
              <tr>
                <th>Tipo</th>
                {niveles.map(n => <th key={n}><span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[n] }} />{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {porTipo.map(({ grupos, franjas: delTipo }) => (
                <tr key={grupos.join()}>
                  <td>{grupos.join(', ')}</td>
                  {niveles.map(n => <td key={n}>{textoNivel(delTipo, n)}</td>)}
                </tr>
              ))}
              <tr className="ige-rangos-tipo--total">
                <td>{ETIQUETA_TOTAL}</td>
                {niveles.map(n => <td key={n}>{textoNivel(franjas, n)}</td>)}
              </tr>
            </tbody>
          </table>
        )}
        {/* Los números de cada nivel, tal cual el semáforo del mapeo para ese mes */}
        {porTipo.length === 0 && franjas.length > 0 && (
          <ul className="ige-rangos">
            {niveles.map(n => (
              <li key={n} className={desempenoEstatal === n ? 'ige-rangos--actual' : ''}>
                <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[n] }} />
                <span className="ige-rangos-nivel">{n}</span>
                <span className="ige-rangos-numeros">{textoNivel(franjas, n)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="ige-kpi-nota">{desempenoEstatal === 'Esperado' ? `El ${ETIQUETA_TOTAL} la cumple` : desempenoEstatal === 'Gris' ? `Sin dato del ${ETIQUETA_TOTAL}` : `El ${ETIQUETA_TOTAL} no la cumple`}</p>
      </div>

      <div className="ige-kpi">
        <p className="ige-kpi-etiqueta">Unidades en Esperado</p>
        <p className="ige-kpi-valor">
          {unidades.Esperado}<span className="ige-kpi-de"> de {unidadesConDato}</span>
        </p>
        {total > 0 && (
          <span className="ige-reparto" aria-hidden>
            {repartidos.map(n => (
              <span key={n} style={{ flexGrow: unidades[n] ?? 0, background: COLOR_SEMAFORO[n] }} />
            ))}
          </span>
        )}
        <p className="ige-kpi-nota">{otrosNiveles.join(' · ')}{unidades.Gris ? ` · ${unidades.Gris} sin dato` : ''}</p>
      </div>

    </section>
  );
};

export default ResumenKpis;
