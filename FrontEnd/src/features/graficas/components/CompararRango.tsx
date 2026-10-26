// react
import { useState } from 'react';
// propios
import LeyendaSemaforo from './LeyendaSemaforo';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { formatoNumero, formatoValor, metaDe } from '@/features/graficas/utils/datosGrafica';
import type { Desempeno, FilaUnidad, PerfilIndicador } from '@/features/graficas/tipos';

interface Props {
  filas: FilaUnidad[];
  perfil: PerfilIndicador | null;
  mes: string;
  grupoDeUnidad?: Record<string, string> | null;
  onVerUnidad: (unidad: string) => void;
}

/**
 * Comparar para indicadores con meta de RANGO (IAAS, MT 03): cada unidad contra su propio
 * rango. Al centro las que están dentro (su semáforo es Esperado); a la derecha cuánto se
 * pasan del máximo y a la izquierda cuánto les falta para el mínimo. El color sigue siendo
 * el desempeño que manda el backend.
 *
 * Props:
 *   filas         — [{ unidad, resultado, desempeno, denominador }] del mes
 *   perfil        — perfil del backend
 *   mes           — "Mayo"
 *   grupoDeUnidad — { unidad: "HGS" | ... } cuando el semáforo va por grupo (ficha), o null
 *   onVerUnidad   — fn(unidad)
 */
const CompararRango = ({ filas, perfil, mes, grupoDeUnidad, onVerUnidad }: Props) => {
  const [filtro, setFiltro] = useState<Desempeno | null>(null);

  const conDistancia = filas.map(fila => {
    const rango = metaDe(perfil, mes, fila.unidad);
    const { resultado } = fila;
    const minimo = rango?.minimo;
    const maximo = rango?.maximo;
    const arriba = resultado != null && maximo != null && resultado > maximo ? resultado - maximo : 0;
    const abajo  = resultado != null && minimo != null && resultado < minimo ? minimo - resultado : 0;
    return { ...fila, rango, arriba, abajo };
  });

  // Primero las que se pasan, luego a las que les falta, luego las que cumplen y al final sin dato.
  const grupo = (f: (typeof conDistancia)[number]) => (f.resultado == null ? 3 : f.arriba ? 0 : f.abajo ? 1 : 2);
  const ordenadas = conDistancia
    .filter(f => !filtro || f.desempeno === filtro)
    .sort((a, b) => grupo(a) - grupo(b) || (b.arriba + b.abajo) - (a.arriba + a.abajo));
  const tope = Math.max(...conDistancia.map(f => Math.max(f.arriba, f.abajo)), 0) || 1;
  const ancho = (distancia: number) => `${(distancia / tope) * 100}%`;
  const umbral = perfil?.umbralDenominadorChico;
  const conTipo = grupoDeUnidad && Object.keys(grupoDeUnidad).length > 0;

  return (
    <div className="gi-comparar">
      <p className="gi-vista-ayuda">
        La meta de este indicador es un rango y cada unidad se mide contra el suyo{conTipo ? ' (el de su grupo)' : ''}.
        Al centro las que están dentro; a la derecha, cuánto se pasan del máximo; a la izquierda, cuánto les falta para el mínimo.
      </p>

      <div className="gi-rango-scroll">
        <div className={`gi-rango-encabezado${conTipo ? ' gi-rango--con-tipo' : ''}`} aria-hidden>
          <span>Unidad</span>
          {conTipo && <span>Tipo</span>}
          <span className="gi-derecha">◀ Abajo de su rango</span>
          <span className="gi-centro">Dentro</span>
          <span>Arriba de su rango ▶</span>
          <span className="gi-derecha">Resultado · su rango</span>
        </div>

        <ol className="gi-comparar-lista">
          {ordenadas.map(fila => {
            const estado = fila.desempeno === 'Gris' ? 'Sin dato' : fila.desempeno;
            const dentro = fila.desempeno === 'Esperado';
            const chico = umbral != null && fila.denominador != null && fila.denominador < umbral;
            return (
              <li key={fila.unidad}>
                <button
                  type="button"
                  className={`gi-rango-fila${conTipo ? ' gi-rango--con-tipo' : ''}`}
                  style={{ '--status': COLOR_SEMAFORO[fila.desempeno] }}
                  onClick={() => onVerUnidad(fila.unidad)}
                  title={`${fila.unidad}: ${formatoValor(fila.resultado, perfil?.unidadMedida)} (${estado}) · rango ${fila.rango?.texto ?? '—'}`}
                >
                  <span className="gi-comparar-unidad">{fila.unidad}</span>
                  {conTipo && <span className="gi-rango-tipo">{grupoDeUnidad?.[fila.unidad] ?? '—'}</span>}
                  <span className="gi-rango-lado gi-rango-lado--abajo">
                    {fila.abajo > 0 && <><small>−{formatoNumero(fila.abajo)}</small><span className="gi-rango-barra" style={{ width: ancho(fila.abajo) }} /></>}
                  </span>
                  <span className={`gi-rango-centro${dentro ? ' gi-rango-centro--dentro' : ''}${fila.resultado == null ? ' gi-rango-centro--sin-dato' : ''}`}>
                    {fila.resultado == null ? 'Sin dato' : dentro ? '✓ Dentro' : estado}
                  </span>
                  <span className="gi-rango-lado">
                    {fila.arriba > 0 && <><span className="gi-rango-barra" style={{ width: ancho(fila.arriba) }} /><small>+{formatoNumero(fila.arriba)}</small></>}
                  </span>
                  <span className="gi-comparar-valor">
                    {formatoValor(fila.resultado, perfil?.unidadMedida)}
                    <small>{fila.rango?.minimo != null ? `${formatoNumero(fila.rango.minimo)}–${formatoNumero(fila.rango.maximo)}` : ''}</small>
                    {chico && <small className="gi-aviso-chico" title={`Denominador de ${fila.denominador}: un solo caso mueve mucho el resultado`}>den. {fila.denominador}</small>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {!ordenadas.length && <p className="ige-vacio">Ninguna unidad en ese nivel este mes.</p>}

      <LeyendaSemaforo
        niveles={perfil?.niveles}
        conGris={filas.some(f => f.desempeno === 'Gris')}
        filtro={filtro}
        onFiltrar={setFiltro}
      />
    </div>
  );
};

export default CompararRango;
