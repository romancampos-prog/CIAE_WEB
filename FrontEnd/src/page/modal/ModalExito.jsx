import './modalExito.css';

const ModalExito = ({ isOpen, onClose, indicador, PageGraficar, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content-exito animate-pop">
        <div className="icon-success">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h2>¡Reporte Generado!</h2>
        <p>
          El análisis de <strong>{indicador}</strong> está listo y se ha guardado en el servidor.
        </p>
        
        <div className="ruta-container">
          <label>Guardado en Descargas (download):</label>
        </div>

        <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
          
          {/* BOTÓN TINTO: Cierra modal para ajustar variables */}
          <button 
            className="btn-primario" 
            style={{ backgroundColor: '#7E0808', width: '100%', marginBottom: '5px' }} 
            onClick={onConfirm}
          >
            Listo, ajustar parámetros
          </button>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button className="btn-primario" style={{ flex: 1 }} onClick={onClose}>
              Ir a FTP ➔
            </button>
            <button className='btn-primario' style={{ flex: 1 }} onClick={PageGraficar}>
              Visualizar Gráfica
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ModalExito;