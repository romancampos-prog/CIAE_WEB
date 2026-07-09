import Plot from 'react-plotly.js'

const ZONA_COLORES = {
  exito    : '#2e8b57',
  seguridad: '#ccaa00',
  alerta   : '#e07b00',
  epidemica: '#cc0000',
}

export default function CanalChart({ datos }) {
  const { semanas, q1, mediana, q3, casos_actual, zonas, año } = datos

  const upper = Math.max(Math.max(...q3) * 2, Math.max(...casos_actual) * 1.15, 1)
  const coloresMarcador = zonas.map(z => ZONA_COLORES[z] || '#000')

  const traces = [
    {
      x: semanas, y: q1,
      fill: 'tozeroy', fillcolor: 'rgba(46,139,87,0.38)',
      line: { color: 'transparent' },
      name: 'Zona de éxito', hoverinfo: 'skip',
    },
    {
      x: semanas, y: mediana,
      fill: 'tonexty', fillcolor: 'rgba(204,170,0,0.42)',
      line: { color: 'transparent' },
      name: 'Zona de seguridad', hoverinfo: 'skip',
    },
    {
      x: semanas, y: q3,
      fill: 'tonexty', fillcolor: 'rgba(224,123,0,0.42)',
      line: { color: 'transparent' },
      name: 'Zona de alerta', hoverinfo: 'skip',
    },
    {
      x: semanas, y: Array(semanas.length).fill(upper),
      fill: 'tonexty', fillcolor: 'rgba(220,50,50,0.32)',
      line: { color: 'transparent' },
      name: 'Zona epidémica', hoverinfo: 'skip',
    },
    {
      x: semanas, y: casos_actual,
      mode: 'lines+markers',
      line: { color: '#691c32', width: 2.8 },
      marker: {
        color: coloresMarcador, size: 9,
        line: { color: 'white', width: 1.8 },
      },
      cliponaxis: false,
      name: `Casos ${año}`,
      hovertemplate: '<b>Semana %{x}</b><br>Casos: <b>%{y}</b><extra></extra>',
    },
  ]

  return (
    <Plot
      data={traces}
      layout={{
        margin: { t: 16, r: 20, b: 48, l: 44 },
        xaxis: {
          title: { text: 'Semana Epidemiológica', font: { size: 11, color: '#94a3b8', family: 'Inter' } },
          tickmode: 'linear', tick0: 1, dtick: 2, range: [0.5, 53.5],
          gridcolor: 'rgba(0,0,0,0.05)', gridwidth: 1,
          linecolor: 'rgba(0,0,0,0.08)',
          tickfont: { size: 11, color: '#64748b', family: 'Inter' },
          zeroline: false,
        },
        yaxis: {
          title: { text: 'Casos', font: { size: 11, color: '#94a3b8', family: 'Inter' } },
          rangemode: 'nonnegative',
          gridcolor: 'rgba(0,0,0,0.05)', gridwidth: 1,
          tickfont: { size: 11, color: '#64748b', family: 'Inter' },
          zeroline: false,
        },
        height: 480,
        plot_bgcolor : 'transparent',
        paper_bgcolor: 'transparent',
        showlegend: false,
        hovermode: 'x unified',
        hoverlabel: {
          bgcolor: 'rgba(30,41,59,0.9)',
          bordercolor: 'transparent',
          font: { size: 12, color: 'white', family: 'Inter' },
        },
      }}
      config={{ responsive: true, displaylogo: false, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}
