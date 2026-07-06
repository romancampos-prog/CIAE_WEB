import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './editInfo.css';

// Importación de componentes hijos
import Operacion from '../../componentes/editInfo/Operacion';
import Semaforo from '../../componentes/editInfo/Semaforo';
import InfoGeneral from "../../componentes/editInfo/InfoGeneral";
import { EditInfoGeneral, EditSemaforo, EditInfoTecnica } from '../../api/modificaciones,';

// Componente Field exportado para que los hijos lo usen
export const Field = ({ label, hint, children }) => (
  <div className="ei-field">
    <label className="ei-label">{label}</label>
    {hint && <span className="ei-hint">{hint}</span>}
    {children}
  </div>
);

export default function EditInfo() {
  const location = useLocation();
  const navigate = useNavigate();
  const indicadorId = location.state?.indicador;
  const datosIniciales = location.state?.datos;

  // --- 1. ESTADOS SEPARADOS POR SECCIÓN ---
  
  const [infoGeneral, setInfoGeneral] = useState({
    titulo: datosIniciales?.titulo || '', 
    descripcionNumerador: datosIniciales?.descripcionNumerador || '',
    descripcionDenominador: datosIniciales?.descripcionDenominador || '',
    nombreArchivoFinal: datosIniciales?.nombreArchivoFinal || ''
  });

  const [infoOperacion, setInfoOperacion] = useState({
    reporte: datosIniciales?.reporte || {},
    operacion: datosIniciales?.operacion || { numerador: '', denominador: '', resultado: '' }
  });

  const [infoSemaforo, setInfoSemaforo] = useState({
    semaforo: datosIniciales?.semaforo || {}
  });

  const [seccionActiva, setSeccionActiva] = useState('general');

  // --- 2. FUNCIONES DE ACTUALIZACIÓN (SETTERS) ---

  const fieldInfoGeneral = (key, val) => 
    setInfoGeneral(prev => ({ ...prev, [key]: val }));

  const fieldInfoOperacion = (key, val) => 
    setInfoOperacion(prev => ({ ...prev, [key]: val }));

  const fieldInfoSemaforo = (key, val) => 
    setInfoSemaforo(prev => ({ ...prev, [key]: val }));

  // Función específica para manejar cambios en las fuentes (dentro de Operación)
  const onChangeFuente = (id, cfg) => {
    setInfoOperacion(prev => ({
      ...prev,
      reporte: { ...prev.reporte, [id]: cfg }
    }));
  };

  // --- 3. MANEJO DE GUARDADO ---

  const handleGuardar = async (nombreSeccion, datos) => {
      try {
          console.log(`Iniciando guardado de ${nombreSeccion}...`);

          if (nombreSeccion === "Información General") {
              // 1. Llamamos a la API y esperamos (await)
              const resultado = await EditInfoGeneral(datos, indicadorId);
              
              // 2. Si llegamos aquí, es que fue exitoso
              alert("✅ Información General actualizada correctamente.");
              
              // Opcional: Podrías recargar los datos o limpiar el estado de "cambios"
              // Pero por ahora con el feedback visual es suficiente.
          }

          if (nombreSeccion === "Configuración Técnica") {
              await EditInfoTecnica(datos, indicadorId);
              alert("✅ Configuración Técnica actualizada.");
          }

          if (nombreSeccion === "Semáforo") {
              await EditSemaforo(datos, indicadorId);
              alert("✅ Semáforo actualizado.");
          }
          
      } catch (error) {
          // Si la API falla, cae aquí
          alert("❌ Error al guardar los cambios. Intenta de nuevo.");
      }
  };

  const secciones = [
    { id: 'general',   label: 'General',             icon: '📋' },
    { id: 'tecnico',   label: 'Reporte y Operación', icon: '⚙️' },
    { id: 'semaforo',  label: 'Semáforo',            icon: '🚦' },
  ];

  return (
    <div className="ei-root">
      {/* SIDEBAR RESTAURADA */}
      <aside className="ei-sidebar">
        <div className="ei-sidebar-top">
          <button className="ei-back-btn" onClick={() => navigate(-1)}>← Volver</button>
          <div className="ei-sidebar-indicador">
            <span className="ei-sidebar-etiqueta">Editando</span>
            <span className="ei-sidebar-id">{indicadorId ?? '—'}</span>
          </div>
        </div>

        <nav className="ei-nav">
          {secciones.map(s => (
            <button 
              key={s.id}
              className={`ei-nav-item ${seccionActiva === s.id ? 'active' : ''}`}
              onClick={() => setSeccionActiva(s.id)}
            >
              <span className="ei-nav-icon">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL REACCIÓN SEGÚN SECCIÓN ACTIVA */}
      <main className="ei-main">
        <div className="ei-main-inner">
          
          {seccionActiva === 'general' && (
            <InfoGeneral 
              form={infoGeneral} 
              setField={fieldInfoGeneral} 
              onSave={() => handleGuardar("Información General", infoGeneral)}
            />
          )}

          {seccionActiva === 'tecnico' && (
            <Operacion 
              form={infoOperacion} 
              setField={fieldInfoOperacion} 
              onChangeFuente={onChangeFuente}
              onSave={() => handleGuardar('Configuración Técnica', infoOperacion)} 
            />
          )}

          {seccionActiva === 'semaforo' && (
            <Semaforo 
              form={infoSemaforo} 
              setField={fieldInfoSemaforo} 
              onSave={() => handleGuardar('Semáforo', infoSemaforo)} 
            />
          )}
          
        </div>
      </main>
    </div>
  );
}