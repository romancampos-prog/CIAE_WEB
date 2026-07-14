# Sub-módulo: IAAS

Captura y visualiza los 6 indicadores de **Infecciones Asociadas a la Atención de la Salud** (IAAS 01–06). El usuario carga archivos Excel por unidad y captura denominadores manuales; el backend genera los 6 reportes.

## Estructura

```
iaas/
├── api/
│   └── IAAS.js           — getUnidadesIAAS, getIndicadoresIAAS, generarIAAS,
│                            getSesionIAAS, descargarIAASGuardado, getIAASMesesGuardados,
│                            getIAASDatosGrafica, completarUnidadTardia, infoBasicaInAass
├── componentes/
│   ├── graficas/
│   │   └── TickMesUnidad.jsx     — tick personalizado en eje X con etiqueta HGS/Otros
│   ├── modalUnidadTardia/
│   │   └── ModalUnidadTardia.jsx — captura de unidades con entrega fuera de tiempo
│   └── IAASGraficasContenido.jsx — gráficas de los 6 indicadores (3 vistas)
├── constantes/
│   └── colores.js        — INDICADORES = ['IAAS 01'…'IAAS 06'], COLOR_IND, HGS_COLOR
├── hooks/
│   └── useIAASGrafica.js — carga datos históricos, calcula chartData por vista
│                            (unidad / mes / acumulado), maneja descargas
├── paginas/
│   ├── IAASLanding.jsx        — menú: "Ver datos" / "Nuevo reporte"
│   ├── IAASPage.jsx           — captura de archivos y denominadores por unidad
│   ├── IAASErrorToast.jsx     — toast de error flotante (errores de validación simples)
│   ├── IAASValidacionPanel.jsx — panel de advertencias antes de generar
│   └── iass.css               — estilos del sub-módulo (prefijo `ia-`)
├── routes/
│   └── IAASRoutes.jsx
└── utils/
    └── calculos.js       — mesDisponible, calcularFaltantes, calcularColorIAAS,
                             calcularRangos01, buildChartDataUnidad, buildChartDataMes
```

## Flujo de navegación

```
/CIAE/IndicadoresMedicos/IAAS           → IAASLanding (menú del sub-módulo)
/CIAE/IndicadoresMedicos/IAAS/Reporte   → IAASPage (captura)
/CIAE/IndicadoresMedicos/Graficas       → GraficasUnificadasPage (con IAAS en el drawer)
```

## Los 6 indicadores

La lista canónica vive en `constantes/colores.js → INDICADORES`. Para agregar un indicador:

1. Añadir su ID en `INDICADORES` y su color en `COLOR_IND`
2. Registrar su semáforo y metadatos en `BackEnd/indicadores/iaas/mapeo/IAAS.json`
3. Agregar la función generadora en `BackEnd/indicadores/iaas/services/generar_iaas.py`
4. Registrar en `_EXCEL_POR_IND` de `BackEnd/indicadores/iaas/controllers/reportes_controller.py`

## IAAS 01 es especial

IAAS 01 tiene umbrales de semáforo distintos por **tipo de unidad** (HGS / HGZ / HGR / HGO / HGP). El mapa unidad→tipo vive en `BackEnd/indicadores/iaas/config.py → UNIDAD_TIPO_IAAS01` y se alimenta de `mapeo/unidades.json`.

En el frontend, `calcularColorIAAS()` en `utils/calculos.js` recibe el mapa `unidadTipoMap` para aplicar el umbral correcto por unidad.

## Hook: useIAASGrafica — modo controlado vs independiente

El hook puede operar en dos modos:

```js
// Modo controlado — el indicador se gestiona desde afuera (GraficasUnificadasPage)
const hook = useIAASGrafica(extIndSel, onExtChange)

// Modo independiente — el hook gestiona su propio estado de indicador
const hook = useIAASGrafica()
```

Cuando se usa desde `IAASGraficasContenido` dentro de `GraficasUnificadasPage`, siempre es modo controlado: `extIndSel` es el estado del drawer y `onExtChange = setIndSel` del padre.

## Panel de colores en vista acumulado

`useIAASGrafica` exporta dos versiones del estado de colores del panel lateral:
- `unidadesStatus` — color basado en el último mes disponible
- `unidadesStatusDisplay` — color ajustado a la tasa acumulada cuando `vistaGrafica === 'acumulado'`

`IAASGraficasContenido` usa `unidadesStatusDisplay` para que el panel sea coherente con la gráfica en todas las vistas.

## Sesión de período

Cuando el usuario empieza a cargar archivos para un mes, el backend guarda el progreso en disco (`/iass/sesion`). Al recargar la página o cambiar el período, `getSesionIAAS(anio, mes)` recupera qué unidades ya tienen datos y cuáles faltan.

## Prefijo CSS

Clases de este sub-módulo: prefijo `ia-`. Archivo principal: `paginas/iass.css`.
Clases de gráficas compartidas: prefijo `ig-` en `shared/estilos/graficas.css`.
