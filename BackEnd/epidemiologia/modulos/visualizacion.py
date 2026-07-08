import plotly.graph_objects as go

# ─── Paleta institucional ────────────────────────────────────────────────
DORADO = "#A7802D"
VERDE  = "#245C4F"
GUINDA = "#691C32"
BEIGE  = "#D4BC94"
GRIS   = "#A4A4A4"

# ─── Colores de zonas del canal endémico ────────────────────────────────
COLOR_EXITO     = 'rgba(144, 238, 144, 0.45)'   # verde pastel
COLOR_SEGURIDAD = 'rgba(255, 255, 153, 0.55)'   # amarillo pastel
COLOR_ALERTA    = 'rgba(255, 165,   0, 0.50)'   # naranja
COLOR_EPIDEMICA = 'rgba(220,  50,  50, 0.40)'   # rojo

# Color del marcador por zona (para la línea del año actual)
COLOR_MARCADOR = {
    'exito'    : '#2e8b57',   # verde oscuro
    'seguridad': '#ccaa00',   # amarillo oscuro
    'alerta'   : '#e07b00',   # naranja oscuro
    'epidemica': '#cc0000',   # rojo
}


def graficar_canal(df_combinado, año_actual):
    """
    Genera la gráfica interactiva del canal endémico con 4 zonas.
    La línea del año actual se dibuja en negro con marcadores de color por zona.
    """

    fig = go.Figure()

    # Límite superior visible de la zona epidémica
    upper_bound = max(
        df_combinado['Q3'].max() * 2,
        df_combinado['CASOS_ACTUAL'].max() * 1.15,
        1
    )

    sem = df_combinado['SEM']

    # ── Zona Éxito: 0 → Q1 ──────────────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=sem, y=df_combinado['Q1'],
        fill='tozeroy',
        fillcolor=COLOR_EXITO,
        line=dict(color='rgba(0,0,0,0)'),
        name='Zona de éxito',
        hoverinfo='skip'
    ))

    # ── Zona Seguridad: Q1 → Mediana ────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=sem, y=df_combinado['MEDIANA'],
        fill='tonexty',
        fillcolor=COLOR_SEGURIDAD,
        line=dict(color='rgba(0,0,0,0)'),
        name='Zona de seguridad',
        hoverinfo='skip'
    ))

    # ── Zona Alerta: Mediana → Q3 ───────────────────────────────────────
    fig.add_trace(go.Scatter(
        x=sem, y=df_combinado['Q3'],
        fill='tonexty',
        fillcolor=COLOR_ALERTA,
        line=dict(color='rgba(0,0,0,0)'),
        name='Zona de alerta',
        hoverinfo='skip'
    ))

    # ── Zona Epidémica: Q3 → upper_bound ────────────────────────────────
    fig.add_trace(go.Scatter(
        x=sem, y=[upper_bound] * len(sem),
        fill='tonexty',
        fillcolor=COLOR_EPIDEMICA,
        line=dict(color='rgba(0,0,0,0)'),
        name='Zona epidémica',
        hoverinfo='skip'
    ))

    # ── Línea año actual (negra, marcadores coloreados por zona) ─────────
    colores_marcador = [
        COLOR_MARCADOR.get(z, '#000000')
        for z in df_combinado['ZONA']
    ]

    fig.add_trace(go.Scatter(
        x=sem,
        y=df_combinado['CASOS_ACTUAL'],
        mode='lines+markers',
        line=dict(color='black', width=2.5),
        marker=dict(color=colores_marcador, size=8, line=dict(color='black', width=1)),
        name=f'Casos {año_actual}',
        hovertemplate='Semana %{x}<br>Casos: %{y}<extra></extra>'
    ))

    # ── Layout ───────────────────────────────────────────────────────────
    fig.update_layout(
        title=dict(
            text=f'Canal Endémico de Dengue — IMSS Guanajuato {año_actual}',
            font=dict(color=DORADO, size=18)
        ),
        xaxis=dict(
            title='Semana Epidemiológica',
            tickmode='linear',
            tick0=1,
            dtick=2,
            range=[1, sem.max() + 1]
        ),
        yaxis=dict(
            title='Número de casos',
            rangemode='nonnegative'
        ),
        height=650,
        plot_bgcolor='white',
        legend=dict(orientation='h', yanchor='bottom', y=1.02),
        hovermode='x unified'
    )

    return fig

