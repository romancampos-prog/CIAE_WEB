import { Fragment } from 'react';
import { COLOR_SEMAFORO } from '../../constantes/semaforo';
import { textoAcento } from '../../../../shared/utils/colorAcento';

/**
 * Display de umbrales del semáforo (Esperado / Medio / Bajo).
 *
 * Props:
 *   rangos      — array de objetos { Esperado, Medio, Bajo, _mes?, _label? }
 *                 FTP pasa [ rangosSem ] (uno solo)
 *                 IAAS puede pasar [ rangosSem, rangosSemExtra ] (dos columnas)
 *   indColor    — string — color del indicador (para sub-etiqueta)
 */
const SemaforoUmbral = ({ rangos = [], indColor }) => {
  const lista = rangos.filter(Boolean);
  if (!lista.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
      {lista.map((r, idx) => (
        <Fragment key={idx}>
          {idx > 0 && (
            <div style={{
              width: '1px', background: 'var(--borde)',
              margin: '0 14px', alignSelf: 'stretch',
            }} />
          )}
          <div className="ig-semaforo" style={{ alignItems: 'flex-start', gap: '16px' }}>
            <span style={{
              fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.8px', color: 'var(--texto-tenue)',
              paddingTop: '2px', paddingRight: '6px', whiteSpace: 'nowrap',
            }}>
              Umbral
              {(r._label || r._mes) && (
                <span style={{
                  display: 'block', fontSize: '0.6rem', fontWeight: 600,
                  textTransform: 'none', letterSpacing: 0,
                  color: r._label ? textoAcento(indColor) : 'var(--texto-deshabilitado)',
                  marginTop: '1px',
                }}>
                  {r._label ?? r._mes}
                </span>
              )}
            </span>

            {Object.entries(COLOR_SEMAFORO).map(([k, v]) => (
              <span key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span className="ig-sem-dot" style={{ background: v }} />
                  <span style={{ color: v, fontWeight: 700, fontSize: '0.72rem' }}>{k}</span>
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--texto-tenue)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {r?.[k] ?? '—'}
                </span>
              </span>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
};

export default SemaforoUmbral;
