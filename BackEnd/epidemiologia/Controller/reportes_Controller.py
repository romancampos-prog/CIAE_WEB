"""
Módulo  : reportes_Controller.py
Carpeta : epidemiologia/Controller/
Qué hace: Endpoints para consultar canal endémico, mapas, alertas y duplicados de dengue.
          Responden el dato directo (SIN ApiResponse): el front depende de eso.
Usado en: Routes/epidemiologia_Route.py (prefix /epidemiologia/reportes)
"""
from fastapi import APIRouter, Depends, HTTPException

from auth.services.jwt_Services import solo_roles
from auth.services.roles_Services import VEN_DENGUE
from epidemiologia.services.dengue.mapa_Services import TIPOS_MAPA
from epidemiologia.services.dengue.pipeline.estado_pipeline_Services import resultado_guardado

reportesApi = APIRouter()


def _exigir(clave: str):
    datos = resultado_guardado(clave)
    if datos is None:
        raise HTTPException(status_code=404, detail="Sin datos — ejecuta el pipeline primero")
    return datos


##--------------------------------------

@reportesApi.get("/canal")
def canal(payload: dict = Depends(solo_roles(*VEN_DENGUE))):
    return _exigir("canal")


##--------------------------------------

@reportesApi.get("/mapa/{tipo}")
def mapa(tipo: str, payload: dict = Depends(solo_roles(*VEN_DENGUE))):
    if tipo not in TIPOS_MAPA:
        raise HTTPException(status_code=400, detail=f"tipo debe ser uno de {', '.join(TIPOS_MAPA)}")
    mapa_guardado = _exigir("mapa").get(tipo, {})
    # Resultados guardados antes de los mapas de residencia y unidad (sin 'tabla')
    if "tabla" not in mapa_guardado:
        raise HTTPException(status_code=404, detail="Mapa con formato anterior — vuelve a ejecutar el pipeline")
    return mapa_guardado


##--------------------------------------

@reportesApi.get("/alertas-siscep")
def alertas_siscep(payload: dict = Depends(solo_roles(*VEN_DENGUE))):
    return _exigir("alertas")


##--------------------------------------

@reportesApi.get("/duplicados")
def duplicados(payload: dict = Depends(solo_roles(*VEN_DENGUE))):
    return _exigir("duplicados")


##--------------------------------------

@reportesApi.get("/posibles-duplicados")
def posibles_duplicados(payload: dict = Depends(solo_roles(*VEN_DENGUE))):
    return _exigir("posibles_duplicados")
