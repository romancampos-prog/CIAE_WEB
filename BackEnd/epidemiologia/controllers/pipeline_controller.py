"""
Módulo  : pipeline_controller.py
Carpeta : epidemeologia/controllers/
Qué hace: Endpoints para consultar el estado del pipeline y ejecutarlo.
Usado en: main.py (prefix /epidemiologia)
"""
from fastapi import APIRouter, HTTPException, Depends
from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from epidemiologia.services import pipeline_service
from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles

router = APIRouter()


@router.get("/pipeline/estado")
def estado(
    payload:   dict = Depends(solo_roles("admin"))
):
    return ApiResponse(success=True, message="Estado del pipeline", data=pipeline_service.get_estado())


@router.post("/pipeline/ejecutar")
def ejecutar(
    payload:   dict = Depends(solo_roles("admin"))
):
    estado = pipeline_service.get_estado()

    if estado["corriendo"]:
        raise HTTPException(status_code=409, detail="El pipeline ya está en ejecución")
    if not RUTA_OPERATIVA.exists():
        raise HTTPException(status_code=400, detail="Falta la base operativa")
    if not RUTA_SISCEP.exists():
        raise HTTPException(status_code=400, detail="Falta la base SisCep")

    pipeline_service.iniciar_pipeline()
    return ApiResponse(success=True, message="Pipeline iniciado", data=None)
