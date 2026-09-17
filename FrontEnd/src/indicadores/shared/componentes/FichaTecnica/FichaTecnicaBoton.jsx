import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { obtenerFichaTecnicaCompleta } from '../../api/indicadoresInfo';
import InformacionIndicador from '../../../reportes_grafica/componentes/InformacionIndicador/InformacionIndicador';
import './fichaTecnica.css';

/**
 * Botón + drawer de "Ficha técnica del indicador" -- compartido entre las
 * páginas de generar de FTP, IAAS y Extractor (antes cada una traía su
 * propia copia del drawer). Mismo diseño visual que ya tenía FTP
 * (IndicadoresPage.jsx), generalizado con nombres de clase propios
 * (ficha-tec-*) para no depender del CSS de ninguna página en particular.
 *
 * @param {string|string[]} indicador  - uno ("CAMA 40-49") o varios
 *   (["EH 03","DM 04"], ["IAAS 01",...,"IAAS 06"]) -- con más de uno se
 *   muestra un selector de pestañas dentro del drawer.
 * @param {string} [color]             - acento (--fc) del botón/drawer
 * @param {Object<string,string>} [iconos] - { [indicador]: srcImg } para las pestañas
 * @param {boolean} [mostrar=true]     - gating: no se pinta el botón si el
 *   indicador no tiene mostrarGenerar=true en el mapeo (no vale la pena
 *   mostrar ficha de algo que no tiene módulo/generación automática)
 */
const FichaTecnicaBoton = ({ indicador, color = '#0b5445', iconos = {}, mostrar = true }) => {
  const lista = Array.isArray(indicador) ? indicador : [indicador];

  const [abierta, setAbierta] = useState(false);
  const [activo, setActivo]   = useState(lista[0]);
  const [data, setData]       = useState(null);
  const [cargando, setCargando] = useState(false);

  // Si cambia el indicador principal (ej. el usuario seleccionó otro en el
  // sidebar de FTP) reinicia la pestaña activa a la primera de la lista nueva.
  useEffect(() => { setActivo(lista[0]); }, [lista.join(',')]);

  useEffect(() => {
    if (!abierta || !activo) return;
    setCargando(true);
    setData(null);
    obtenerFichaTecnicaCompleta(activo)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setCargando(false));
  }, [abierta, activo]);

  if (!mostrar || lista.length === 0 || !lista[0]) return null;

  return (
    <>
      <button className="ficha-tec-btn" style={{ '--fc': color }} onClick={() => setAbierta(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Ver ficha técnica
      </button>

      {abierta && createPortal(
        <>
          <div className="ficha-tec-backdrop" onClick={() => setAbierta(false)} />
          <div className="ficha-tec-drawer" style={{ '--fc': color }}>
            <div className="ficha-tec-header" style={{ '--fc': color }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {lista.length > 1 && (
                  <div className="ficha-tec-tabs">
                    {lista.map(ind => (
                      <button
                        key={ind}
                        className={`ficha-tec-tab${ind === activo ? ' ficha-tec-tab--activo' : ''}`}
                        style={{ '--fc': color }}
                        onClick={() => setActivo(ind)}
                      >
                        {iconos[ind] && <img src={iconos[ind]} alt="" />}
                        {ind}
                      </button>
                    ))}
                  </div>
                )}
                <p className="ficha-tec-eyebrow">Ficha técnica del indicador</p>
                <h3 className="ficha-tec-title" style={{ color }}>{activo}</h3>
              </div>
              <button className="ficha-tec-close" onClick={() => setAbierta(false)}>✕</button>
            </div>
            <div className="ficha-tec-body">
              {cargando
                ? <p className="ficha-tec-cargando">Cargando ficha técnica…</p>
                : <InformacionIndicador data={data} />
              }
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default FichaTecnicaBoton;
