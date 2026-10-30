// propios
import type { Desempeno, Franja, PerfilIndicador } from '@/types/api/indicadores/reportes';
import type { FilaUnidad } from '@/types/pantallas/graficas';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import { CLAVE_ESTATAL, textoNivel, formatoValor, nombreUnidad, ordenarPorResultado } from '@/features/graficas/utils/datosGrafica';

interface Props {
  unidad: string;
  periodo: string;
  fila: { resultado: number | null; desempeno: Desempeno } | undefined;
  filas: FilaUnidad[];
  perfil: PerfilIndicador | null;
  enEsperado: { dentro: number; total: number };
  /** El semáforo de ESTA unidad en el periodo (en IAAS 01 cambia por tipo de hospital). */
  franjas: Franja[];
}

/**
 * Datos rápidos de la unidad elegida en el periodo elegido: su resultado, su semáforo en
 * números, cuántos periodos lleva en Esperado y su lugar en el estado.
 *
 * Props:
 *   unidad       — unidad elegida
 *   periodo      — texto del mes o corte ("agosto", "corte de junio 2026")
 *   fila         — { resultado, desempeno } de la unidad en el periodo
 *   filas        — todas las unidades del periodo (para el lugar)
 *   perfil       — perfil del backend
 *   enEsperado   — { dentro, total } meses (o cortes) en Esperado
 *   franjas      — semáforo de la unidad en el periodo: sus rangos en números
 */
const DatosUnidad = ({ unidad, periodo, fila, filas, perfil, enEsperado, franjas }: Props) => {
  const esEstatal = unidad === CLAVE_ESTATAL;
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

      {franjas.length > 0 && (
        <div className="gi-dato">
          <p className="gi-dato-etiqueta">Su semáforo · {periodo}</p>
          <ul className="ige-rangos">
            {(perfil?.niveles ?? ['Esperado', 'Medio', 'Bajo']).map(n => (
              <li key={n} className={fila?.desempeno === n ? 'ige-rangos--actual' : ''}>
                <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[n] }} />
                <span className="ige-rangos-nivel">{n}</span>
                <span className="ige-rangos-numeros">{textoNivel(franjas, n)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="gi-dato">
        <p className="gi-dato-etiqueta">Periodos en Esperado</p>
        <p className="gi-dato-valor">{enEsperado.dentro}<small>de {enEsperado.total}</small></p>
      </div>

      {mostrarLugar && (
        <div className="gi-dato">
          <p className="gi-dato-etiqueta">Lugar entre las unidades</p>
          <p className="gi-dato-valor">{lugar}<small>de {conDato.length}</small></p>
        </div>
      )}
    </div>
  );
};

export default DatosUnidad;
