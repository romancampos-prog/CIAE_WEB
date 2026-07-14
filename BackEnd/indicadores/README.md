# Backend: Indicadores Médicos

## Estructura

```
indicadores/
├── ftp/           ← sub-módulo FTP
│   ├── controllers/
│   ├── mapeo/     ← JSONs de configuración por categoría (CACU.json, CAMA.json, etc.)
│   ├── models/
│   ├── services/
│   ├── config.py
│   └── __init__.py
├── iaas/          ← sub-módulo IAAS
│   ├── controllers/
│   ├── mapeo/     ← IAAS.json (semáforo), unidades.json (agrupación por tipo)
│   ├── models/
│   ├── services/
│   ├── config.py
│   └── __init__.py
└── __init__.py
```

## Anatomía de un sub-módulo

```
nombre/
├── controllers/
│   ├── nombre_controller.py   — FastAPI APIRouter; endpoints delgados que llaman al service
│   └── __init__.py
├── mapeo/
│   └── *.json                 — configuración estática (unidades, semáforos, orden, etc.)
├── models/
│   └── nombre_models.py       — Pydantic models para request bodies
├── services/
│   └── nombre_service.py      — lógica de negocio pura, sin FastAPI
├── config.py                  — lee los JSONs de mapeo y exporta constantes
└── __init__.py                — exporta ROUTERS = [(router, prefix), ...]
```

## Cómo se registra en main.py

`main.py` agrega `indicadores/` al `sys.path` para importar `ftp` e `iaas` directamente por nombre. Cada sub-módulo expone `ROUTERS` en su `__init__.py`:

```python
# indicadores/ftp/__init__.py
from .controllers.ftp_controller      import router as _r_ftp
from .controllers.reportes_controller import router as _r_rep

ROUTERS = [
    (_r_ftp, "/ftp"),
    (_r_rep, "/reportes/ftp"),
]
```

```python
# main.py (patrón real)
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "indicadores"))

import ftp as ftp_module
import iaas as iaas_module

for _router, _prefix in ftp_module.ROUTERS:
    app.include_router(_router, prefix=_prefix)

for _router, _prefix in iaas_module.ROUTERS:
    app.include_router(_router, prefix=_prefix)
```

## Patrón de controller

```python
from fastapi import APIRouter, Depends
from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from nombre.services import nombre_service

router = APIRouter()

ROLES_VISTA  = ("admin", "trabajador_ftp", "visitante")
ROLES_EDITAR = ("admin", "trabajador_ftp")

@router.get("/recurso")
def obtener_recurso(payload: dict = Depends(solo_roles(*ROLES_VISTA))):
    datos = nombre_service.obtener()
    return ApiResponse(success=True, message="Recursos obtenidos", data=datos)

@router.post("/recurso")
def crear_recurso(
    body: MiModel,
    payload: dict = Depends(solo_roles(*ROLES_EDITAR))
):
    resultado = nombre_service.crear(body)
    return ApiResponse(success=True, message="Recurso creado", data=resultado)
```

**Reglas:**
- El controller **no** contiene lógica de negocio — solo llama al service
- Siempre responde con `ApiResponse(success, message, data)`
- Autorización con `solo_roles(...)` en cada endpoint
- Nombre de función en `snake_case`
- Ruta en `kebab-case` para palabras compuestas (`/datos-grafica`) o `PascalCase` para sub-recursos (`/IAAS/Generar`)

## Patrón de config.py

```python
import json
from pathlib import Path
from configs.settings import DATA_DIR

_MAPEO = Path(__file__).parent / "mapeo"
_u = json.loads((_MAPEO / "unidades.json").read_text(encoding="utf-8"))

UNIDADES     = _u["UNIDADES"]
ORDEN        = _u["ORDEN"]
RUTA_DATOS   = DATA_DIR / "INDICADORES" / "NOMBRE"
RUTA_JSON    = _MAPEO / "INDICADOR.json"
```

Los JSONs de mapeo son la fuente de verdad de la configuración. No hardcodear en código.

## Patrón de mapeo JSON

`unidades.json` — agrupación y orden de unidades:
```json
{
  "MESES": ["ENERO", "FEBRERO", ...],
  "ORDEN_MODULO01": ["HGS 54 SILAO", ...],
  "UNIDADES_HGS_MODULO01": ["HGS 54 SILAO", ...],
  "UNIDADES_HGZ_MODULO01": [...]
}
```

`INDICADOR.json` — metadatos y semáforo del indicador:
```json
{
  "titulo": "...",
  "formula": "...",
  "semaforo": { "Verde": {...}, "Amarillo": {...} }
}
```

## Agregar un nuevo sub-módulo

**1.** Crear `indicadores/nuevo/` con la anatomía de arriba.

**2.** Escribir `indicadores/nuevo/__init__.py`:
```python
from .controllers.nuevo_controller import router as _r
ROUTERS = [(_r, "/nuevo")]
```

**3.** Registrar en `main.py` siguiendo el mismo patrón de los existentes:
```python
import nuevo as nuevo_module          # importa desde indicadores/ vía sys.path

for _router, _prefix in nuevo_module.ROUTERS:
    app.include_router(_router, prefix=_prefix)
```

## ApiResponse

Wrapper estándar de todas las respuestas:

```python
# configs/response.py
ApiResponse(success=True,  message="Descripción legible", data=payload)
ApiResponse(success=False, message="Descripción del error", data=None)
```

El frontend siempre lee `response.data.data` para los datos y `response.data.success` para el estado.

**Excepción:** el módulo `epidemiologia` no usa `ApiResponse` — devuelve datos directos. No cambiar esto sin actualizar también el frontend.
