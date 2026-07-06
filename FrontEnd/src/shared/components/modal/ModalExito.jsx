import './modalExito.css';

const ModalExito = ({ isOpen, onClose, indicador, onConfirm }) => {
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
          <button
            className="btn-primario"
            style={{ backgroundColor: '#7E0808', width: '100%', marginBottom: '5px' }}
            onClick={onConfirm}
          >
            Listo, ajustar parámetros
          </button>
          <button className="btn-primario" style={{ width: '100%' }} onClick={onClose}>
            Ir a FTP ➔
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalExito;