// react
import { useState } from 'react';
// propios
import { IconoChevronDerecha, IconoChevronIzquierda } from '@/components/icons';
import { MESES_LARGOS_ARR } from '@/features/indicadores';

interface Props {
  /** aaaa-mm-dd; hasta vacío = falta elegir el final. */
  desde: string;
  hasta: string;
  /** Último día que se puede elegir (hoy). */
  max: string;
  onElegirDia: (fecha: string) => void;
}

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const iso = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

const mesDe = (fecha: string) => ({ anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) - 1 });

/**
 * Calendario de un mes para elegir un rango: el primer clic pone el inicio y el segundo el final
 * (mientras tanto, al pasar el mouse se ve cómo quedaría). Se mueve de mes con las flechas; si el
 * rango cambia desde afuera (atajos), salta al mes de su inicio.
 */
export default function CalendarioRango({ desde, hasta, max, onElegirDia }: Props) {
  const [visible, setVisible] = useState(() => mesDe(desde || max));
  const [desdeVisto, setDesdeVisto] = useState(desde);
  const [encima, setEncima] = useState<string | null>(null);

  // Ajuste durante el render (no en un efecto): un atajo cambió el inicio → mostrar ese mes
  if (desde !== desdeVisto) {
    setDesdeVisto(desde);
    if (desde) setVisible(mesDe(desde));
  }

  const { anio, mes } = visible;
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const huecos = (new Date(anio, mes, 1).getDay() + 6) % 7; // lunes primero
  const hayFinal = !!hasta;
  // Mientras falta el final, el rango se dibuja hasta el día bajo el mouse
  const finVisto = hasta || (encima && encima >= desde ? encima : desde);
  const siguienteBloqueado = (mes === 11 ? iso(anio + 1, 0, 1) : iso(anio, mes + 1, 1)) > max;

  const moverMes = (paso: number) =>
    setVisible(({ anio, mes }) => {
      const nuevo = mes + paso;
      return { anio: anio + Math.floor(nuevo / 12), mes: (nuevo + 12) % 12 };
    });

  return (
    <div className="acc-cal" onMouseLeave={() => setEncima(null)}>
      <div className="acc-cal-cabeza">
        <button type="button" className="acc-cal-flecha" onClick={() => moverMes(-1)} aria-label="Mes anterior">
          <IconoChevronIzquierda tamano={15} />
        </button>
        <span className="acc-cal-mes" aria-live="polite">{MESES_LARGOS_ARR[mes]} {anio}</span>
        <button type="button" className="acc-cal-flecha" onClick={() => moverMes(1)} disabled={siguienteBloqueado} aria-label="Mes siguiente">
          <IconoChevronDerecha tamano={15} />
        </button>
      </div>

      <div className="acc-cal-rejilla" role="grid" aria-label={`${MESES_LARGOS_ARR[mes]} ${anio}`}>
        {DIAS_SEMANA.map((d, i) => <span key={i} className="acc-cal-semana" aria-hidden="true">{d}</span>)}
        {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} />)}
        {Array.from({ length: diasDelMes }, (_, i) => {
          const fecha = iso(anio, mes, i + 1);
          const esInicio = fecha === desde;
          const esFin = fecha === finVisto && !!desde;
          const dentro = !!desde && fecha > desde && fecha < finVisto;
          const clases = [
            'acc-cal-dia',
            dentro && 'acc-cal-dia--dentro',
            (esInicio || esFin) && 'acc-cal-dia--punta',
            esInicio && 'acc-cal-dia--inicio',
            esFin && 'acc-cal-dia--fin',
            !hayFinal && !esInicio && (esFin || dentro) && 'acc-cal-dia--previa',
            fecha === max && 'acc-cal-dia--hoy',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={fecha}
              type="button"
              className={clases}
              disabled={fecha > max}
              aria-pressed={esInicio || (hayFinal && esFin)}
              onClick={() => onElegirDia(fecha)}
              onMouseEnter={() => setEncima(fecha)}
            >
              <span>{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
