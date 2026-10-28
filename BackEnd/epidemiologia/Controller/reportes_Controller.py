"""
Módulo  : reportes_Controller.py
Carpeta : epidemiologia/Controller/
Qué hace: Endpoints para consultar canal endémico, mapas, alertas y duplicados de dengue.
          Responden el dato directo (SIN ApiResponse): el front depende de eso.
Usado en: Routes/epidemiologia_Route.py (prefix /epidemiologia/reportes)
"""
from fastapi import APIRouter, Depends, HTTPException

from auth.services.jwt_Services import solo_roles
from epidemiologia.services.dengue.pipeline.estado_pipeline_Services import resultado_guardado

reportesApi = APIRouter()


def _exigir(clave: str):
    datos = resultado_guardado(clave)
    if datos is None:
        raise HTTPException(status_code=404, detail="Sin datos — ejecuta el pipeline primero")
    return datos


##--------------------------------------

@reportesApi.get("/canal")
def canal(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("canal")


##--------------------------------------

@reportesApi.get("/mapa/{tipo}")
def mapa(tipo: str, payload: dict = Depends(solo_roles("admin"))):
    if tipo not in ("situacion", "confirmados"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'situacion' o 'confirmados'")
    return _exigir("mapa")[tipo]


##--------------------------------------

@reportesApi.get("/alertas-siscep")
def alertas_siscep(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("alertas")


##--------------------------------------

@reportesApi.get("/duplicados")
def duplicados(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("duplicados")


##--------------------------------------

@reportesApi.get("/posibles-duplicados")
def posibles_duplicados(payload: dict = Depends(solo_roles("admin"))):
    return _exigir("posibles_duplicados")
