// react
import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
// propios
import type { ErrorExtraccion, Restricciones } from '@/types/api/indicadores/ftp';
import type { CasoError, GrupoCasos } from '@/types/pantallas/generarFtp';
import { IconoAlerta, IconoArchivo, IconoBuscar, IconoCapas, IconoCarpeta, IconoCerrar, IconoCopiar, IconoDocumento, IconoError, IconoInfo, IconoListaBarras, IconoPalomita } from '@/components/icons';
import { SEVERIDAD, agruparCasos, agruparPorOrigen, diferenciaDeNombres, parteComunDeRutas, partirRutaError } from '@/features/generar-ftp/utils/restricciones';
import './ventanaErrores.css';

interface Props {
  restricciones: Restricciones;
  /** Qué se generó, ej. "CE · Noviembre 2026 · Previo, semana 2". */
  subtitulo: string;
  /** Color de la familia, para el borde de la ventana. */
  color: string;
  onClose: () => void;
}

interface PropsNombreResaltado {
  antes: string;
  medio: string;
  despues: string;
  tono: 'bien' | 'mal' | 'parecida';
}

const ICONO_TIPO: Record<string, ReactNode> = {
  RUTA_INVALIDA:          <IconoCarpeta tamano={16} />,
  ARCHIVO_NO_ENCONTRADO:  <IconoArchivo tamano={16} />,
  ARCHIVO_DUPLICADO:      <IconoArchivo tamano={16} />,
  HOJA_NO_ENCONTRADA:     <IconoDocumento tamano={16} />,
  ETIQUETA_NO_ENCONTRADA: <IconoListaBarras tamano={16} />,
  SERVICIO_NO_APLICA:     <IconoInfo tamano={16} />,
};

// Cómo se lee el reporte en cada renglón, según el problema (por defecto "Reporte")
const PREFIJO_REPORTE: Record<string, string> = {
  ARCHIVO_NO_ENCONTRADO: 'Falta',
  ARCHIVO_DUPLICADO:     'Duplicado',
};

// Con menos casos que estos el buscador sobra: se ven todos de un vistazo
const CASOS_PARA_BUSCAR = 7;

const plural = (n: number, palabra: string) => `${n} ${palabra}${n !== 1 ? (palabra.endsWith('d') ? 'es' : 's') : ''}`;

/** El nombre de la carpeta con la parte distinta marcada; si ahí no hay nada, un hueco punteado. */
const NombreResaltado = ({ antes, medio, despues, tono }: PropsNombreResaltado) => (
  <code className="vef-nombre">
    {antes}
    {medio
      ? <span className={`vef-distinto vef-distinto--${tono}`}>{medio}</span>
      : <span className={`vef-hueco vef-hueco--${tono}`} aria-label="Aquí falta un carácter" />}
    {despues}
  </code>
);

/** Copia la ruta; el portapapeles puede no estar disponible (sitio sin HTTPS). */
const BotonCopiar = ({ texto, etiqueta }: { texto: string; etiqueta: string }) => {
  const [resultado, setResultado] = useState<'copiada' | 'fallo' | null>(null);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setResultado('copiada');
    } catch {
      setResultado('fallo');
    }
    setTimeout(() => setResultado(null), 1800);
  };

  return (
    <button type="button" className="vef-copiar" onClick={copiar}>
      {resultado === 'copiada' ? <IconoPalomita tamano={12} strokeWidth="3" /> : <IconoCopiar tamano={13} />}
      {resultado === 'copiada' ? 'Copiada' : resultado === 'fallo' ? 'No se pudo' : etiqueta}
    </button>
  );
};

/** La ruta en una línea que solo se parte en las diagonales; lo que sigue de la carpeta aún no se revisó. */
const RutaCompleta = ({ ruta, segmento }: { ruta: string; segmento: string }) => {
  const trozos = ruta.split('/');
  const posicion = trozos.indexOf(segmento);
  const claseDe = (i: number) => (posicion < 0 ? undefined : i === posicion ? 'vef-ruta-carpeta' : i > posicion ? 'vef-ruta-resto' : undefined);

  return (
    <code className="vef-ruta">
      {trozos.map((trozo, i) => (
        <Fragment key={i}>
          <span className={claseDe(i)}>{trozo}</span>
          {i < trozos.length - 1 && <span className={claseDe(i + 1) === 'vef-ruta-resto' ? 'vef-ruta-resto' : undefined}>/<wbr /></span>}
        </Fragment>
      ))}
    </code>
  );
};

