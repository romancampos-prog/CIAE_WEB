# Sub-módulo: FTP

Descarga datos del servidor FTP y genera reportes Excel por indicador, categoría y período. Los indicadores se organizan por categorías: CACU, CAMA, EH, DM, MT, CUPN, S_Ob, CE.

## Estructura

```
ftp/
├── api/
│   ├── indicadores.js    — getAllIndicadores, getIndicadoresFTP, getCategorias
│   └── poblacion.js      — getPoblacion, actualizarPoblacion
├── componentes/
│   ├── graficasFTP/
│   │   ├── FTPGraficasContenido.jsx  — gráficas FTP dentro de GraficasUnificadasPage
│   │   ├── GBarras.jsx / FilterPanel.jsx / ChartTooltip.jsx
│   └── modalPoblacion/
│       └── ModalPoblacion.jsx        — edición de cifras de población
├── constantes/
│   └── colores.js        — CAT_COLOR {CACU, CAMA, ...}, COLOR_IND, INDICADORES
├── hooks/
│   ├── useFTPGrafica.js  — carga datos históricos, chart data, descargas
│   └── useIndicadores.js — lista de indicadores disponibles desde la API
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

Los indicadores llegan del backend automáticamente vía `getAllIndicadores()`. Para añadir uno:

1. Crear `BackEnd/indicadores/ftp/mapeo/NUEVO.json` con la estructura de los existentes (CACU, CAMA, etc.)
2. Registrar la categoría en `BackEnd/indicadores/ftp/config.py`
3. Añadir el color en `constantes/colores.js → CAT_COLOR` si es categoría nueva

No se necesita cambiar código del frontend si la categoría ya tiene color.

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
