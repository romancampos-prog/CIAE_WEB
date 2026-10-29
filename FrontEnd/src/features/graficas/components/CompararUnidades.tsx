// react
import { useState } from 'react';
// propios
import type { Desempeno, MetaNumerica, PerfilIndicador } from '@/types/api/indicadores/reportes';
import type { FilaUnidad } from '@/types/pantallas/graficas';
import LeyendaSemaforo from './LeyendaSemaforo';
import TooltipDato from './TooltipDato';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { formatoValor, metaComun, metaDe, ordenarPorResultado, techoDe, textoMeta } from '@/features/graficas/utils/datosGrafica';

interface Props {
  filas: FilaUnidad[];
  perfil: PerfilIndicador | null;
  mes: string;
  onVerUnidad: (unidad: string) => void;
}

const VISIBLES = 15;

/**
 * Todas las unidades en el mes elegido, en barras horizontales ordenadas (la mejor arriba).
 * Si todas tienen la misma meta se dibuja UNA línea (o franja, si es rango) continua sobre
 * la lista; si cada unidad tiene la suya, una marca en cada fila. Los indicadores de meta
 * de rango por unidad usan CompararRango.
 *
 * Props:
 *   filas      — [{ unidad, resultado, desempeno, denominador }] del mes
 *   perfil     — perfil del backend (tipoMeta, niveles, metas, unidadMedida, umbral)
 *   mes        — "Agosto"
 *   onVerUnidad — fn(unidad): abre su tendencia
 */
