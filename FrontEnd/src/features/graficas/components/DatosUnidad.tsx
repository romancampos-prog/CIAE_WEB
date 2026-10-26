// propios
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { CLAVE_ESTATAL, formatoNumero, formatoValor, nombreUnidad, ordenarPorResultado } from '@/features/graficas/utils/datosGrafica';
import type { BrechaUnidad, Desempeno, FilaUnidad, PerfilIndicador } from '@/features/graficas/tipos';

interface Props {
  unidad: string;
  periodo: string;
  fila: { resultado: number | null; desempeno: Desempeno } | undefined;
  estatal: number | null;
  filas: FilaUnidad[];
  perfil: PerfilIndicador | null;
  brecha: BrechaUnidad | null;
  brechaAplica: boolean | undefined;
  enEsperado: { dentro: number; total: number };
}

/**
 * Cuatro datos rápidos de la unidad elegida en el periodo elegido: su resultado, la
 * diferencia contra el estatal, la brecha a la meta (del backend) y su lugar en el estado.
 *
 * Props:
 *   unidad       — unidad elegida
 *   periodo      — texto del mes o corte ("agosto", "corte de junio 2026")
 *   fila         — { resultado, desempeno } de la unidad en el periodo
 *   estatal      — resultado estatal del periodo (o null)
 *   filas        — todas las unidades del periodo (para el lugar)
 *   perfil       — perfil del backend
 *   brecha       — { sentido, casos } de estadisticas.brechas para la unidad, o null
 *   brechaAplica — false cuando el backend no calcula brecha (rangos, sin fórmula)
 *   enEsperado   — { dentro, total } meses (o cortes) en Esperado
 */
const DatosUnidad = ({ unidad, periodo, fila, estatal, filas, perfil, brecha, brechaAplica, enEsperado }: Props) => {
  const esEstatal = unidad === CLAVE_ESTATAL;
  const diferencia = !esEstatal && fila?.resultado != null && estatal != null ? fila.resultado - estatal : null;
  const conDato = ordenarPorResultado(filas, perfil?.tipoMeta).filter(f => f.resultado != null);
  const lugar = conDato.findIndex(f => f.unidad === unidad) + 1;
  const mostrarLugar = !esEstatal && perfil?.tipoMeta && perfil.tipoMeta !== 'rango' && lugar > 0;

  return (
    <div className="gi-datos-unidad">
      <div className="gi-dato gi-dato--principal" style={{ '--status': COLOR_SEMAFORO[fila?.desempeno ?? 'Gris'] }}>
        <p className="gi-dato-etiqueta">{nombreUnidad(unidad)} · {periodo}</p>
        <p className="gi-dato-valor">
          {formatoValor(fila?.resultado, perfil?.unidadMedida)}
          <span className="ige-estado">
            <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[fila?.desempeno ?? 'Gris'] }} />
            {!fila || fila.desempeno === 'Gris' ? 'Sin dato' : fila.desempeno}
          </span>
        </p>
      </div>

      {!esEstatal && (
        <div className="gi-dato">
          <p className="gi-dato-etiqueta">Contra el estatal</p>
          <p className="gi-dato-valor">
            {diferencia == null ? '—' : `${diferencia > 0 ? '+' : ''}${formatoNumero(diferencia)}`}
            <small>{diferencia == null ? '' : diferencia > 0 ? 'arriba' : diferencia < 0 ? 'abajo' : 'igual'}</small>
          </p>
        </div>
      )}

      {brechaAplica && !esEstatal && (
        <div className="gi-dato">
          <p className="gi-dato-etiqueta">Para la meta</p>
          <p className="gi-dato-valor">
            {brecha ? formatoNumero(brecha.casos) : fila?.desempeno === 'Esperado' ? '✓' : '—'}
            <small>{brecha ? `casos ${brecha.sentido === 'faltan' ? 'que faltan' : 'de más'}` : fila?.desempeno === 'Esperado' ? 'ya está en Esperado' : ''}</small>
          </p>
        </div>
      )}

      <div className="gi-dato">
        <p className="gi-dato-etiqueta">Periodos en Esperado</p>
        <p className="gi-dato-valor">{enEsperado.dentro}<small>de {enEsperado.total}</small></p>
      </div>

      {mostrarLugar && (
        <div className="gi-dato">
          <p className="gi-dato-etiqueta">Lugar en el estado</p>
          <p className="gi-dato-valor">{lugar}<small>de {conDato.length}</small></p>
        </div>
      )}
    </div>
  );
};

export default DatosUnidad;
