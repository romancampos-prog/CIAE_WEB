# Módulo: Indicadores Médicos

Módulo raíz que agrupa los sub-módulos **FTP**, **IAAS** y **Grafica**. Cada sub-módulo es una unidad autónoma con su propia carpeta, rutas y lógica interna.

## Estructura

```
indicadores/
├── ftp/                    ← indicadores desde servidor FTP
├── iaas/                   ← infecciones asociadas a la atención de la salud
├── reportes_grafica/       ← configuración y descarga de reportes personalizados
├── shared/                 ← código compartido entre todos los sub-módulos
│   ├── componentes/
│   │   └── graficas/       ← GraficaBarras, PanelUnidades, SemaforoUmbral, VistaToggle
│   ├── constantes/         ← meses.js, semaforo.js
│   └── utils/              ← download.js
└── routes/
    └── IndicadoresRoutes.jsx
```

## Patrón de rutas

`IndicadoresRoutes.jsx` es el único punto de entrada del módulo. Registra cada sub-módulo con wildcard `/*` para que cada uno gestione sus propias rutas internas:

```jsx
// routes/IndicadoresRoutes.jsx
<Routes>
  <Route index            element={<HubIndicadoresMedicos />} />
  <Route path="Graficas"  element={<GraficasUnificadasPage />} />
  <Route path="Generar"   element={<GenerarHub />} />
  <Route path="FTP/*"     element={<FTPRoutes />} />
  <Route path="IAAS/*"    element={<IAASRoutes />} />
  <Route path="Grafica/*" element={<GraficaRoutes />} />
</Routes>
```

URL resultante: `/CIAE/IndicadoresMedicos/FTP/Generar`

El router raíz del proyecto (`src/routes/Routes.jsx`) delega con `path="IndicadoresMedicos/*"`.

## Anatomía de un sub-módulo

Todos los sub-módulos siguen exactamente esta estructura:

```
nombre/
├── api/
│   └── Nombre.js          — funciones axios exportadas con nombre (no default)
├── componentes/           — componentes React exclusivos de este sub-módulo
├── constantes/
│   └── colores.js         — colores e IDs de indicadores
├── hooks/
│   └── useNombreGrafica.js — lógica de estado, carga de datos, cálculos
├── paginas/
│   ├── NombreLanding.jsx  — pantalla de menú / bienvenida del sub-módulo
│   └── NombrePage.jsx     — acción principal (generar, capturar, etc.)
├── routes/
│   └── NombreRoutes.jsx   — <Routes> interno del sub-módulo
└── utils/
    └── calculos.js        — funciones puras sin React
```

## Agregar un nuevo sub-módulo

**1.** Crear `indicadores/nuevo/routes/NuevoRoutes.jsx`:

```jsx
import { Routes, Route } from 'react-router-dom'
import NuevoLanding from '../paginas/NuevoLanding'

export default function NuevoRoutes() {
  return (
    <Routes>
      <Route index element={<NuevoLanding />} />
    </Routes>
  )
}
```

**2.** Registrar en `routes/IndicadoresRoutes.jsx`:

```jsx
import NuevoRoutes from '../nuevo/routes/NuevoRoutes'
// ...
<Route path="Nuevo/*" element={<NuevoRoutes />} />
```

**3.** Añadir tarjeta de acceso en `FTPPage.jsx` (hub principal del módulo).

## Shared — qué va aquí y qué no

| Pertenece a `shared/` | No pertenece |
|---|---|
| Componentes de gráficas reutilizables | Componentes de UI de un solo sub-módulo |
| Constantes de meses y semáforo | Constantes de colores por módulo |
| Utilidad de descarga base64 | Lógica de cálculo específica de un indicador |

## Reglas fijas

- `navigate()` siempre con ruta absoluta. **Nunca `navigate(-1)`**.
- Imports agrupados: bloque `// react` primero, luego `// propios`.
- Constantes de meses y semáforo vienen de `shared/constantes/` — no redeclarar localmente.
- Cada sub-módulo tiene su prefijo CSS propio (`ftp-`, `ia-`, etc.). No mezclar clases entre módulos.
- No hay path aliases (`@/`) — usar rutas relativas.
