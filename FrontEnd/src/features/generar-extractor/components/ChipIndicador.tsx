/** Clave del indicador con el ícono de su familia. */
const ChipIndicador = ({ clave, icono }: { clave: string; icono: string | null | undefined }) => (
  <span className="exv-chip-ind">{icono && <img src={icono} alt="" />}{clave}</span>
);

export default ChipIndicador;
