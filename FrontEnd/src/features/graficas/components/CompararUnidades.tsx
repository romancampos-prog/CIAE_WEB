// react
import { useState } from 'react';
// propios
import type { Desempeno, PerfilIndicador } from '@/types/api/indicadores/reportes';
import type { FilaUnidad } from '@/types/pantallas/graficas';
import FranjasSemaforo from './FranjasSemaforo';
import TooltipDato from './TooltipDato';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import {
  ETIQUETA_TOTAL, formatoNumero, formatoValor, franjasDe, limitesDe, ordenarPorResultado, techoDe, textoNivel,
} from '@/features/graficas/utils/datosGrafica';

interface Props {
  filas: FilaUnidad[];
  /** El Total OOAD del mes: va fijo arriba, sobre sus propias franjas. */
  estatal: FilaUnidad | null;
  perfil: PerfilIndicador | null;
  mes: string;
  /** { unidad: "HGS" | ... } cuando el semáforo va por grupo (IAAS 01): la lista se agrupa. */
  grupoDeUnidad?: Record<string, string> | null;
  /** Nivel elegido en el panel de al lado para ver solo esas unidades. */
  filtro: Desempeno | null;
  onVerUnidad: (unidad: string) => void;
}

const VISIBLES = 15;

/**
 * Todas las unidades del mes, cada una sobre las franjas de SU semáforo (las del mes, o las de
 * su grupo en IAAS 01): la barra (o el punto, si la meta es un rango) cae en verde, amarillo o
 * rojo y se lee sola. El Total OOAD va fijo arriba. Ordenadas de la mejor a la peor según el
 * tipo de meta del backend.
 */
const CompararUnidades = ({ filas, estatal, perfil, mes, grupoDeUnidad, filtro, onVerUnidad }: Props) => {
  const [verTodas, setVerTodas] = useState(false);

  const esRango = perfil?.tipoMeta === 'rango';
  const porGrupo = !!perfil?.franjasDeUnidad && !!grupoDeUnidad && Object.keys(grupoDeUnidad).length > 0;
  const filtradas = filtro ? filas.filter(f => f.desempeno === filtro) : filas;
  const ordenadas = ordenarPorResultado(filtradas, perfil?.tipoMeta);
  const visibles  = verTodas || porGrupo ? ordenadas : ordenadas.slice(0, VISIBLES);

  const todas = estatal ? [estatal, ...filas] : filas;
  const techo = techoDe([...todas.map(f => f.resultado), ...todas.flatMap(f => limitesDe(franjasDe(perfil, mes, f.unidad)))]);
  const porcentaje = (valor: number) => `${Math.min(100, (valor / techo) * 100)}%`;
  // Arriba de la lista, el número de cada corte del semáforo alineado con las franjas (si todas comparten semáforo)
  const cortes = porGrupo ? [] : [...new Set(limitesDe(perfil?.franjasPorMes?.[mes] ?? []))].filter(v => v > 0 && v < techo);
  const medida = perfil?.unidadMedida && perfil.unidadMedida !== '%' ? ` (${perfil.unidadMedida})` : '';

  // Por grupo (IAAS 01): un bloque por tipo de hospital, con el rango de su franja verde en el título
  const grupos = porGrupo
    ? [...new Set(visibles.map(f => grupoDeUnidad![f.unidad] ?? 'Otros'))].map(grupo => ({
        grupo,
        filas: visibles.filter(f => (grupoDeUnidad![f.unidad] ?? 'Otros') === grupo),
      }))
    : [{ grupo: null, filas: visibles }];

  const fila = (f: FilaUnidad, esTotal = false) => {
    const franjas = franjasDe(perfil, mes, f.unidad);
    const estado = f.desempeno === 'Gris' ? 'Sin dato' : f.desempeno;
    const nombre = esTotal ? ETIQUETA_TOTAL : f.unidad;
    return (
      <li key={f.unidad}>
        <button
          type="button"
          className={`gi-comparar-fila${esTotal ? ' gi-comparar-fila--total' : ''}`}
          style={{ '--status': COLOR_SEMAFORO[f.desempeno] }}
          onClick={() => onVerUnidad(f.unidad)}
          aria-label={`${nombre}: ${formatoValor(f.resultado, perfil?.unidadMedida)} (${estado})`}
        >
          <span className="gi-comparar-unidad">{nombre}</span>
          <span className="gi-barra-pista">
            <FranjasSemaforo franjas={franjas} techo={techo} orientacion="horizontal" conFondo={esRango} />
            {f.resultado != null && (esRango
              ? <span className="gi-barra-punto" style={{ left: porcentaje(f.resultado) }} />
              : <span className="gi-barra" style={{ width: porcentaje(f.resultado) }} />)}
            <TooltipDato
              titulo={nombre}
              valor={formatoValor(f.resultado, perfil?.unidadMedida)}
              desempeno={f.desempeno}
              numerador={f.numerador}
              denominador={f.denominador}
              extra={null}
            />
          </span>
          <span className="gi-comparar-valor">
            <strong>{formatoValor(f.resultado, perfil?.unidadMedida)}</strong>
            <small><span className="gi-punto" />{estado}</small>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="gi-comparar">
      <p className="gi-vista-ayuda">
        Unidades {perfil?.esCorte ? 'del corte' : 'de'} {mes.toLowerCase()}
        {perfil?.tipoMeta === 'menos' ? ', de menor a mayor (aquí menos es mejor)' : perfil?.tipoMeta === 'mas' ? ', de mayor a menor (aquí más es mejor)' : ''}.
        {' '}El fondo de cada fila son las franjas de su semáforo{porGrupo ? ' (cada tipo de hospital tiene las suyas)' : ''}. Da clic en una unidad para ver su tendencia.
      </p>

      <div className="gi-comparar-encabezado" aria-hidden>
        <span>Unidad</span>
        <span className="gi-comparar-cortes">
          {cortes.map(c => <span key={c} style={{ left: porcentaje(c) }}>{formatoNumero(c)}</span>)}
        </span>
        <span className="gi-derecha">Resultado{medida}</span>
      </div>

      {estatal && !filtro && <ol className="gi-comparar-lista gi-comparar-lista--total">{fila(estatal, true)}</ol>}

      {grupos.map(({ grupo, filas: delGrupo }) => (
        <section key={grupo ?? 'todas'} className="gi-comparar-grupo">
          {grupo && (
            <h4 className="gi-comparar-grupo-titulo">
              {grupo}
              <small>Esperado {textoNivel(franjasDe(perfil, mes, delGrupo[0].unidad), 'Esperado')}</small>
            </h4>
          )}
          <ol className="gi-comparar-lista">{delGrupo.map(f => fila(f))}</ol>
        </section>
      ))}

      {!porGrupo && ordenadas.length > VISIBLES && (
        <button type="button" className="ige-ver-todas" onClick={() => setVerTodas(v => !v)}>
          {verTodas ? 'Ver menos' : `Ver las ${ordenadas.length} unidades`}
        </button>
      )}
      {!ordenadas.length && <p className="ige-vacio">Ninguna unidad en ese nivel este mes.</p>}

    </div>
  );
};

export default CompararUnidades;
