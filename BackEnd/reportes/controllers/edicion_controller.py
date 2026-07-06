"""
Módulo  : edicion_controller.py
Carpeta : reportes/controllers/
Qué hace: Endpoints para editar título, descripción y semáforo de indicadores FTP.
Usado en: main.py (prefix /reportes/editar)
"""
from fastapi import APIRouter, HTTPException, Depends
from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from reportes.services import editar_service
from reportes.models.edicion_models import InfoGeneralUpdate, SemaforoUpdate

router = APIRouter()


@router.post("/InfoGeneral")
async def EditarInformacionGeneral(data: InfoGeneralUpdate, payload: dict = Depends(solo_roles("admin"))):
    try:
        resultado = editar_service.editar_general(data)
        if resultado.get("status") == "error":
            raise HTTPException(status_code=400, detail=resultado.get("message"))
        return ApiResponse(success=True, message=f"Indicador {data.id_indicador} actualizado", data=None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/infoSemaforo")
async def EditarSemaforo(data: SemaforoUpdate, payload: dict = Depends(solo_roles("admin"))):
    try:
        resultado = editar_service.editar_semaforo(data)
        if resultado.get("status") == "error":
            raise HTTPException(status_code=400, detail=resultado.get("message"))
        return ApiResponse(success=True, message=f"Semáforo de {data.id_indicador} actualizado correctamente", data=None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
