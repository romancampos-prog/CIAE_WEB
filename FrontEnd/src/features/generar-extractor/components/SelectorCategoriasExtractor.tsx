// propios
import type { EstadoGenerarExtractor } from '@/features/generar-extractor/hooks/useGenerarExtractor';

/** Qué indicadores ver: todos o solo los de una categoría. Los archivos de arriba no se filtran. */
const SelectorCategoriasExtractor = ({ ex }: { ex: EstadoGenerarExtractor }) => {
  const opciones = [
    { clave: null, nombre: 'Todas', icono: null, total: ex.indicadores.length },
    ...ex.categorias.map(c => ({ clave: c.categoria, nombre: c.categoria, icono: c.icono, total: c.total, titulo: c.nombreCategoria })),
  ];

  return (
    <div className="exv-categorias" role="group" aria-label="Elegir qué indicadores ver">
      {opciones.map(o => {
        const activa = ex.categoriaElegida === o.clave;
        return (
          <button
            key={o.nombre}
            type="button"
            className={`exv-categoria${activa ? ' exv-categoria--activa' : ''}`}
            aria-pressed={activa}
            title={'titulo' in o ? o.titulo : 'Todos los indicadores'}
            onClick={() => ex.setCategoriaElegida(o.clave)}
          >
            {o.icono && <img src={o.icono} alt="" />}
            <strong>{o.nombre}</strong>
            <span className="exv-categoria-total">{o.total}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SelectorCategoriasExtractor;
