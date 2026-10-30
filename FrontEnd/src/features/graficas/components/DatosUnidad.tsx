// propios
import type { Franja, PerfilIndicador } from '@/types/api/indicadores/reportes';
import type { FilaUnidad } from '@/types/pantallas/graficas';
import { COLOR_SEMAFORO } from '@/features/graficas/constants/semaforo';
import {
  CLAVE_ESTATAL, formatoNumero, formatoValor, nombreUnidad, ordenarPorResultado, textoNivel,
} from '@/features/graficas/utils/datosGrafica';

interface Props {
  unidad: string;
  periodo: string;
  fila: FilaUnidad | undefined;
  filas: FilaUnidad[];
  perfil: PerfilIndicador | null;
  enEsperado: { dentro: number; total: number };
  /** Solo cuando la unidad tiene su propio semáforo (IAAS 01, por tipo de hospital). */
  franjasPropias: Franja[] | null;
}

/**
 * En el panel de al lado de la Tendencia, lo de la unidad elegida: su resultado con Num y Den,
 * su semáforo si es distinto al del OOAD, cuántos periodos lleva en Esperado y su lugar.
 *
 * Props:
 *   unidad         — unidad elegida
 *   periodo        — texto del mes o corte ("agosto", "corte de junio 2026")
 *   fila           — la unidad en el periodo (resultado, desempeño, num/den)
 *   filas          — todas las unidades del periodo (para el lugar)
 *   perfil         — perfil del backend
 *   enEsperado     — { dentro, total } meses (o cortes) en Esperado
 *   franjasPropias — semáforo de la unidad si va por tipo de hospital; null si es el del OOAD
 */
const DatosUnidad = ({ unidad, periodo, fila, filas, perfil, enEsperado, franjasPropias }: Props) => {
  const esEstatal = unidad === CLAVE_ESTATAL;
  const conDato = ordenarPorResultado(filas, perfil?.tipoMeta).filter(f => f.resultado != null);
  const lugar = conDato.findIndex(f => f.unidad === unidad) + 1;
  const mostrarLugar = !esEstatal && perfil?.tipoMeta && perfil.tipoMeta !== 'rango' && lugar > 0;
  const desempeno = fila?.desempeno ?? 'Gris';

  return (
    <section className="gi-panel-bloque gi-panel-bloque--estado" style={{ '--status': COLOR_SEMAFORO[desempeno] }}>
      <p className="gi-panel-titulo">{nombreUnidad(unidad)} · {periodo}</p>
      <p className="gi-panel-valor">
        {formatoValor(fila?.resultado, perfil?.unidadMedida)}
        <span className="ige-estado">
          <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[desempeno] }} />
          {desempeno === 'Gris' ? 'Sin dato' : desempeno}
        </span>
      </p>
      {fila?.numerador != null && fila.denominador != null && (
        <p className="gi-panel-numden">
          <span>Num <strong>{formatoNumero(fila.numerador, 0)}</strong></span>
          <span>Den <strong>{formatoNumero(fila.denominador, 0)}</strong></span>
        </p>
      )}

      {/* IAAS 01: el rango de su tipo de hospital, que no es el del OOAD */}
      {franjasPropias && franjasPropias.length > 0 && (
        <ul className="ige-rangos">
          {(perfil?.niveles ?? ['Esperado', 'Medio', 'Bajo']).map(n => (
            <li key={n} className={desempeno === n ? 'ige-rangos--actual' : ''}>
              <span className="ige-estado-punto" style={{ background: COLOR_SEMAFORO[n] }} />
              <span className="ige-rangos-nivel">{n}</span>
              <span className="ige-rangos-numeros">{textoNivel(franjasPropias, n)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="gi-panel-cifras">
        <span><strong>{enEsperado.dentro}</strong> de {enEsperado.total} periodos en Esperado</span>
        {mostrarLugar && <span><strong>{lugar}</strong> de {conDato.length} lugar entre las unidades</span>}
      </div>
    </section>
  );
};

export default DatosUnidad;
