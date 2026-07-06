import { useMemo, useRef } from "react";
import { Field } from "../../page/editInfo/editInfo";

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const esMensual = (sem) => sem && MESES.some(m => Object.prototype.hasOwnProperty.call(sem, m));
const esDecremental = (sem) => sem && !esMensual(sem) && 'Alto' in sem;

export default function Semaforo({ form, setField, onSave }) {
  const sem = form.semaforo || {};

  // --- LÓGICA DE MEMORIA ---
  const datosRespaldados = useRef(JSON.parse(JSON.stringify(sem)));
  const infoInicial = useMemo(() => JSON.parse(JSON.stringify(sem)), []);
  const cambio = JSON.stringify(sem) !== JSON.stringify(infoInicial);
  
  const tipoOriginal = useMemo(() => {
    if (esMensual(datosRespaldados.current)) return 'mensual';
    if (esDecremental(datosRespaldados.current)) return 'decremental';
    return 'fijo';
  }, []);

  const cambiarTipo = (tipoDestino) => {
    if (tipoDestino === tipoOriginal) {
      setField('semaforo', datosRespaldados.current);
      return;
    }
    let nuevoSem = {};
    if (tipoDestino === 'mensual') {
      MESES.forEach(m => nuevoSem[m] = { Bajo: 0, Esperado: 0 });
    } else if (tipoDestino === 'decremental') {
      nuevoSem = { Esperado: 0, Alto: 0 };
    } else {
      nuevoSem = { Bajo: 0, Esperado: 0 };
    }
    setField('semaforo', nuevoSem);
  };
  // -------------------------

  const tipoActual = esMensual(sem) ? 'mensual' : (esDecremental(sem) ? 'decremental' : 'fijo');

  return (
    <div className="ei-card">
      <div className="ei-card-header">
        <span className="ei-card-num">04</span>
        <div>
          <h2 className="ei-card-titulo">Umbrales de semaforización</h2>
          <div style={{marginTop: '10px'}}>
             <select 
              className="ei-input" 
              value={tipoActual} 
              onChange={(e) => cambiarTipo(e.target.value)}
              style={{width: 'auto', minWidth: '200px'}}
            >
              <option value="fijo">Fijo (Bajo - Esperado)</option>
              <option value="decremental">Fijo (Esperado - Alto)</option>
              <option value="mensual">Mensual Acumulado</option>
            </select>
          </div>
        </div>
      </div>
      <div className="ei-card-body">
        <SemaforoEditor semaforo={sem} onChange={val => setField('semaforo', val)} />
      </div>
      <div className="ei-card-footer">
        <button 
          className="ei-btn-save" 
          onClick={onSave}
          disabled={!cambio}
          style={{
            backgroundColor: cambio ? '#28a745' : '#e0e0e0',
            color: cambio ? 'white' : '#888888',
            cursor: cambio ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease'
          }}
        >
          {cambio ? (
            <><span>💾</span> Guardar Umbrales</>
          ) : (
            <><span>✅</span> Información al día</>
          )}
        </button>
      </div>
    </div>
  );
}

const SemaforoEditor = ({ semaforo, onChange }) => {
  if (esMensual(semaforo)) {
    return (
      <div className="ei-sem-table-wrap">
        <div className="ei-sem-table-head"><span>Mes</span><span>Bajo (≤)</span><span>Esperado (≥)</span></div>
        {MESES.map(mes => {
          const v = semaforo[mes] ?? { Bajo: 0, Esperado: 0 };
          return (
            <div key={mes} className="ei-sem-table-row">
              <span className="ei-sem-mes">{mes}</span>
              <input className="ei-input" type="number" value={v.Bajo} onChange={e => onChange({ ...semaforo, [mes]: { ...v, Bajo: parseFloat(e.target.value) || 0 } })} />
              <input className="ei-input" type="number" value={v.Esperado} onChange={e => onChange({ ...semaforo, [mes]: { ...v, Esperado: parseFloat(e.target.value) || 0 } })} />
            </div>
          );
        })}
      </div>
    );
  }
  const dec = esDecremental(semaforo);
  return (
    <div className="ei-sem-fija-grid" style={{display: 'flex', gap: '1rem'}}>
      <div className={`ei-sem-pill ${dec ? 'ei-sem-verde' : 'ei-sem-rojo'}`}>
        <span className="ei-sem-pill-lbl">{dec ? 'Esperado (≤)' : 'Bajo (≤)'}</span>
        <input className="ei-input" type="number" value={dec ? semaforo.Esperado : semaforo.Bajo} onChange={e => onChange({ ...semaforo, [dec ? 'Esperado' : 'Bajo']: parseFloat(e.target.value) || 0 })} />
      </div>
      <div className={`ei-sem-pill ${dec ? 'ei-sem-rojo' : 'ei-sem-verde'}`}>
        <span className="ei-sem-pill-lbl">{dec ? 'Alto (≥)' : 'Esperado (≥)'}</span>
        <input className="ei-input" type="number" value={dec ? semaforo.Alto : semaforo.Esperado} onChange={e => onChange({ ...semaforo, [dec ? 'Alto' : 'Esperado']: parseFloat(e.target.value) || 0 })} />
      </div>
    </div>
  );
};