const CompararUnidades = ({ filas, perfil, mes, onVerUnidad }: Props) => {
  const [filtro, setFiltro]     = useState<Desempeno | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  const filtradas = filtro ? filas.filter(f => f.desempeno === filtro) : filas;
  const ordenadas = ordenarPorResultado(filtradas, perfil?.tipoMeta);
  const visibles  = verTodas ? ordenadas : ordenadas.slice(0, VISIBLES);

  const metas = filas.map(f => metaDe(perfil, mes, f.unidad));
  const comun = metaComun(metas);
  const hayMeta = metas.some(m => m?.valor != null || m?.minimo != null);
  const techo = techoDe([...filas.map(f => f.resultado), ...metas.flatMap(m => [m?.valor, m?.maximo])]);
  const porcentaje = (valor: number) => `${Math.min(100, (valor / techo) * 100)}%`;
  const umbral = perfil?.umbralDenominadorChico;
  const medida = perfil?.unidadMedida && perfil.unidadMedida !== '%' ? ` (${perfil.unidadMedida})` : '';

  return (
    <div className={`gi-comparar${comun ? ' gi-comparar--meta-comun' : ''}`}>
      <p className="gi-vista-ayuda">
        Unidades {perfil?.esCorte ? 'del corte' : 'de'} {mes.toLowerCase()}
        {perfil?.tipoMeta === 'menos' ? ' de menor a mayor (aquí menos es mejor).' : perfil?.tipoMeta === 'mas' ? ' de mayor a menor (aquí más es mejor).' : ' de mayor a menor.'}
        {hayMeta && (comun?.minimo != null ? ' La franja es el rango de la meta.' : comun ? ' La línea punteada es la meta.' : ' La marca en cada barra es la meta de esa unidad.')}
        {' '}Da clic en una unidad para ver su tendencia.
      </p>

      <div className="gi-comparar-encabezado" aria-hidden>
        <span>Unidad</span>
        <span className="gi-comparar-meta-etiqueta">
          {comun && (
            <span style={{ left: comun.minimo != null && comun.maximo != null ? porcentaje((comun.minimo + comun.maximo) / 2) : porcentaje(comun.valor ?? 0) }}>
              Meta {textoMeta(comun)}
            </span>
          )}
        </span>
        <span className="gi-derecha">Resultado{medida}</span>
      </div>

      <div className="gi-comparar-cuerpo">
        <ol className="gi-comparar-lista">
          {visibles.map(fila => {
            const meta = metaDe(perfil, mes, fila.unidad);
            const chico = umbral != null && fila.denominador != null && fila.denominador < umbral;
            const estado = fila.desempeno === 'Gris' ? 'Sin dato' : fila.desempeno;
            return (
              <li key={fila.unidad}>
                <button
                  type="button"
                  className="gi-comparar-fila"
                  style={{ '--status': COLOR_SEMAFORO[fila.desempeno] }}
                  onClick={() => onVerUnidad(fila.unidad)}
                  aria-label={`${fila.unidad}: ${formatoValor(fila.resultado, perfil?.unidadMedida)} (${estado})${meta ? ` · meta ${textoMeta(meta)}` : ''}`}
                >
                  <span className="gi-comparar-unidad">{fila.unidad}</span>
                  <span className="gi-barra-pista">
                    {meta && <MarcaMeta meta={meta} porcentaje={porcentaje} />}
                    {fila.resultado != null && <span className="gi-barra" style={{ width: porcentaje(fila.resultado) }} />}
                    <TooltipDato
                      titulo={fila.unidad}
                      valor={formatoValor(fila.resultado, perfil?.unidadMedida)}
                      desempeno={fila.desempeno}
                      numerador={fila.numerador}
                      denominador={fila.denominador}
                      extra={meta ? `Meta ${textoMeta(meta)}` : null}
                    />
                  </span>
                  <span className="gi-comparar-valor">
                    <strong>{formatoValor(fila.resultado, perfil?.unidadMedida)}</strong>
                    <small><span className="gi-punto" />{estado}</small>
                    {chico && <small className="gi-aviso-chico" title={`Denominador de ${fila.denominador}: un solo caso mueve mucho el resultado`}>den. {fila.denominador}</small>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Meta común: una sola guía con las mismas columnas que las filas, así queda recta de arriba abajo */}
        {comun && visibles.length > 0 && (
          <div className="gi-comparar-guia" aria-hidden>
            <span />
            <span className="gi-comparar-guia-pista"><MarcaMeta meta={comun} porcentaje={porcentaje} continua /></span>
            <span />
          </div>
        )}
      </div>

      {ordenadas.length > VISIBLES && (
        <button type="button" className="ige-ver-todas" onClick={() => setVerTodas(v => !v)}>
          {verTodas ? 'Ver menos' : `Ver las ${ordenadas.length} unidades`}
        </button>
      )}
      {!ordenadas.length && <p className="ige-vacio">Ninguna unidad en ese nivel este mes.</p>}

      <LeyendaSemaforo
        niveles={perfil?.niveles}
        conGris={filas.some(f => f.desempeno === 'Gris')}
        filtro={filtro}
        onFiltrar={setFiltro}
      >
        {hayMeta && (comun?.minimo != null
          ? <li><span className="gi-leyenda-rango" />Rango de la meta ({textoMeta(comun)})</li>
          : <li><span className="gi-leyenda-meta" />{comun ? `Meta ${textoMeta(comun)}` : 'Meta de cada unidad'}</li>)}
      </LeyendaSemaforo>
    </div>
  );
};

/** La meta sobre la pista: línea si es un límite, franja si es un rango. `continua` = la guía que cruza toda la lista. */
function MarcaMeta({ meta, porcentaje, continua = false }: { meta: MetaNumerica; porcentaje: (v: number) => string; continua?: boolean }) {
  const clase = continua ? ' gi-meta--continua' : ' gi-meta--fila';
  if (meta.minimo != null && meta.maximo != null) {
    return (
      <span
        className={`gi-meta-rango${clase}`}
        style={{ left: porcentaje(meta.minimo), width: `calc(${porcentaje(meta.maximo)} - ${porcentaje(meta.minimo)})` }}
      />
    );
  }
  return meta.valor != null ? <span className={`gi-meta-linea${clase}`} style={{ left: porcentaje(meta.valor) }} /> : null;
}

export default CompararUnidades;
