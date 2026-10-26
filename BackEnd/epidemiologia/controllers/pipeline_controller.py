"""
Módulo  : pipeline_controller.py
Carpeta : epidemiologia/controllers/
Qué hace: Endpoints para consultar el estado del pipeline y ejecutarlo (responden ApiResponse).
Usado en: main.py (prefix /epidemiologia)
"""
from fastapi import APIRouter, Depends

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from epidemiologia.services.pipeline.estado_pipeline_service import get_estado
from epidemiologia.services.pipeline.iniciar_pipeline_service import iniciar_pipeline

router = APIRouter()


#Get epidemiologia/pipeline/estado
@router.get("/pipeline/estado")
def estado(payload: dict = Depends(solo_roles("admin"))):
    return ApiResponse(success=True, message="Estado del pipeline", data=get_estado())


##--------------------------------------

#Post epidemiologia/pipeline/ejecutar  (409 si ya corre, 400 si falta una base)
@router.post("/pipeline/ejecutar")
def ejecutar(payload: dict = Depends(solo_roles("admin"))):
    mensaje, datos = iniciar_pipeline()
    return ApiResponse(success=True, message=mensaje, data=datos)
