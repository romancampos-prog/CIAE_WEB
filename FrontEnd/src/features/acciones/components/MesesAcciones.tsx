// react
import { useEffect, useRef, useState } from 'react';
// propios
import type { PeriodoExtraccion } from '@/types/api/epidemiologia/ftp';
import { IconoChevronAbajo, IconoChevronDerecha, IconoChevronIzquierda, IconoPalomita, IconoReloj } from '@/components/icons';
import { MESES_LARGOS_ARR } from '@/features/indicadores';
import { mesesHastaHoy } from '@/features/acciones/utils/meses';

interface Props {
  anios: number[];
  anio: number;
  onAnio: (anio: number) => void;
  /** Los meses con reporte guardado (del backend). */
  periodos: PeriodoExtraccion[];
  mes: number | null;
  onMes: (mes: number) => void;
  /** Solo admin: elegir un mes sin reporte ofrece generarlo. Sin esto, esos meses no se pueden elegir. */
  onMesSinReporte?: (mes: number) => void;
  /** Solo admin: actualizar el mes que se está viendo (ej. pasar de previo a definitivo). */
  onGenerar?: () => void;
}

const estadoDe = (periodo: PeriodoExtraccion | undefined) =>
  !periodo ? 'Sin reporte' : periodo.definitivo ? 'Definitivo' : `Previo · semana ${periodo.ultimaSemana}`;

/**
 * El mes que se ve, como título de la página: al tocarlo despliega el calendario (año con flechas
 * arriba, meses abajo, opacos los que no tienen reporte). Mostrar el mes y cambiarlo es el mismo
 * control; el año va con flechas para que los años nuevos entren solos.
 */
export default function MesesAcciones({ anios, anio, onAnio, periodos, mes, onMes, onMesSinReporte, onGenerar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra con clic afuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const alClicAfuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', alClicAfuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicAfuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  const actual = periodos.find(p => p.mes === mes);

  const elegir = (numero: number) => {
    setAbierto(false);
    if (periodos.some(p => p.mes === numero)) onMes(numero);
    else onMesSinReporte?.(numero);
  };

  return (
    <div className="acc-periodo">
      <div className="acc-mes-selector" ref={caja}>
        <button
          type="button"
          className={`acc-mes-disparador${abierto ? ' acc-mes-disparador--abierto' : ''}`}
          onClick={() => setAbierto(a => !a)}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-label={`Cambiar mes. Ahora: ${actual ? `${MESES_LARGOS_ARR[actual.mes - 1]} ${anio}, ${estadoDe(actual)}` : `sin reportes en ${anio}`}`}
        >
          <span className="acc-mes-disparador-texto">
            {actual ? `${MESES_LARGOS_ARR[actual.mes - 1]} ${anio}` : `Sin reportes en ${anio}`}
          </span>
          <span className="acc-mes-disparador-flecha" aria-hidden="true"><IconoChevronAbajo tamano={16} /></span>
          {actual && (
            <span className={`acc-estado${actual.definitivo ? '' : ' acc-estado--previo'}`}>
              {actual.definitivo ? <IconoPalomita tamano={12} strokeWidth="2" aria-hidden /> : <IconoReloj tamano={12} strokeWidth="2" aria-hidden />}
              {estadoDe(actual)}
            </span>
          )}
        </button>

        {abierto && (
          <div className="acc-mes-panel" role="dialog" aria-label={`Meses de ${anio}`}>
            <div className="acc-mes-panel-anio">
              <button type="button" className="acc-mes-panel-flecha" onClick={() => onAnio(anio - 1)} disabled={anio <= anios[0]} aria-label="Año anterior">
                <IconoChevronIzquierda tamano={16} />
              </button>
              <span aria-live="polite">{anio}</span>
              <button type="button" className="acc-mes-panel-flecha" onClick={() => onAnio(anio + 1)} disabled={anio >= anios[anios.length - 1]} aria-label="Año siguiente">
                <IconoChevronDerecha tamano={16} />
              </button>
            </div>
            <div className="acc-mes-rejilla">
              {mesesHastaHoy(anio).map(numero => {
                const periodo = periodos.find(p => p.mes === numero);
                const nombre = MESES_LARGOS_ARR[numero - 1];
                const activo = numero === mes;
                return (
                  <button
                    key={numero}
                    type="button"
                    className={`acc-mes-celda${activo ? ' acc-mes-celda--activa' : ''}${periodo ? '' : ' acc-mes-celda--sin'}`}
                    disabled={!periodo && !onMesSinReporte}
                    aria-pressed={activo}
                    aria-label={`${nombre}, ${estadoDe(periodo)}`}
                    onClick={() => elegir(numero)}
                  >
                    <span className="acc-mes-celda-nombre">
                      {periodo && <span className={`acc-mes-punto${periodo.definitivo ? '' : ' acc-mes-punto--previo'}`} aria-hidden="true" />}
                      {nombre}
                    </span>
                    <span className="acc-mes-celda-estado">{estadoDe(periodo)}</span>
                  </button>
                );
              })}
            </div>
            <p className="acc-meses-leyenda" aria-hidden="true">
              <span><span className="acc-mes-punto" /> Definitivo</span>
              <span><span className="acc-mes-punto acc-mes-punto--previo" /> Previo</span>
              <span>Opaco = sin reporte{onMesSinReporte ? ' (tócalo para generarlo)' : ''}</span>
            </p>
            {onGenerar && (
              <button type="button" className="acc-mes-panel-enlace" onClick={() => { setAbierto(false); onGenerar(); }}>
                Actualizar este mes (previo o definitivo)
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
