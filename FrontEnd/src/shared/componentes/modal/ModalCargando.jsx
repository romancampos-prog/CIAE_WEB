import { useState, useEffect } from 'react';
import './modalCargando.css';
import dogGif from "../../../assets/corgi.gif"

const ModalLoading = ({ isOpen, nota }) => {
  const [mensajeIdx, setMensajeIdx] = useState(0);
  const mensajes = [
    "Generando su reporte...",
    "Conectando con el servidor...",
    "Calculando indicadores...",
    "Casi listo..."
  ];

  // Cambia el mensaje cada 2.5 segundos
  useEffect(() => {
    if (!isOpen) {
        setMensajeIdx(0); // Reinicia el índice al cerrar
        return;
    }
    
    const interval = setInterval(() => {
      setMensajeIdx((prev) => (prev + 1) % mensajes.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, mensajes.length]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-loading">
      <div className="modal-content-loading">
        <div className="pet-container">
          {/* 2. USAMOS LA VARIABLE: En lugar de un string con la ruta */}
          <img 
            src={dogGif} 
            alt="Perrito cargando" 
            style={{ width: '180px', height: 'auto', borderRadius: '10px' }}
          />
        </div>
        
        <h3>{mensajes[mensajeIdx]}</h3>
        <p>Por favor, no cierre esta ventana.</p>

        {/* Barra de progreso animada (debe estar en tu CSS) */}
        <div className="loading-bar-container">
          <div className="loading-bar-fill"></div>
        </div>

        {nota && (
          <p className="mcl-nota">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            {nota}
          </p>
        )}
      </div>
    </div>
  );
};

export default ModalLoading;
