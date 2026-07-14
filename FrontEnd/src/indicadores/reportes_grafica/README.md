# Sub-módulo: Reportes / Gráfica

Permite configurar y descargar reportes Excel personalizados de indicadores FTP. El usuario elige indicadores, unidades, semanas y período; el backend genera el Excel y lo devuelve en base64.

## Estructura

```
reportes_grafica/
├── api/
│   └── reportes.js            — getReporte, getConfigReporte
├── componentes/
│   ├── avisos/
│   │   └── ToastWarning.jsx   — alerta flotante de advertencia al usuario
│   ├── InformacionIndicador/
│   │   ├── InformacionIndicador.jsx  — ficha técnica del indicador (fórmula, descripción)
│   │   └── operacionParser.js        — parsea fórmulas matemáticas a texto legible
│   └── modal/
│       └── ModalExito.jsx     — modal de confirmación al descargar exitosamente
├── paginas/
│   ├── ConfigPage.jsx         — formulario de configuración del reporte
│   └── pageGraficas.jsx       — previsualización de gráfica antes de descargar
└── routes/
    └── GraficaRoutes.jsx
```

## Flujo de navegación

```
/CIAE/IndicadoresMedicos/Grafica/Config          → ConfigPage
/CIAE/IndicadoresMedicos/Grafica/GraficaReporte  → pageGraficas (previsualización)
/CIAE/IndicadoresMedicos/Grafica/Restricciones   → Restriciones.jsx (página global)
```

> `Restriciones.jsx` vive en `src/paginas/restricciones/` — es una página global del proyecto, **no** del sub-módulo. Se accede desde aquí pero no pertenece a `reportes_grafica/`.

## Reglas de navegación

- `ConfigPage` → `pageGraficas`: `navigate('/CIAE/IndicadoresMedicos/Grafica/GraficaReporte')`
- `ConfigPage` → `Restricciones`: `navigate('/CIAE/IndicadoresMedicos/Grafica/Restricciones')`
- `pageGraficas` → atrás: `navigate('/CIAE/IndicadoresMedicos/Grafica/Config')`
- `Restriciones` → atrás: `navigate('/CIAE/IndicadoresMedicos/Grafica/Config')`

**Nunca `navigate(-1)`** — las restricciones pueden llegarse desde distintos flujos y el historial no es predecible.

## Agregar una página nueva en este sub-módulo

1. Crear `paginas/NuevaPagina.jsx`
2. Registrar en `routes/GraficaRoutes.jsx`:

```jsx
import NuevaPagina from '../paginas/NuevaPagina'
// ...
<Route path="Nueva" element={<NuevaPagina />} />
```

URL resultante: `/CIAE/IndicadoresMedicos/Grafica/Nueva`
