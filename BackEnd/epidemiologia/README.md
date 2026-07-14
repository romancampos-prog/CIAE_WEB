# Backend: Epidemiología

Análisis de dengue. Procesa archivos CSV (base operativa + SisCep), ejecuta un pipeline de análisis y expone resultados por sección (canal endémico, mapa de brotes, alertas, duplicados).

## Estructura

```
epidemiologia/
├── controllers/
│   ├── archivos_controller.py    — carga de archivos CSV al servidor
│   ├── pipeline_controller.py    — estado y ejecución del pipeline
│   └── reportes_controller.py    — consulta de resultados por sección
├── mapeo/
│   ├── gto_normalizado.json      — nombres normalizados de municipios de Guanajuato
│   └── cp_coordenadas.csv        — coordenadas geográficas por código postal
├── modulos/                      — algoritmos de análisis (funciones puras)
│   ├── alertas.py                — detección de alertas epidemiológicas
│   ├── clustering.py             — agrupación de casos
│   ├── depuracion.py             — limpieza de datos
│   ├── duplicados.py             — detección de registros duplicados
│   ├── fechas.py                 — utilidades de semana epidemiológica
│   ├── generador_mapas.py        — construcción de datos para el mapa de brotes
│   └── series_tiempo.py          — canal endémico y series temporales
├── services/
│   ├── pipeline_service.py       — orquesta el pipeline completo
│   ├── canal_service.py          — datos para la sección canal
│   ├── mapa_service.py           — datos para la sección mapa
│   ├── alertas_service.py        — datos para la sección alertas
│   └── clustering_service.py     — datos de clustering
├── config.py                     — RUTA_OPERATIVA, RUTA_SISCEP, RUTA_RESULTADOS
└── __init__.py                   — exporta ROUTERS
```

## Diferencia crítica vs Indicadores: sin ApiResponse

Los endpoints de epidemiología devuelven **datos directos**, no `ApiResponse`:

```python
# Indicadores — usa ApiResponse
return ApiResponse(success=True, message="...", data=resultado)

# Epidemiología — datos directos
return {"canal": datos, "semanas": semanas, "unidades": lista}
```

El frontend lee la respuesta con `({ data }) => setDatos(data)` — `data` es el objeto directamente. Si se agrega `ApiResponse`, el frontend se rompe. **Cambiar ambos lados a la vez o no cambiar ninguno.**

## El pipeline

El pipeline es el núcleo del módulo. Transforma los archivos CSV en resultados de análisis listos para consumir:

```
Archivos cargados (POST /archivos/operativa, /archivos/siscep)
    ↓
pipeline_service.iniciar_pipeline()
    ↓
depuracion → duplicados → clustering → series_tiempo → alertas → generador_mapas
    ↓
Resultados guardados en disco (RUTA_RESULTADOS)
    ↓
Endpoints de reportes leen los resultados y los sirven al frontend
```

El pipeline corre en un hilo separado. `get_estado()` devuelve `{ corriendo: bool, logs: [...] }` para que el frontend haga polling y muestre el progreso.

## Patrón de controller (epidemiología)

```python
from fastapi import APIRouter, Depends
from auth.services.jwt_utils import solo_roles
from epidemiologia.services import canal_service

router = APIRouter()

@router.get("/canal")
def get_canal(payload: dict = Depends(solo_roles("admin"))):
    return canal_service.obtener_canal()   # devuelve dict directamente, sin ApiResponse
```

## modulos/ vs services/

| `modulos/` | `services/` |
|---|---|
| Algoritmos de análisis puros | Orquestación y preparación de datos |
| No conocen rutas de archivo | Sí conocen `config.py` y las rutas |
| Reciben DataFrames y devuelven resultados | Leen archivos, llaman módulos, devuelven respuesta |
| Se pueden probar unitariamente | Se prueban integrados |

## Agregar una sección de análisis

**1.** Crear el algoritmo en `modulos/nueva_seccion.py` (función pura, sin I/O de archivo)

**2.** Crear `services/nueva_seccion_service.py`:
```python
from epidemiologia.config import RUTA_RESULTADOS
from epidemiologia.modulos import nueva_seccion

def obtener_nueva():
    # leer resultados del disco o calcular
    return nueva_seccion.calcular(datos)
```

**3.** Añadir endpoint en `controllers/reportes_controller.py`:
```python
from epidemiologia.services import nueva_seccion_service

@router.get("/nueva-seccion")
def get_nueva(payload: dict = Depends(solo_roles("admin"))):
    return nueva_seccion_service.obtener_nueva()
```

**4.** Si debe ejecutarse en el pipeline, integrarlo en `pipeline_service.py`

**5.** En frontend: añadir función en `dengue/api/reportes.js` y página en `dengue/paginas/`

## Archivos de mapeo

`gto_normalizado.json` — normaliza nombres de municipios en los CSV (variaciones de escritura → nombre canónico):
```json
{ "IRAPUATO": "Irapuato", "LEON": "León", ... }
```

`cp_coordenadas.csv` — coordenadas para trazar brotes en el mapa:
```
cp,lat,lng
36000,20.677,-101.354
```
