# Módulo: Epidemiología

Análisis de dengue. Opera como una **Single Page Application interna**: una sola página raíz con sidebar de navegación que muestra secciones distintas sin cambiar la URL.

## Estructura

```
epidemiologia/
├── dengue/                        ← único sub-módulo actual
│   ├── api/
│   │   ├── archivos.js            — cargarOperativa, cargarSiscep
│   │   ├── pipeline.js            — getEstadoPipeline, ejecutarPipeline
│   │   └── reportes.js            — getCanal, getMapa, getAlertas, getDuplicados, etc.
│   ├── componentes/               — un componente por sección del sidebar
│   │   ├── alertas/               → SeccionAlerta
│   │   ├── canal/                 → CanalChart
│   │   ├── carga/                 → UploadCard
│   │   ├── comun/                 → PanelDeslizante, ReporteToast, Spinner
│   │   ├── duplicados/            → SeccionDuplicados, SeccionPosiblesDuplicados
│   │   ├── mapa/                  → MapaLeaflet, BrotesPanel, TablaUnidades
│   │   └── plantilla/             → Header, Layout, Sidebar
│   ├── contexto/
│   │   └── PipelineContext.jsx    — estado global del pipeline (corriendo, logs, resultado)
│   ├── hooks/
│   │   ├── useDenguePipeline.js   — polling de estado, iniciar pipeline
│   │   └── useDengueReportes.js   — carga de datos del reporte activo
│   ├── paginas/                   — una página por sección del sidebar
│   │   ├── CargaPage.jsx, CanalPage.jsx, MapaPage.jsx
│   │   ├── AlertasSiscepPage.jsx, DuplicadosPage.jsx
│   └── utils/calculos.js
├── paginas/
│   ├── EpiLandingPage.jsx         — pantalla de bienvenida del módulo
│   └── EpidemiologiaApp.jsx       — contenedor principal con Layout + Sidebar
├── routes/
│   └── EpiRoutes.jsx              — solo registra la ruta raíz con <Outlet>
└── dengue.css / epi.css
```

## Diferencia fundamental vs Indicadores

| | Indicadores Médicos | Epidemiología |
|---|---|---|
| **Navegación** | React Router — cada sección tiene su URL | Sidebar con `useState` — una sola URL |
| **Sub-módulos** | FTP, IAAS, Grafica — autónomos | Solo Dengue, con secciones internas |
| **Datos** | FTP / carga de archivos Excel | Pipeline Python sobre archivos CSV |
| **Backend response** | `ApiResponse(success, message, data)` | Datos directos sin wrapper |

## Por qué no hay sub-routes en epidemiología

Las secciones (Canal, Mapa, Alertas, etc.) se navegan por estado en `EpidemiologiaApp`, no por URL. El usuario no necesita deep-linking ni URLs compartibles por sección.

Si en el futuro se necesitara URL por sección, se añadirían `<Route>` dentro de `EpiRoutes` — siguiendo el mismo patrón que `IndicadoresRoutes`.

## Agregar una sección nueva

**1.** Crear el componente en `dengue/componentes/nueva/NuevaSeccion.jsx`

**2.** Crear la página en `dengue/paginas/NuevaPage.jsx`

**3.** Añadir la entrada en `dengue/componentes/plantilla/Sidebar.jsx`

**4.** Registrar en `EpidemiologiaApp.jsx` con su condición de visibilidad:

```jsx
{seccionActiva === 'nueva' && <NuevaPage />}
```

**5.** Si la sección necesita datos del backend: añadir función en `dengue/api/reportes.js` y consumirla desde `useDengueReportes.js` o un hook propio.

**No** añadir routes de React Router a menos que se necesite una URL directa.

## Regla crítica: useDengueReporte y la respuesta del backend

El hook lee la respuesta cruda de Axios:

```js
// useDengueReportes.js
axios.get('/epidemiologia/...').then(({ data }) => setDatos(data))
//                                         ^^^^
//                              data = response.data directamente
```

El backend de epidemiología **no usa `ApiResponse`** — devuelve datos directos. Si algún día se agrega `ApiResponse`, el hook se rompe. Cambiar ambos lados a la vez o no cambiar ninguno.

## PipelineContext

Todos los componentes de Dengue consumen `PipelineContext` para saber si el pipeline está corriendo y acceder a los logs. Se provee en `EpidemiologiaApp`:

```jsx
<PipelineContext.Provider value={...}>
  <Layout>...</Layout>
</PipelineContext.Provider>
```
