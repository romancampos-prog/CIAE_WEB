// react
import { useState } from 'react';
// propios
import LeyendaSemaforo from './LeyendaSemaforo';
import TooltipDato from './TooltipDato';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { formatoValor, metaDe, ordenarPorResultado, techoDe } from '@/features/graficas/utils/datosGrafica';
import type { Desempeno, FilaUnidad, PerfilIndicador } from '@/features/graficas/tipos';

interface Props {
  filas: FilaUnidad[];
  perfil: PerfilIndicador | null;
  mes: string;
  onVerUnidad: (unidad: string) => void;
}

const VISIBLES = 15;

/**
 * Todas las unidades en el mes elegido, en barras horizontales ordenadas (la mejor arriba)
 * con la meta como línea punteada. Para indicadores con meta de un solo valor (más o menos
 * es mejor); los de rango usan CompararRango.
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

  const metaGeneral = perfil?.metaPorMes?.[mes];
  const techo = techoDe([...filas.map(f => f.resultado), ...filas.map(f => metaDe(perfil, mes, f.unidad)?.valor)]);
  const porcentaje = (valor: number) => `${Math.min(100, (valor / techo) * 100)}%`;
  const umbral = perfil?.umbralDenominadorChico;

  return (
    <div className="gi-comparar">
      <p className="gi-vista-ayuda">
        Unidades {perfil?.esCorte ? 'del corte' : 'de'} {mes.toLowerCase()}
        {perfil?.tipoMeta === 'menos' ? ' de menor a mayor (aquí menos es mejor).' : perfil?.tipoMeta === 'mas' ? ' de mayor a menor (aquí más es mejor).' : ' de mayor a menor.'}
        {metaGeneral?.valor != null && ' La línea punteada es la meta.'} Da clic en una unidad para ver su tendencia.
      </p>

      <div className="gi-comparar-encabezado" aria-hidden>
        <span>Unidad</span>
        <span className="gi-comparar-meta-etiqueta">
          {metaGeneral?.valor != null && (
            <span style={{ left: porcentaje(metaGeneral.valor) }}>Meta {metaGeneral.texto}</span>
          )}
        </span>
        <span className="gi-derecha">Resultado{perfil?.unidadMedida && perfil.unidadMedida !== '%' ? ` (${perfil.unidadMedida})` : ''}</span>
      </div>

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
                onClick={() => onVerUnidad(fila.unidad)}
                aria-label={`${fila.unidad}: ${formatoValor(fila.resultado, perfil?.unidadMedida)} (${estado})${meta ? ` · meta ${meta.texto}` : ''}`}
              >
                <span className="gi-comparar-unidad">{fila.unidad}</span>
                <span className="gi-barra-pista">
                  {fila.resultado != null && (
                    <span className="gi-barra" style={{ width: porcentaje(fila.resultado), '--status': COLOR_SEMAFORO[fila.desempeno] }} />
                  )}
                  {meta?.valor != null && <span className="gi-barra-meta" style={{ left: porcentaje(meta.valor) }} />}
                  <TooltipDato
                    titulo={fila.unidad}
                    valor={formatoValor(fila.resultado, perfil?.unidadMedida)}
                    desempeno={fila.desempeno}
                    numerador={fila.numerador}
                    denominador={fila.denominador}
                    extra={meta ? `Meta ${meta.texto}` : null}
                  />
                </span>
                <span className="gi-comparar-valor">
                  {formatoValor(fila.resultado, perfil?.unidadMedida)}
                  <small>{estado}</small>
                  {chico && <small className="gi-aviso-chico" title={`Denominador de ${fila.denominador}: un solo caso mueve mucho el resultado`}>den. {fila.denominador}</small>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

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
        {metaGeneral?.valor != null && <li><span className="gi-leyenda-meta" />Meta del mes</li>}
      </LeyendaSemaforo>
    </div>
  );
};

export default CompararUnidades;
