import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, LabelList, ReferenceLine
} from 'recharts';
import './gBarras.css';

/* ─────────────────────────────────────────
    Tooltip personalizado (2 decimales)
───────────────────────────────────────── */
const CustomTooltip = ({ active, payload, config }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    const getEstado = (valor, cfg) => {
        if (!cfg) return { label: 'Sin clasificar', color: '#aaa', icon: '—' };
        const v = parseFloat(valor);
        const esDescendente = cfg.esDescendente || cfg.Alto !== undefined;

        if (esDescendente) {
            if (v <= cfg.Esperado) return { label: 'Esperado ✓', color: '#28a745', icon: '✅' };
            if (v <= cfg.Alto)     return { label: 'Medio', color: '#ffc107', icon: '⚠️' };
            return { label: 'Alto (Crítico)', color: '#dc3545', icon: '🔴' };
        } else {
            if (v >= cfg.Esperado) return { label: 'Esperado ✓', color: '#28a745', icon: '✅' };
            if (v >= cfg.Bajo)     return { label: 'Medio', color: '#ffc107', icon: '⚠️' };
            return { label: 'Bajo (Crítico)', color: '#dc3545', icon: '🔴' };
        }
    };

    const estado = getEstado(d.resultado, config);

    return (
        <div className="custom-tooltip-glass">
            <p className="label-unidad">{d.name}</p>
            <hr />
            <p className="val-resultado">
                <strong>{Number(d.resultado).toFixed(2)}%</strong>
            </p>
            <span
                className="estado-badge"
                style={{ background: estado.color + '18', color: estado.color, border: `1px solid ${estado.color}40` }}
            >
                {estado.icon} {estado.label}
            </span>
            <hr />
            <div className="stats-grid">
                <span>Num: <strong>{d.numerador}</strong></span>
                <span>Den: <strong>{d.denominador}</strong></span>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────
    Componente Principal GBarras
───────────────────────────────────────── */
const GBarras = ({ datos, config }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const esDescendente = config?.esDescendente || config?.Alto !== undefined;

    const dataTransformada = useMemo(() => {
        if (!datos || Object.keys(datos).length === 0) return [];

        return Object.entries(datos).map(([nombre, info]) => ({
            name: nombre,
            resultado: info.resultado ?? 0,
            numerador: info.numerador ?? 0,
            denominador: info.denominador ?? 0,
            color:
                info.color === 'Verde'    ? '#28a745' :
                info.color === 'Rojo'     ? '#dc3545' :
                info.color === 'Amarillo' ? '#ffc107' : '#adb5bd',
        }));
    }, [datos]);

    const statsGlobales = useMemo(() => {
        if (dataTransformada.length === 0) return { promedio: "0.00", v: 0, a: 0, r: 0, max: 0 };

        const sumaNum = dataTransformada.reduce((acc, d) => acc + Number(d.numerador), 0);
        const sumaDen = dataTransformada.reduce((acc, d) => acc + Number(d.denominador), 0);
        
        // Cambio a toFixed(2)
        const promedioReal = sumaDen > 0 ? ((sumaNum / sumaDen) * 100).toFixed(2) : "0.00";

        const maxData = Math.max(...dataTransformada.map(d => d.resultado));
        const maxRef = Math.max(config?.Esperado || 0, config?.Alto || 0, config?.Bajo || 0);

        return {
            promedio: promedioReal,
            v: dataTransformada.filter(d => d.color === '#28a745').length,
            a: dataTransformada.filter(d => d.color === '#ffc107').length,
            r: dataTransformada.filter(d => d.color === '#dc3545').length,
            max: Math.max(maxData, maxRef) * 1.15
        };
    }, [dataTransformada, config]);

    if (dataTransformada.length === 0) {
        return (
            <div className="gbarras-empty">
                <span>📭</span>
                <p>Sin datos para mostrar</p>
            </div>
        );
    }

    return (
        <div className="gbarras-wrapper">
            <div className="gbarras-summary">
                <span className="gs-item">
                    <span className="gs-dot" style={{ background: '#28a745' }} />
                    Esperado: <strong>{statsGlobales.v}</strong>
                </span>
                <span className="gs-item">
                    <span className="gs-dot" style={{ background: '#ffc107' }} />
                    Medio: <strong>{statsGlobales.a}</strong>
                </span>
                <span className="gs-item">
                    <span className="gs-dot" style={{ background: '#dc3545' }} />
                    {esDescendente ? 'Alto' : 'Bajo'}: <strong>{statsGlobales.r}</strong>
                </span>
                <span className="gs-sep" />
                <span className="gs-item gs-prom">
                    Promedio: <strong>{statsGlobales.promedio}%</strong>
                </span>
            </div>

            <div className="gbarras-chart">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={dataTransformada}
                        margin={{ top: 35, right: 30, left: 0, bottom: 70 }}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede6" />

                        <XAxis
                            dataKey="name"
                            angle={-52}
                            textAnchor="end"
                            interval={0}
                            height={85}
                            tick={{ fontSize: 11, fill: '#0c0b0b' }}
                        />

                        <YAxis
                            tick={{ fontSize: 10, fill: '#aaa' }}
                            width={45}
                            domain={[0, Math.ceil(statsGlobales.max)]}
                            tickLine={false}
                            axisLine={false}
                        />

                        <Tooltip
                            content={<CustomTooltip config={config} />}
                            cursor={{ fill: 'rgba(36,92,79,0.04)', radius: 4 }}
                        />

                        <ReferenceLine y={config?.Esperado} stroke="#28a745" strokeDasharray="6 4" strokeWidth={1.5} />
                        <ReferenceLine y={esDescendente ? config?.Alto : config?.Bajo} stroke="#dc3545" strokeDasharray="6 4" strokeWidth={1.5} />

                        <Bar
                            dataKey="resultado"
                            radius={[4, 4, 0, 0]}
                            barSize={dataTransformada.length > 30 ? 35 : 60}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                        >
                            {dataTransformada.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                                />
                            ))}
                            <LabelList 
                                dataKey="resultado" 
                                position="top" 
                                formatter={(val) => `${Number(val).toFixed(2)}%`} 
                                style={{ fontSize: '10px', fontWeight: 700, fill: '#444' }} 
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GBarras;