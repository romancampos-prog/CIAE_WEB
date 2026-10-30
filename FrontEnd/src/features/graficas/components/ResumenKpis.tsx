// react
import type { ReactNode } from 'react';
// propios
import type { Desempeno, Franja, PerfilIndicador, ResumenMes } from '@/types/api/indicadores/reportes';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { ETIQUETA_TOTAL, formatoNumero as formato, textoNivel, type franjasPorGrupo } from '@/features/graficas/utils/datosGrafica';
import './estadisticas.css';

/**
 * Panel angosto al lado de la gráfica con lo del mes: el Total OOAD con su Num y Den (en Tendencia, en su lugar, lo de la unidad elegida) y el semáforo con los rangos de cada nivel y cuántas
 * unidades hay en cada uno; al tocar un nivel, la lista de unidades se filtra a ese color.
 * Todo viene calculado del backend (resumenPorMes, o resumenAcumuladoPorMes con el switch).
 *
 * Props:
 *   resumen      — un elemento de resumenPorMes
 *   niveles      — niveles del semáforo de este indicador (perfil.niveles): solo esos se nombran
 *   unidadMedida — "%", "por 1,000"... (perfil.unidadMedida)
 *   esCorte      — true en indicadores por corte (rotula "corte" en vez de "mes")
 *   franjas      — franjas del semáforo del mes (perfil.franjasPorMes): los números de cada nivel
 *   porTipo      — cuando el semáforo va por tipo de hospital (IAAS 01): las franjas de cada tipo
 *   acumulado    — true con el switch Acumulado: el resumen es de enero al mes
 *   filtro, onFiltrar — nivel elegido para filtrar las unidades (null = todas)
 *   bloqueSuperior — en Tendencia, lo de la unidad elegida: va en lugar del bloque del Total OOAD
 *   bloqueExtra    — en Comparar, la mejor y la peor unidad: va debajo del Total OOAD
 */
interface Props {
  resumen: ResumenMes | null;
  niveles?: Desempeno[];
  unidadMedida?: PerfilIndicador['unidadMedida'];
  esCorte?: boolean;
  franjas?: Franja[];
  porTipo?: ReturnType<typeof franjasPorGrupo>;
  acumulado?: boolean;
  filtro: Desempeno | null;
  onFiltrar: (nivel: Desempeno | null) => void;
  bloqueSuperior?: ReactNode;
  bloqueExtra?: ReactNode;
}

const ResumenKpis = ({
  resumen, niveles = ['Esperado', 'Medio', 'Bajo'], unidadMedida, esCorte, franjas = [], porTipo = [], acumulado = false,
  filtro, onFiltrar, bloqueSuperior, bloqueExtra,
}: Props) => {
  if (!resumen) return null;
  const { mes, estatal, numerador, denominador, desempenoEstatal, unidades } = resumen;
  const sufijo = unidadMedida === '%' ? ' %' : '';
  const conteos: Desempeno[] = unidades.Gris ? [...niveles, 'Gris'] : niveles;

  return (
    <aside className="gi-panel" aria-label={`Resumen de ${mes}`}>
      {bloqueSuperior ?? (
      <section className="gi-panel-bloque gi-panel-bloque--estado" style={{ '--status': COLOR_SEMAFORO[desempenoEstatal] }}>
        <p className="gi-panel-titulo">{ETIQUETA_TOTAL} · {esCorte ? 'corte de ' : ''}{acumulado ? `enero–${mes.toLowerCase()}` : mes.toLowerCase()}</p>
        <p className="gi-panel-valor">
          {formato(estatal)}{estatal != null && sufijo}
          <span className="ige-estado">
            <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[desempenoEstatal] }} />
            {desempenoEstatal === 'Gris' ? 'Sin dato' : desempenoEstatal}
          </span>
        </p>
        {numerador != null && denominador != null && (
          <p className="gi-panel-numden">
            <span>Num <strong>{formato(numerador, 0)}</strong></span>
            <span>Den <strong>{formato(denominador, 0)}</strong></span>
          </p>
        )}
      </section>
      )}
      {bloqueExtra}

      <section className="gi-panel-bloque">
        <p className="gi-panel-titulo">Semáforo de {mes.toLowerCase()}</p>

        {/* IAAS 01: un bloque por tipo de hospital con sus rangos; al final el del Total OOAD */}
        {porTipo.length > 0 && (
          <div className="gi-panel-tipos">
            {[...porTipo, { grupos: [ETIQUETA_TOTAL], franjas }].map(({ grupos, franjas: delTipo }) => (
              <div key={grupos.join()} className="gi-panel-tipo">
                <p className="gi-panel-tipo-nombre">{grupos.join(', ')}</p>
                <ul className="gi-panel-tipo-rangos">
                  {niveles.map(n => (
                    <li key={n}>
                      <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[n] }} />
                      <span>{n}</span>
                      <strong>{textoNivel(delTipo, n)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Cada nivel: su rango (si no va por tipo) y cuántas unidades tiene; al tocarlo, filtra */}
        <ul className="gi-panel-niveles">
          {conteos.map(n => (
            <li key={n}>
              <button
                type="button"
                className={`gi-panel-nivel${filtro === n ? ' gi-panel-nivel--activo' : ''}`}
                style={{ '--status': COLOR_SEMAFORO[n] }}
                aria-pressed={filtro === n}
                onClick={() => onFiltrar(filtro === n ? null : n)}
              >
                <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[n] }} />
                <span className="gi-panel-nivel-nombre">
                  {n === 'Gris' ? 'Sin dato' : n}
                  {porTipo.length === 0 && n !== 'Gris' && <small>{textoNivel(franjas, n)}</small>}
                </span>
                <span className="gi-panel-nivel-cuenta">{unidades[n] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="gi-panel-nota">
          {filtro
            ? <button type="button" className="gi-panel-limpiar" onClick={() => onFiltrar(null)}>Ver todas las unidades</button>
            : 'Toca un color para ver solo esas unidades.'}
        </p>
      </section>
    </aside>
  );
};

export default ResumenKpis;