const Chips = ({ reportes, indicadores }: Pick<CasoError, 'reportes' | 'indicadores'>) => (
  <div className="vef-chips">
    {reportes.length > 0 && <span className="vef-reporte">Reporte {reportes.map(r => <strong key={r}>{r}</strong>)}</span>}
    {indicadores.length > 0 && <span className="vef-chip">Afecta a {indicadores.join(', ')}</span>}
  </div>
);

/** Una carpeta mal nombrada: lo que debe ser contra lo que hay en el FTP. */
const TarjetaRuta = ({ caso }: { caso: CasoError }) => {
  const partes = partirRutaError(caso.ruta);
  if (!partes) return null;
  const diferencia = partes.carpetaEncontrada != null ? diferenciaDeNombres(partes.segmento, partes.carpetaEncontrada) : null;
  const tono = partes.esLaMisma ? 'mal' : 'parecida';

  return (
    <article className="vef-caso">
      <div className="vef-caso-encabezado">
        <span className="vef-tarjeta-icono" aria-hidden="true"><IconoCapas tamano={15} /></span>
        <div className="vef-caso-titulo">
          <h4>{caso.unidad}</h4>
          <Chips reportes={caso.reportes} indicadores={caso.indicadores} />
        </div>
        <BotonCopiar texto={partes.ruta} etiqueta="Copiar ruta correcta" />
      </div>

      <p className="vef-explicacion">{partes.diagnostico}</p>
      <div className="vef-comparacion">
        <span className="vef-rotulo vef-rotulo--bien"><IconoPalomita tamano={13} strokeWidth="3" /> Debe llamarse</span>
        <NombreResaltado
          antes={diferencia?.antes ?? partes.segmento}
          medio={diferencia?.medioCorrecto ?? ''}
          despues={diferencia?.despues ?? ''}
          tono="bien"
        />
        {diferencia && (
          <>
            <span className={`vef-rotulo vef-rotulo--${tono}`}>
              {partes.esLaMisma ? <><IconoCerrar tamano={12} /> Está en el FTP</> : <><IconoAlerta tamano={13} /> Lo más parecido en el FTP</>}
            </span>
            <NombreResaltado antes={diferencia.antes} medio={diferencia.medioOtro} despues={diferencia.despues} tono={tono} />
          </>
        )}
      </div>
      <div>
        <p className="vef-etiqueta">Ruta completa correcta</p>
        <RutaCompleta ruta={partes.ruta} segmento={partes.segmento} />
      </div>
    </article>
  );
};

/** Una ruta que solo se parte en las diagonales. */
const ConCortes = ({ texto }: { texto: string }) => (
  <>
    {texto.split('/').map((trozo, i) => <Fragment key={i}>{i > 0 && <>/<wbr /></>}{trozo}</Fragment>)}
  </>
);

/** Lo que viene entre comillas ('Consultorio 1', 'B') es el dato que falló: va resaltado. */
const ConDatosResaltados = ({ texto }: { texto: string }) => (
  <>
    {texto.split(/('[^']*')/).map((parte, i) => (
      i % 2 === 1 ? <mark key={i} className="vef-dato">{parte.slice(1, -1)}</mark> : <Fragment key={i}>{parte}</Fragment>
    ))}
  </>
);

interface PropsGrupo {
  grupo: GrupoCasos;
  clave: string;
  busqueda: string;
}

/**
 * Varias unidades con el mismo problema, una tarjeta por unidad con su ruta completa y la carpeta
 * propia resaltada. Lo propio se calcula con todas, aunque el buscador oculte algunas. Si todas
 * tienen exactamente el mismo mensaje, se dice una vez y abajo van solo las unidades.
 */
