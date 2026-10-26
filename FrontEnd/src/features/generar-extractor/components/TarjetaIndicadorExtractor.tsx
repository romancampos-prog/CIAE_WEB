// propios
import { MESES_LARGOS_ARR } from '@/features/indicadores';
import { explicacionPeriodo, numeroMes, tituloSinClave } from '@/features/generar-extractor/utils/textosExtractor';
import { AnilloProgreso, IconoDescarga } from './IconosExtractor';
import type { EstadoGenerarExtractor } from '@/features/generar-extractor/hooks/useGenerarExtractor';
import type { IndicadorExtractor } from '@/features/generar-extractor/tipos';

interface Props {
  ind: IndicadorExtractor;
  ex: EstadoGenerarExtractor;
}

/** Un indicador del Extractor: qué usa, y sus cortes (o sus meses) del año con la descarga de cada uno. */
const TarjetaIndicadorExtractor = ({ ind, ex }: Props) => {
  const { anio, descargando, descargar } = ex;
  const generados = MESES_LARGOS_ARR.filter(m => (ex.mesesGenerados[ind.indicador] ?? []).includes(numeroMes(m)));
  const ultimo = generados[generados.length - 1];
  // El denominador solo se muestra si no sale del mismo archivo (ej. EH 03: población PAMF).
  const denominadorAparte = !ind.archivos.some(a => a.archivo === ind.denominador);

  return (
    <article className="exv-ind">
      <header className="exv-ind-header">
        <div className="exv-ind-icono">{ind.icono && <img src={ind.icono} alt="" />}</div>
        <div className="exv-ind-id">
          <span className="exv-ind-clave">{ind.indicador}</span>
          <span className={`exv-tag exv-tag--${ind.tipo === 'corte' ? 'semestral' : 'mensual'}`}>{ind.periodicidad}</span>
        </div>
      </header>

      <p className="exv-ind-titulo" title={ind.titulo}>{tituloSinClave(ind.titulo)}</p>

      <dl className="exv-ind-datos">
        <div>
          <dt>Archivo</dt>
          <dd>
            {ind.archivos.map(a => (
              <span key={a.archivo} className={`exv-archivo-chip${a.requerido ? '' : ' exv-archivo-chip--opcional'}`}
                title={a.uso}>
                {a.archivo}{!a.requerido && ' · opcional'}
              </span>
            ))}
          </dd>
        </div>
        {denominadorAparte && <div><dt>Denominador</dt><dd>{ind.denominador}</dd></div>}
        <div><dt>Agrupa</dt><dd>{ind.agrupacion}</dd></div>
        {ind.descripcionPeriodicidad && <div><dt>Periodo</dt><dd>{explicacionPeriodo(ind.descripcionPeriodicidad)}</dd></div>}
      </dl>

      <div className="exv-ind-estado">
      {ind.tipo === 'corte' && (
        <div className="exv-cortes">
          {ex.cortesDelAnio.length === 0 && <p className="ex-cargando">Sin cortes para {anio}.</p>}
          {ex.cortesDelAnio.map(([clave, info]) => {
            const claveBoton = `${ind.indicador}-${clave}`;
            return (
              <div key={clave} className="exv-corte">
                <AnilloProgreso subidos={info.mesesSubidos} total={info.mesesTotales} />
                <div className="exv-corte-info">
                  <p className="exv-corte-titulo">Corte {clave}</p>
                  <span className={`ex-badge ex-badge--${info.corteYaGenerado ? 'completo' : info.mesesSubidos ? 'progreso' : 'vacio'} exv-badge`}>
                    {info.corteYaGenerado ? 'Generado' : info.mesesSubidos ? `Faltan ${info.mesesTotales - info.mesesSubidos} meses` : 'Sin iniciar'}
                  </span>
                </div>
                {info.corteYaGenerado && (
                  <button className="exv-boton-excel" onClick={() => descargar(claveBoton, [ind.indicador], info.anioCorte, info.mesCorte)}
                    disabled={descargando === claveBoton}>
                    <IconoDescarga /> {descargando === claveBoton ? 'Descargando…' : 'Excel'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {ind.tipo === 'mensual' && (
        <div className="exv-mensual-bloque">
          <div className="exv-mensual-header">
            <p className="exv-corte-titulo">
              {generados.length
                ? `${generados.length} ${generados.length === 1 ? 'mes generado' : 'meses generados'} de ${anio}`
                : `Sin meses generados en ${anio}: sube ${ind.archivos.filter(a => a.requerido).map(a => a.archivo).join(' y ') || 'el archivo'}`}
            </p>
            {ultimo && (
              <button className="exv-boton-excel" onClick={() => descargar(`${ind.indicador}-${ultimo}`, [ind.indicador], anio, ultimo)}
                disabled={descargando === `${ind.indicador}-${ultimo}`}>
                <IconoDescarga /> {descargando === `${ind.indicador}-${ultimo}` ? 'Descargando…' : `Excel ${ultimo}`}
              </button>
            )}
          </div>
          <div className="exv-mensual">
            {MESES_LARGOS_ARR.filter(m => !ex.esFuturo(m)).map(mes => {
              const clave = `${ind.indicador}-${mes}`;
              return generados.includes(mes) ? (
                <button key={mes} className="exv-mensual-mes exv-mensual-mes--ok" title={`Descargar ${mes} ${anio}`}
                  onClick={() => descargar(clave, [ind.indicador], anio, mes)} disabled={descargando === clave}>
                  {descargando === clave ? '…' : mes.slice(0, 3)}
                </button>
              ) : (
                <span key={mes} className="exv-mensual-mes" title={`Sube el ${ind.archivos[0]?.archivo ?? 'archivo'} de este mes para generarlo`}>{mes.slice(0, 3)}</span>
              );
            })}
          </div>
          {generados.length > 0 && <p className="exv-nota-mes">Da clic en un mes para descargar su Excel.</p>}
        </div>
      )}
      </div>
    </article>
  );
};

export default TarjetaIndicadorExtractor;
