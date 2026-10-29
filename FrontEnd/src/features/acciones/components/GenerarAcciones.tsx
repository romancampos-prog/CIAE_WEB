// propios
import type { useGenerarAcciones } from '@/features/acciones/hooks/useGenerarAcciones';
import { IconoPalomita, IconoRecargar, IconoReloj, IconoSubirNube } from '@/components/icons';

interface Props {
  generacion: ReturnType<typeof useGenerarAcciones>;
}

/** Solo admin: extraer del FTP el previo (semana del mes) o el definitivo de un mes, con los mismos campos que FTP. */
export default function GenerarAcciones({ generacion: g }: Props) {
  return (
    <section className="acc-tarjeta">
      <h2 className="acc-tarjeta-titulo"><IconoSubirNube tamano={16} /> Generar reporte</h2>
      <p className="acc-tarjeta-nota">Baja el OC30 de cada unidad del FTP y lo guarda.</p>

      <div className="acc-segmentado" role="tablist">
        <button role="tab" aria-selected={g.tipo === 'previo'} className={`acc-segmento${g.tipo === 'previo' ? ' acc-segmento--activo' : ''}`} onClick={() => g.setTipo('previo')}>
          <IconoReloj tamano={12} strokeWidth="2" /> Previo
        </button>
        <button role="tab" aria-selected={g.tipo === 'final'} className={`acc-segmento${g.tipo === 'final' ? ' acc-segmento--activo' : ''}`} onClick={() => g.setTipo('final')}>
          <IconoPalomita tamano={12} strokeWidth="2" /> Definitivo
        </button>
      </div>

      <div className="acc-generar-campos">
        <label className="acc-campo">
          Año
          <select className="acc-control" value={g.anio} onChange={e => g.setAnio(Number(e.target.value))}>
            {g.anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        <label className="acc-campo">
          Mes
          <select className="acc-control" value={g.mes} onChange={e => g.setMes(e.target.value)}>
            <option value="">Seleccionar…</option>
            {g.meses.map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
          </select>
        </label>

        {g.tipo === 'previo' && (
          <label className="acc-campo acc-campo--ancho">
            Semana
            <select className="acc-control" value={g.semana} onChange={e => g.setSemana(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>Semana {s}</option>)}
            </select>
          </label>
        )}
      </div>

      <button className={`acc-boton${g.generando ? ' acc-boton--trabajando' : ''}`} onClick={g.generar} disabled={!g.puedeGenerar}>
        <IconoRecargar tamano={14} /> {g.generando ? 'Extrayendo… (tarda unos minutos)' : 'Extraer del FTP'}
      </button>

      {g.error && <p className="acc-mensaje acc-mensaje--error">{g.error}</p>}
      {g.resultado && (
        <p className="acc-mensaje acc-mensaje--ok">
          Listo ({g.resultado.semana === null ? 'definitivo' : `previo semana ${g.resultado.semana}`}):
          {' '}{g.resultado.mensaje}
        </p>
      )}
    </section>
  );
}
