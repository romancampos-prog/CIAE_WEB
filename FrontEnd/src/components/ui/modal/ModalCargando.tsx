import { useState, useEffect, type ReactNode } from 'react';
import './modalCargando.css';
import dogGif from "@/assets/corgi.gif";
// propios
import { IconoCandado } from '@/components/icons';

interface Props {
  isOpen: boolean;
  nota?: ReactNode;
}

const ContenidoCargando = ({ nota }: { nota?: ReactNode }) => {
  const [mensajeIdx, setMensajeIdx] = useState(0);
  const mensajes = [
    "Generando su reporte...",
    "Conectando con el servidor...",
    "Calculando indicadores...",
    "Casi listo..."
  ];

  // Cambia el mensaje cada 2.5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setMensajeIdx((prev) => (prev + 1) % mensajes.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [mensajes.length]);

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
            <IconoCandado />
            {nota}
          </p>
        )}
      </div>
    </div>
  );
};

/** Modal de "generando": se monta solo mientras está abierto, así cada vez empieza en el primer mensaje. */
const ModalLoading = ({ isOpen, nota }: Props) => (isOpen ? <ContenidoCargando nota={nota} /> : null);

export default ModalLoading;
