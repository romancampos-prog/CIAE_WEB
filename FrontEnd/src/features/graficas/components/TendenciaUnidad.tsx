// propios
import type { PerfilIndicador, ReporteIndicador } from '@/types/api/indicadores/reportes';
import type { PuntoColumna } from '@/types/pantallas/graficas';
import ListaUnidades from './ListaUnidades';
import DatosUnidad from './DatosUnidad';
import ColumnasTendencia from './ColumnasTendencia';
import LeyendaSemaforo from './LeyendaSemaforo';
import { datosDelMes, franjasDe, formatoValor, mesCorto, nombreUnidad, serieDeUnidad, textoMeta } from '@/features/graficas/utils/datosGrafica';

interface Props {
  reporte: ReporteIndicador | null;
  perfil: PerfilIndicador | null;
  meses: string[];
  mesSel: string;
  mesParcial: string | null;
  semana: number | undefined;
  acumulado: boolean;
  unidadSel: string;
  onElegirUnidad: (unidad: string) => void;
  onElegirMes: (mes: string) => void;
  grupoDeUnidad?: Record<string, string> | null;
}

/**
 * Tendencia: todos los meses de UNA unidad contra su meta. Si la meta
 * es un rango, cada mes va como punto en vez de barra. Todo sobre las franjas del semáforo.
 *
 * Props:
 *   reporte, perfil, meses, mesSel, mesParcial, semana, acumulado
 *   unidadSel, onElegirUnidad, onElegirMes
 *   grupoDeUnidad — de la ficha (IAAS 01) o null
 */
const TendenciaUnidad = ({
  reporte, perfil, meses, mesSel, mesParcial, semana, acumulado,
  unidadSel, onElegirUnidad, onElegirMes, grupoDeUnidad,
}: Props) => {
  const { filas, estatal } = datosDelMes(reporte, mesSel, acumulado);
  const serie = serieDeUnidad(reporte, meses, unidadSel, perfil, acumulado, mesParcial);
  const fila = serie.find(p => p.mes === mesSel);
  const esRango = perfil?.tipoMeta === 'rango';
  const cerrados = serie.filter(p => !p.parcial && p.resultado != null);

  const puntos = serie.map((p): PuntoColumna => {
    const estado = p.desempeno === 'Gris' ? 'sin dato' : p.desempeno;
    const extra = p.meta ? `Meta ${textoMeta(p.meta)}` : '';
    return {
      ...p,
      // Sin el punto del Total OOAD: la tendencia es solo de la unidad contra su meta
      estatal: null,
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
          Todos los meses de {nombreUnidad(unidadSel)}{acumulado ? ' (acumulado desde enero)' : ''}. Cada {esRango ? 'punto' : 'barra'} lleva el color de su semáforo
          y el fondo son las franjas del semáforo de cada mes. Da clic en un mes para elegirlo.
        </p>

        <DatosUnidad
          unidad={unidadSel}
          periodo={mesSel.toLowerCase()}
          fila={fila}
          filas={filas}
          perfil={perfil}
          enEsperado={{ dentro: cerrados.filter(p => p.desempeno === 'Esperado').length, total: cerrados.length }}
          franjas={franjasDe(perfil, mesSel, unidadSel)}
        />

        <ColumnasTendencia puntos={puntos} activo={mesSel} comoPuntos={esRango} etiquetaNumerador={perfil?.etiquetaNumerador} etiquetaDenominador={perfil?.etiquetaDenominador} onElegir={onElegirMes} />

        <LeyendaSemaforo niveles={perfil?.niveles} conGris={serie.some(p => p.resultado == null)} franjas={franjasDe(perfil, mesSel, unidadSel)} />
      </div>
    </div>
  );
};

export default TendenciaUnidad;
