import { useMemo } from "react";
import { Field } from "../../pages/editInfo";

// 1. Agregamos onSave a las props que recibe el componente
export default function InfoGeneral({ form, setField, onSave }) {

  // 2. "Congelamos" los datos iniciales para la comparación
  const infoInicial = useMemo(() => {
    return { ...form };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Detectamos si hubo cambios para activar el botón
  const cambio = JSON.stringify(form) !== JSON.stringify(infoInicial);

  return (
    <div className="ei-card">
      <div className="ei-card-header">
        <span className="ei-card-num">01</span>
        <div>
          <h2 className="ei-card-titulo">Información general</h2>
          <p className="ei-card-desc">Datos básicos y descripciones</p>
        </div>
      </div>

      <div className="ei-card-body">
        <Field label="Título del indicador">
          <input 
            className="ei-input" 
            value={form.titulo || ''} 
            onChange={e => setField('titulo', e.target.value)} 
          />
        </Field>
        
        <Field label="Nombre de archivo final">
          <input 
            className="ei-input" 
            value={form.nombreArchivoFinal ?? ''} 
            onChange={e => setField('nombreArchivoFinal', e.target.value)} 
          />
        </Field>

        <div className="ei-two-col">
          <Field label="Descripción del numerador" hint="¿Qué se cuenta?">
            <textarea 
              className="ei-textarea" 
              rows={4} 
              value={form.descripcionNumerador || ''} 
              onChange={e => setField('descripcionNumerador', e.target.value)} 
            />
          </Field>
          <Field label="Descripción del denominador" hint="¿Sobre qué universo?">
            <textarea 
              className="ei-textarea" 
              rows={4} 
              value={form.descripcionDenominador || ''} 
              onChange={e => setField('descripcionDenominador', e.target.value)} 
            />
          </Field>
        </div>
      </div>

      <div className="ei-card-footer">
        <button 
          disabled={!cambio} 
          onClick={onSave} // Ejecuta la función que viene del padre
          style={{
            backgroundColor: cambio ? '#28a745' : '#e0e0e0',
            color: cambio ? 'white' : '#888888',
            cursor: cambio ? 'pointer' : 'not-allowed',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            width: '100%',
            maxWidth: '300px'
          }}
        >
          {cambio ? (
            <><span>💾</span> Guardar Información General</>
          ) : (
            <><span>✅</span> Información al día</>
          )}
        </button>
      </div>
    </div>
  );
}