"""
Módulo  : reportes_controller.py
Carpeta : epidemiologia/controllers/
Qué hace: Endpoints para consultar canal endémico, mapas, alertas y duplicados de dengue.
          Responden el dato directo (SIN ApiResponse): el front depende de eso.
Usado en: main.py (prefix /epidemiologia)
"""
from fastapi import APIRouter, Depends, HTTPException

from auth.services.jwt_utils import solo_roles
from epidemiologia.services.pipeline.estado_pipeline_service import get_resultado

router = APIRouter()


def _exigir(clave: str):
    datos = get_resultado(clave)
    if datos is None:
        raise HTTPException(status_code=404, detail="Sin datos — ejecuta el pipeline primero")
    return datos


##--------------------------------------

@router.get("/reportes/canal")
def canal(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("canal")


##--------------------------------------

@router.get("/reportes/mapa/{tipo}")
def mapa(tipo: str, payload: dict = Depends(solo_roles("admin"))):
    if tipo not in ("situacion", "confirmados"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'situacion' o 'confirmados'")
    return _exigir("mapa")[tipo]


##--------------------------------------

@router.get("/reportes/alertas-siscep")
def alertas_siscep(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("alertas")


##--------------------------------------

@router.get("/reportes/duplicados")
def duplicados(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("duplicados")


##--------------------------------------

@router.get("/reportes/posibles-duplicados")
def posibles_duplicados(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("posibles_duplicados")
