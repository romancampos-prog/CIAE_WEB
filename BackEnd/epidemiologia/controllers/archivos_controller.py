"""
Módulo  : archivos_controller.py
Carpeta : epidemeologia/controllers/
Qué hace: Endpoints para subir la base operativa y la base SisCep.
Usado en: main.py (prefix /epidemiologia)
"""
from fastapi import APIRouter, UploadFile, Depends, File, HTTPException
from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles

router = APIRouter()


def _validar_xlsx(nombre: str):
    if not nombre.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .xlsx")


@router.post("/archivos/operativa")
async def subir_operativa(
    archivo: UploadFile = File(...),
    payload:   dict = Depends(solo_roles("admin"))
):
    _validar_xlsx(archivo.filename)
    RUTA_OPERATIVA.parent.mkdir(parents=True, exist_ok=True)
    contenido = await archivo.read()
    RUTA_OPERATIVA.write_bytes(contenido)
    return ApiResponse(success=True, message="Base operativa guardada", data={"nombre": archivo.filename, "bytes": len(contenido)})


@router.post("/archivos/siscep")
async def subir_siscep(
    archivo: UploadFile = File(...),
    payload:   dict = Depends(solo_roles("admin"))
):
    _validar_xlsx(archivo.filename)
    RUTA_SISCEP.parent.mkdir(parents=True, exist_ok=True)
    contenido = await archivo.read()
    RUTA_SISCEP.write_bytes(contenido)
    return ApiResponse(success=True, message="Base SisCep guardada", data={"nombre": archivo.filename, "bytes": len(contenido)})