const GrupoDeCasos = ({ grupo, clave, busqueda }: PropsGrupo) => {
  const rutas = grupo.casos.map(c => c.ruta);
  const detalleUnico = new Set(rutas).size === 1 && (rutas.length > 1 || !rutas[0].includes('/')) ? rutas[0] : null;
  const comun = detalleUnico ? null : parteComunDeRutas(rutas);
  const visibles = grupo.casos.filter(c => c.unidad.toLowerCase().includes(busqueda));

  if (visibles.length === 0) return null;

  return (
    <section className="vef-bloque">
      <header className="vef-bloque-encabezado">
        <Chips reportes={grupo.reportes} indicadores={grupo.indicadores} />
        <span className="vef-bloque-total">{plural(grupo.casos.length, 'unidad')}</span>
      </header>

      {detalleUnico ? (
        <>
          <div className="vef-comun">
            <span className="vef-comun-icono" aria-hidden="true">{ICONO_TIPO[clave] ?? <IconoAlerta tamano={16} />}</span>
            <div>
              <p className="vef-comun-titulo">Qué pasó</p>
              <p className="vef-comun-texto"><ConDatosResaltados texto={detalleUnico} /></p>
            </div>
          </div>
          <ul className="vef-unidades">
            {visibles.map(c => <li key={c.unidad}><span className="vef-unidad-icono" aria-hidden="true"><IconoCapas tamano={13} /></span> {c.unidad}</li>)}
          </ul>
        </>
      ) : (
        <ul className="vef-tarjetas">
          {visibles.map(c => {
            const esRuta = c.ruta.includes('/');
            const propio = comun?.propioDe(c.ruta);
            return (
              <li key={`${c.unidad}|${c.ruta}`} className="vef-tarjeta">
                <div className="vef-tarjeta-titulo">
                  <span className="vef-tarjeta-icono" aria-hidden="true"><IconoCapas tamano={15} /></span>
                  <strong>{c.unidad}</strong>
                  {c.reportes.map(r => <span key={r} className="vef-falta"><IconoArchivo tamano={12} /> {PREFIJO_REPORTE[clave] ?? 'Reporte'} <strong>{r}</strong></span>)}
                </div>
                {esRuta ? (
                  <div className="vef-tarjeta-ruta">
                    <IconoCarpeta tamano={14} aria-hidden="true" />
                    <code className="vef-ruta">
                      {comun?.antes && <><ConCortes texto={comun.antes} />/<wbr /></>}
                      {propio ? <span className="vef-ruta-propio"><ConCortes texto={propio} /></span> : !comun && <ConCortes texto={c.ruta} />}
                      {comun?.despues && <>/<wbr /><ConCortes texto={comun.despues} /></>}
                    </code>
                  </div>
                ) : (
                  <p className="vef-tarjeta-detalle"><ConDatosResaltados texto={c.ruta} /></p>
                )}
                {esRuta && <BotonCopiar texto={c.ruta} etiqueta="Copiar ruta" />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

/** Los casos de un tipo de problema. Se monta por tipo, así el buscador empieza vacío en cada uno. */
const DetalleTipo = ({ clave, tono, error, casos }: { clave: string; tono: string; error: ErrorExtraccion; casos: CasoError[] }) => {
  const [busqueda, setBusqueda] = useState('');
  const texto = busqueda.trim().toLowerCase();
  const deRuta = casos.filter(c => partirRutaError(c.ruta) && c.unidad.toLowerCase().includes(texto));
  const grupos = agruparPorOrigen(casos.filter(c => !partirRutaError(c.ruta)));
  const sinResultados = !casos.some(c => c.unidad.toLowerCase().includes(texto));

  return (
    <div className={`vef-detalle vef--${tono}`}>
      <div className="vef-detalle-encabezado">
        <div className="vef-detalle-texto">
          <h4 className="vef-detalle-titulo">{error.nombreError}</h4>
          <p className="vef-detalle-desc">{error.descripcionError}</p>
        </div>
        {casos.length >= CASOS_PARA_BUSCAR && (
          <label className="vef-buscar">
            <IconoBuscar tamano={13} aria-hidden="true" />
            <input id="vef-buscar-unidad" type="search" placeholder="Buscar unidad" aria-label="Buscar unidad" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </label>
        )}
      </div>

      {deRuta.map(caso => <TarjetaRuta key={`${caso.unidad}|${caso.ruta}`} caso={caso} />)}
      {grupos.map(grupo => (
        <GrupoDeCasos key={`${grupo.reportes.join()}|${grupo.indicadores.join()}`} grupo={grupo} clave={clave} busqueda={texto} />
      ))}
      {sinResultados && <p className="vef-sin-resultados">Ninguna unidad coincide con la búsqueda.</p>}
    </div>
  );
};

/**
 * Lo que no se pudo generar en Indicadores FTP: a la izquierda los tipos de problema y a la derecha
 * los casos del elegido, sin repetir lo que comparten. Se monta solo cuando se muestra, así cada
 * vez abre en el primer problema.
 */
const VentanaErroresFtp = ({ restricciones, subtitulo, color, onClose }: Props) => {
  const tipos = Object.entries(restricciones).map(([clave, error]) => ({
    clave, error, casos: agruparCasos(error), severidad: SEVERIDAD[clave] ?? 'advertencia',
  }));
  const criticos = tipos.filter(t => t.severidad === 'critico');
  const avisos = tipos.filter(t => t.severidad !== 'critico');
  const [elegido, setElegido] = useState((criticos[0] ?? avisos[0])?.clave);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onClose]);

  const actual = tipos.find(t => t.clave === elegido);
  const totalUnidades = new Set(tipos.flatMap(t => t.casos.map(c => c.unidad))).size;

  const grupo = (titulo: string, lista: typeof tipos, tono: string) => lista.length > 0 && (
    <div className={`vef-grupo vef--${tono}`}>
      <p className="vef-grupo-titulo"><span className="vef-punto" aria-hidden="true" /> {titulo}</p>
      {lista.map(t => (
        <button
          key={t.clave}
          type="button"
          className={`vef-tipo${t.clave === elegido ? ' vef-tipo--activo' : ''}`}
          aria-pressed={t.clave === elegido}
          onClick={() => setElegido(t.clave)}
        >
          <span className="vef-tipo-icono" aria-hidden="true">{ICONO_TIPO[t.clave] ?? <IconoAlerta tamano={16} />}</span>
          <span className="vef-tipo-nombre">{t.error.nombreError}</span>
          <strong className="vef-tipo-cuenta" aria-label={plural(t.casos.length, 'unidad')}>{t.casos.length}</strong>
        </button>
      ))}
    </div>
  );

  return createPortal(
    <div className="vef-fondo" onClick={e => e.target === e.currentTarget && onClose()}>
      <section className="vef-ventana" style={{ '--familia': color }} role="dialog" aria-modal="true" aria-label="Lo que no se pudo generar">
        <header className="vef-encabezado">
          <span className={`vef-icono vef--${criticos.length ? 'critico' : 'aviso'}`} aria-hidden="true">
            {criticos.length ? <IconoError /> : <IconoAlerta tamano={18} />}
          </span>
          <div className="vef-encabezado-texto">
            <h3>Lo que no se pudo generar</h3>
            <p>{subtitulo}</p>
          </div>
          <p className="vef-totales">
            <span><strong>{tipos.length}</strong> {tipos.length !== 1 ? 'tipos' : 'tipo'}</span>
            <span><strong>{totalUnidades}</strong> {totalUnidades !== 1 ? 'unidades' : 'unidad'}</span>
          </p>
          <button type="button" className="vef-cerrar" onClick={onClose} aria-label="Cerrar"><IconoCerrar tamano={13} /></button>
        </header>

        <div className="vef-cuerpo">
          <nav className="vef-menu" aria-label="Tipos de problema">
            {grupo('Impiden generar', criticos, 'critico')}
            {grupo('Avisos', avisos, 'aviso')}
          </nav>

          {actual && <DetalleTipo key={actual.clave} clave={actual.clave} tono={actual.severidad === 'critico' ? 'critico' : 'aviso'} error={actual.error} casos={actual.casos} />}
        </div>

        <footer className="vef-pie">
          <p><IconoInfo tamano={14} /> Los indicadores sin restricciones se generaron y descargaron correctamente.</p>
          <button type="button" className="vef-entendido" onClick={onClose}>Entendido</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default VentanaErroresFtp;
