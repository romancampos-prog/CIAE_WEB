export function Field({ label, hint, children }) {
  return (
    <div className="ei-field">
      <label className="ei-label">{label}</label>
      {hint && <span className="ei-hint">{hint}</span>}
      {children}
    </div>
  );
}
