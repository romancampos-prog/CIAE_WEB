"""
Módulo  : pipeline_Controller.py
Carpeta : epidemiologia/Controller/
Qué hace: Endpoints para consultar el estado del pipeline y ejecutarlo (responden ApiResponse).
Usado en: Routes/epidemiologia_Route.py (prefix /epidemiologia/pipeline)
"""
from fastapi import APIRouter, Depends

from auth.services.jwt_Services import solo_roles
from configs.response import ApiResponse
from epidemiologia.services.dengue.pipeline.estado_pipeline_Services import estado_del_pipeline
from epidemiologia.services.dengue.pipeline.iniciar_pipeline_Services import iniciar_pipeline

pipelineApi = APIRouter()


#Get epidemiologia/pipeline/estado
@pipelineApi.get("/estado")
def estado(payload: dict = Depends(solo_roles("admin"))):
    return ApiResponse(success=True, message="Estado del pipeline", data=estado_del_pipeline())


##--------------------------------------

#Post epidemiologia/pipeline/ejecutar  (409 si ya corre, 400 si falta una base)
@pipelineApi.post("/ejecutar")
def ejecutar(payload: dict = Depends(solo_roles("admin"))):
    mensaje, datos = iniciar_pipeline()
    return ApiResponse(success=True, message=mensaje, data=datos)
