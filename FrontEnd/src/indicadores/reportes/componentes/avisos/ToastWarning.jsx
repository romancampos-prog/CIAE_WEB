import "./toastWarning.css"

const ToastWarning = ({ visible, onClick, onClose }) => {
  if (!visible) return null;

  return (
    <div className="toast-main-wrapper animate-slide-in">
      <div className="toast-interactive-area" onClick={onClick}>
        <div className="toast-accent-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div className="toast-body-text">
          <strong className="toast-headline">Reportes faltantes</strong>
          <span className="toast-description">ver detalles</span>
        </div>
      </div>
      <button className="toast-close-btn" onClick={onClose} aria-label="Cerrar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

export default ToastWarning;
