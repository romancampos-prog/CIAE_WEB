// propios
import type { PerfilIndicador, ReporteIndicador } from '@/types/api/indicadores/reportes';
import type { PuntoColumna } from '@/types/pantallas/graficas';
import ListaUnidades from './ListaUnidades';
import ColumnasTendencia from './ColumnasTendencia';
import { datosDelMes, formatoValor, mesCorto, nombreUnidad, serieDeUnidad, textoMeta } from '@/features/graficas/utils/datosGrafica';

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
  const esRango = perfil?.tipoMeta === 'rango';

  const puntos = serie.map((p): PuntoColumna => {
    const estado = p.desempeno === 'Gris' ? 'sin dato' : p.desempeno;
    const extra = p.meta ? `Meta ${textoMeta(p.meta)}` : '';
    return {
      ...p,
      // Sin el punto del Total OOAD: la tendencia es solo de la unidad contra su meta
      estatal: null,
      clave: p.mes,
      etiqueta: p.parcial ? `${mesCorto(p.mes)} S${semana}` : mesCorto(p.mes),
      etiquetaLarga: p.parcial ? `${p.mes} · Semana ${semana}` : p.mes,
      valorTexto: formatoValor(p.resultado, perfil?.unidadMedida),
      extra,
      titulo: `${p.mes}${p.parcial ? ` · Semana ${semana}` : ''}: ${formatoValor(p.resultado, perfil?.unidadMedida)} (${estado})${extra ? ` · ${extra}` : ''}`,
    };
  });

  return (
    <div className="gi-tendencia">
      <ListaUnidades filas={filas} estatal={estatal} unidadSel={unidadSel} tipoMeta={perfil?.tipoMeta} grupoDeUnidad={grupoDeUnidad} onElegir={onElegirUnidad} />

      <div className="gi-tendencia-cuerpo">
        <p className="gi-vista-ayuda">
          Todos los meses de {nombreUnidad(unidadSel)}{acumulado ? ' (acumulado desde enero)' : ''}. Cada {esRango ? 'punto' : 'barra'} lleva el color de su semáforo
          y el fondo son las franjas del semáforo de cada mes. Da clic en un mes para elegirlo.
        </p>

        <ColumnasTendencia puntos={puntos} activo={mesSel} comoPuntos={esRango} onElegir={onElegirMes} />

      </div>
    </div>
  );
};

export default TendenciaUnidad;
