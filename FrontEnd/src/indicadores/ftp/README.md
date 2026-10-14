# Sub-módulo: FTP

Descarga datos del servidor FTP y genera reportes Excel por indicador, categoría y período. Los indicadores se organizan por categorías: CACU, CAMA, EH, DM, MT, CUPN, S_Ob, CE.

## Estructura

```
ftp/
├── api/
│   └── poblacion.js      — getPoblacion, actualizarPoblacion
├── componentes/
│   ├── graficasFTP/
│   │   ├── FTPGraficasContenido.jsx  — gráficas FTP dentro de GraficasUnificadasPage
│   │   ├── GBarras.jsx / FilterPanel.jsx / ChartTooltip.jsx
│   └── modalPoblacion/
│       └── ModalPoblacion.jsx        — edición de cifras de población
├── hooks/
│   ├── useFTPGrafica.js  — carga datos históricos, chart data, descargas
│   └── useIndicadores.js — indicadores de Generar FTP (GET /Indicadores/ftp/indicadores), agrupados por familia
├── paginas/
│   ├── FTPPage.jsx            — hub principal del módulo indicadores (índice visual)
│   ├── FTPLanding.jsx         — menú FTP: "Ver datos" / "Generar indicadores"
│   ├── IndicadoresPage.jsx    — formulario para generar reportes desde FTP
│   ├── GenerarHub.jsx         — selección de módulo: FTP vs IAAS
│   └── GraficasUnificadasPage.jsx — gráficas unificadas FTP + IAAS (drawer lateral)
├── routes/
│   └── FTPRoutes.jsx
└── utils/
    ├── calculos.js       — cálculos de tasas, semáforo, bandas de color
    └── horario.js        — periodoDelDia(), getGreeting() → { saludo, icono }
```

## Flujo de navegación

```
/CIAE/IndicadoresMedicos               → FTPPage (hub visual del módulo)
/CIAE/IndicadoresMedicos/Graficas      → GraficasUnificadasPage
/CIAE/IndicadoresMedicos/Generar       → GenerarHub (FTP o IAAS)
/CIAE/IndicadoresMedicos/FTP           → FTPLanding (menú del sub-módulo)
/CIAE/IndicadoresMedicos/FTP/Generar   → IndicadoresPage
```

> `GraficasUnificadasPage` y `GenerarHub` viven en `ftp/paginas/` pero son páginas del módulo raíz — están registradas directamente en `IndicadoresRoutes`, no dentro de `FTPRoutes`.

## Agregar un indicador FTP

Los indicadores llegan del backend: Generar usa `getIndicadoresFTP()` (`api/indicadores.js`) y las gráficas `obtenerTodosLosIndicadores()`; ambos traen el ícono y el color de la familia desde el mapeo. Para añadir uno:

1. Agregar el bloque del indicador en `BackEnd/indicadores/mapeo/ftp/{FAMILIA}.json` (ver `mapeo/README.md`); `mostrarGenerar: true` lo hace aparecer en Generar FTP.
2. Si es una familia nueva, agregarla en `mapeo/catalogos/familias.json` (nombre, ícono y color) y poner su ícono en `src/assets/`.

No se necesita cambiar código del frontend.

## Agregar una página dentro del sub-módulo

1. Crear `paginas/NuevoFTP.jsx`
2. Añadir la ruta en `routes/FTPRoutes.jsx`:

```jsx
import NuevoFTP from '../paginas/NuevoFTP'
// ...
<Route path="Nuevo" element={<NuevoFTP />} />
```

3. El botón de regreso navega a `/CIAE/IndicadoresMedicos/FTP` (la landing del sub-módulo).

## GraficasUnificadasPage — cómo funciona el switch FTP/IAAS

```jsx
// El indicador seleccionado determina qué componente renderiza
const modulo = indSel.startsWith('IAAS') ? 'iass' : 'ftp';

{indSel && modulo === 'ftp'  && <FTPGraficasContenido  indSel={indSel} ... />}
{indSel && modulo === 'iass' && <IAASGraficasContenido indSel={indSel} ... />}
```

El drawer lateral contiene todos los indicadores FTP agrupados por categoría + el grupo IAAS al final. El usuario no distingue entre módulos.

## Prefijo CSS

Clases de este sub-módulo: prefijo `ftp-`. Archivo principal: `paginas/ftp.css`.
Clases de gráficas compartidas: prefijo `ig-` en `shared/estilos/graficas.css`.
