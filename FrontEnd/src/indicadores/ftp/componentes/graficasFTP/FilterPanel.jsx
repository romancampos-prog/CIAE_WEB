import { useState, useMemo, useEffect } from 'react';
import './filterPanel.css';

export default function FilterPanel({ datos, onFilterChange, esDescendente }) {
    const unidades = useMemo(() => Object.entries(datos || {}), [datos]);

    // Estado de checkboxes
    const [selected, setSelected] = useState(new Set());
    const [search, setSearch] = useState('');
    
    // Sincronización inicial
    useEffect(() => {
        if (selected.size === 0 && unidades.length > 0) {
            setSelected(new Set(unidades.map(([k]) => k)));
        }
    }, [unidades]);

    const selectByColor = (color) => {
        const filtradas = unidades.filter(([, v]) => v.color === color);
        const keys = filtradas.map(([k]) => k);
        setSelected(new Set(keys));
        onFilterChange(Object.fromEntries(filtradas));
        setSearch('');
    };

    const toggle = (key) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const apply = () => {
        const filtrado = Object.fromEntries(
            unidades.filter(([k]) => selected.has(k))
        );
        onFilterChange(filtrado);
    };

    const visible = useMemo(() => {
        return unidades.filter(([k]) => 
            !search || k.toLowerCase().includes(search.toLowerCase())
        );
    }, [unidades, search]);

    // Estadísticas con etiquetas actualizadas
    const stats = useMemo(() => {
        const sel = unidades.filter(([k]) => selected.has(k)).map(([, v]) => v);
        if (!sel.length) return { avg: 0, v: 0, a: 0, r: 0 };
        return {
            avg: (sel.reduce((s, v) => s + (v.resultado ?? 0), 0) / sel.length).toFixed(1),
            v: sel.filter(v => v.color === 'Verde').length,
            a: sel.filter(v => v.color === 'Amarillo').length,
            r: sel.filter(v => v.color === 'Rojo').length,
        };
    }, [selected, unidades]);

    return (
        <div className="fp-panel">
            <div className="fp-header">
                <div className="fp-header-left">
                    <span className="fp-title">Filtrar Unidades</span>
                    <span className="fp-badge">{selected.size} seleccionadas</span>
                </div>
                
                {/* Visualización de mini-estadísticas */}
               

                <div className="fp-actions">
                    <button className="fp-btn" onClick={() => setSelected(new Set(unidades.map(([k]) => k)))}>Todas</button>
                    <button className="fp-btn" onClick={() => setSelected(new Set())}>Limpiar</button>
                    <button className="fp-btn fp-btn-primary" onClick={apply}>Aplicar Selección</button>
                </div>
            </div>

            <div className="fp-search-row">
                <input
                    className="fp-search"
                    placeholder="Buscar unidad por nombre..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div className="fp-color-filters">
                    <button className="fp-color-btn v" onClick={() => selectByColor('Verde')}>Esperado</button>
                    <button className="fp-color-btn a" onClick={() => selectByColor('Amarillo')}>Medio</button>
                    <button className="fp-color-btn r" onClick={() => selectByColor('Rojo')}>
                        {esDescendente ? 'Alto (Crítico)' : 'Bajo'}
                    </button>
                </div>
            </div>

            <div className="fp-grid">
                {visible.map(([key, val]) => (
                    <div 
                        key={key} 
                        className={`fp-unit ${selected.has(key) ? 'fp-unit-sel' : ''}`} 
                        onClick={() => toggle(key)}
                    >
                        <div className={`fp-checkbox ${selected.has(key) ? 'checked' : ''}`} />
                        <span className="fp-unit-dot" style={{ background: val.color === 'Verde' ? '#28a745' : val.color === 'Rojo' ? '#dc3545' : '#ffc107' }} />
                        <span className="fp-unit-name">{key}</span>
                        <span className="fp-unit-val">{val.resultado}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
