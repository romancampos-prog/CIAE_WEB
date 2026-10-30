// propios
import type { PerfilIndicador, ReporteIndicador } from '@/types/api/indicadores/reportes';
import type { PuntoColumna } from '@/types/pantallas/graficas';
import ListaUnidades from './ListaUnidades';
import DatosUnidad from './DatosUnidad';
import ColumnasTendencia from './ColumnasTendencia';
import LeyendaSemaforo from './LeyendaSemaforo';
import { datosDelMes, franjasDe, formatoValor, mesCorto, nombreUnidad, techoDe, textoMeta } from '@/features/graficas/utils/datosGrafica';

interface Props {
  reporte: ReporteIndicador | null;
  perfil: PerfilIndicador | null;
  mesSel: string;
  anio: string;
  unidadSel: string;
  onElegirUnidad: (unidad: string) => void;
}

/**
 * Tendencia de un indicador por CORTE (EH 03, DM 04): los cortes cerrados de UNA unidad y,
 * abajo, los casos crudos de cada mes que los forman (perfil.serieCortes del backend).
 *
 * Props:
 *   reporte, perfil, mesSel, anio
 *   unidadSel, onElegirUnidad
 */
const TendenciaCorte = ({ reporte, perfil, mesSel, anio, unidadSel, onElegirUnidad }: Props) => {
  const { filas, estatal } = datosDelMes(reporte, mesSel, false);
  const cortes = perfil?.serieCortes?.cortes ?? [];
  const casosPorMes = perfil?.serieCortes?.casosPorMes ?? [];
  const corteActivo = `${mesSel}-${anio}`;

  const puntos = cortes.map((corte): PuntoColumna => {
    const dato = corte.unidades[unidadSel];
    const estado = !dato || dato.desempeno === 'Gris' ? 'sin dato' : dato.desempeno;
    const meta = perfil?.metaPorMes?.[corte.mes] ?? null;
    return {
      clave: `${corte.mes}-${corte.anio}`,
      etiqueta: `${mesCorto(corte.mes)} ${corte.anio}`,
      etiquetaLarga: `Corte de ${corte.mes.toLowerCase()} ${corte.anio}`,
      valorTexto: formatoValor(dato?.resultado, perfil?.unidadMedida),
      extra: meta ? `Meta ${textoMeta(meta)}` : '',
      resultado: dato?.resultado ?? null,
      desempeno: dato?.desempeno ?? 'Gris',
      numerador: dato?.numerador ?? null,
      denominador: dato?.denominador ?? null,
      meta,
      franjas: franjasDe(perfil, corte.mes, unidadSel),
      estatal: null,
      titulo: `Corte ${corte.mes.toLowerCase()} ${corte.anio}: ${formatoValor(dato?.resultado, perfil?.unidadMedida)} (${estado})`
        + `${meta ? ` · meta ${textoMeta(meta)}` : ''}`,
    };
  });

  const casos = casosPorMes.map(m => ({ ...m, n: m.unidades[unidadSel] ?? null }));
  const techoCasos = techoDe(casos.map(m => m.n));
  const enCurso = casos.filter(m => m.enCurso).length;
  const fila = puntos.find(p => p.clave === corteActivo);
  const conDato = puntos.filter(p => p.resultado != null);

  return (
    <div className="gi-tendencia">
      <ListaUnidades filas={filas} estatal={estatal} unidadSel={unidadSel} onElegir={onElegirUnidad} />

      <div className="gi-tendencia-cuerpo">
        <p className="gi-vista-ayuda">
          Los cortes de {nombreUnidad(unidadSel)} y, abajo, los casos de cada mes que los forman.
          El fondo son las franjas del semáforo de cada corte.
        </p>

        <DatosUnidad
          unidad={unidadSel}
          periodo={`corte de ${mesSel.toLowerCase()} ${anio}`}
          fila={fila}
          filas={filas}
          perfil={perfil}
          enEsperado={{ dentro: conDato.filter(p => p.desempeno === 'Esperado').length, total: conDato.length }}
          franjas={franjasDe(perfil, mesSel, unidadSel)}
        />

        <h3 className="gi-subtitulo">Sus cortes</h3>
        {puntos.length ? <ColumnasTendencia puntos={puntos} activo={corteActivo} comoPuntos={perfil?.tipoMeta === 'rango'} etiquetaNumerador={perfil?.etiquetaNumerador} etiquetaDenominador={perfil?.etiquetaDenominador} /> : <p className="ige-vacio">Todavía no hay cortes cerrados.</p>}
        <LeyendaSemaforo niveles={perfil?.niveles} conGris={puntos.some(p => p.resultado == null)} franjas={franjasDe(perfil, mesSel, unidadSel)} />

        <h3 className="gi-subtitulo">Casos por mes</h3>
        <p className="gi-vista-ayuda">
          Numerador de cada mes, antes de calcular el corte.
          {enCurso > 0 && ` ${enCurso} de 12 meses ya cuentan para el siguiente corte.`}
        </p>
        <div className="gi-casos" style={{ '--n': casos.length }}>
          {casos.map(m => (
            <div
              key={`${m.mes}-${m.anio}`}
              className={`gi-casos-columna${m.enCurso ? ' gi-casos-columna--en-curso' : ''}`}
              title={`${m.mes} ${m.anio}: ${m.n ?? 'sin dato'} casos${m.enCurso ? ' (siguiente corte)' : ''}`}
            >
              <span className="gi-casos-cuerpo">
                <span className="gi-casos-barra" style={{ height: `${((m.n ?? 0) / techoCasos) * 100}%` }}>
                  <span className="gi-columna-valor">{m.n ?? '—'}</span>
                </span>
              </span>
              <span className="gi-columna-etiqueta">{mesCorto(m.mes)} <small>{String(m.anio).slice(2)}</small></span>
            </div>
          ))}
        </div>
        <ul className="gi-leyenda">
          {enCurso < casos.length && <li><span className="gi-leyenda-casos" />Forman el último corte</li>}
          {enCurso > 0 && <li><span className="gi-leyenda-casos gi-leyenda-casos--en-curso" />Cuentan para el siguiente corte</li>}
        </ul>
      </div>
    </div>
  );
};

export default TendenciaCorte;
