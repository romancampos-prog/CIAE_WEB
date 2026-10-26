interface Props {
  esVisor: boolean;
  archivo: string | null;
  periodo: string | null;
  onActualizar: () => void;
}

/** Lo que va a la derecha del TopBar en Generar FTP: población vigente, botón para actualizarla y la nota legal. */
const AccionesPoblacion = ({ esVisor, archivo, periodo, onActualizar }: Props) => (
  <>
    {!esVisor && archivo && (
      <span className="ind-pob-archivo" title={archivo}>
        {periodo ? `Población: ${periodo}` : archivo}
      </span>
    )}
    {!esVisor && (
      <button className="ind-btn-pob" onClick={onActualizar}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span className="ind-btn-pob-label">Actualizar Población</span>
      </button>
    )}
    <span className="ind-legal-note" title="Este sistema solo consulta la información de los archivos FTP originales para generar los reportes — no los modifica, edita ni elimina en ningún momento.">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </span>
  </>
);

export default AccionesPoblacion;
