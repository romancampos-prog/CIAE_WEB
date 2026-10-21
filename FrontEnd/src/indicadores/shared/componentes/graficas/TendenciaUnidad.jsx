// propios
import ListaUnidades from './ListaUnidades';
import DatosUnidad from './DatosUnidad';
import ColumnasTendencia from './ColumnasTendencia';
import LeyendaSemaforo from './LeyendaSemaforo';
import { datosDelMes, formatoValor, mesCorto, nombreUnidad, serieDeUnidad } from '../../utils/datosGrafica';

/**
 * Tendencia: todos los meses de UNA unidad (el estatal como punto de referencia). Si la meta
 * es un rango, se dibuja como franja detrás de cada barra.
 *
 * Props:
 *   reporte, perfil, meses, mesSel, mesParcial, semana, acumulado
 *   unidadSel, onElegirUnidad, onElegirMes
 *   brecha        — { sentido, casos } de la unidad en el mes, o null
 *   brechaAplica  — del resumen del mes
 *   grupoDeUnidad — de la ficha (IAAS 01) o null
 */
const TendenciaUnidad = ({
  reporte, perfil, meses, mesSel, mesParcial, semana, acumulado,
  unidadSel, onElegirUnidad, onElegirMes, brecha, brechaAplica, grupoDeUnidad,
}) => {
  const { filas, estatal } = datosDelMes(reporte, mesSel, acumulado);
  const serie = serieDeUnidad(reporte, meses, unidadSel, perfil, acumulado, mesParcial);
  const fila = serie.find(p => p.mes === mesSel);
  const esRango = perfil?.tipoMeta === 'rango';
  const cerrados = serie.filter(p => !p.parcial && p.resultado != null);

  const puntos = serie.map(p => {
    const estado = p.desempeno === 'Gris' ? 'sin dato' : p.desempeno;
    const extra = [p.meta && `Meta ${p.meta.texto}`, p.estatal != null && `Estatal ${formatoValor(p.estatal, perfil?.unidadMedida)}`]
      .filter(Boolean).join(' · ');
    return {
      ...p,
      clave: p.mes,
      etiqueta: p.parcial ? `${mesCorto(p.mes)} S${semana}` : mesCorto(p.mes),
      etiquetaLarga: p.parcial ? `${p.mes} (parcial · semana ${semana})` : p.mes,
      valorTexto: formatoValor(p.resultado, perfil?.unidadMedida),
      extra,
      titulo: `${p.mes}${p.parcial ? ' (parcial)' : ''}: ${formatoValor(p.resultado, perfil?.unidadMedida)} (${estado})${extra ? ` · ${extra}` : ''}`,
    };
  });

  return (
    <div className="gi-tendencia">
      <ListaUnidades filas={filas} estatal={estatal} unidadSel={unidadSel} grupoDeUnidad={grupoDeUnidad} onElegir={onElegirUnidad} />

      <div className="gi-tendencia-cuerpo">
        <p className="gi-vista-ayuda">
          Todos los meses de {nombreUnidad(unidadSel)}{acumulado ? ' (acumulado desde enero)' : ''}. Cada barra lleva el color de su semáforo;
          {esRango ? ' la franja es el rango de la meta' : ' la raya punteada es la meta de ese mes'} y el punto es el estatal. Da clic en un mes para elegirlo.
        </p>

        <DatosUnidad
          unidad={unidadSel}
          periodo={mesSel.toLowerCase()}
          fila={fila}
          estatal={estatal?.resultado ?? null}
          filas={filas}
          perfil={perfil}
          brecha={brecha}
          brechaAplica={brechaAplica && !acumulado}
          enEsperado={{ dentro: cerrados.filter(p => p.desempeno === 'Esperado').length, total: cerrados.length }}
        />

        <ColumnasTendencia puntos={puntos} activo={mesSel} onElegir={onElegirMes} />

        <LeyendaSemaforo niveles={perfil?.niveles} conGris={serie.some(p => p.resultado == null)}>
          {esRango
            ? <li><span className="gi-leyenda-rango" />Rango de la meta</li>
            : serie.some(p => p.meta?.valor != null) && <li><span className="gi-leyenda-meta" />Meta del mes</li>}
          {serie.some(p => p.estatal != null) && <li><span className="gi-leyenda-estatal" />Estatal</li>}
          {mesParcial && <li><span className="gi-leyenda-parcial" />{mesParcial} parcial (semana {semana})</li>}
        </LeyendaSemaforo>
      </div>
    </div>
  );
};

export default TendenciaUnidad;
