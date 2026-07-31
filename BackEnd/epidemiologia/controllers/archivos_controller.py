"""
Módulo  : archivos_controller.py
Carpeta : epidemiologia/controllers/
Qué hace: Endpoints para subir la base operativa y la base SisCep.
Usado en: main.py (prefix /epidemiologia)
"""
from fastapi import APIRouter, UploadFile, Depends, File, Form, HTTPException
from epidemiologia.config import RUTA_OPERATIVA, RUTA_SISCEP
from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from shared.validarArchivo_service import validarPeso_Archivo
from shared.auditoria_service import registrar

router = APIRouter()


def _validar_xlsx(nombre: str):
    if not nombre.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .xlsx")


@router.post("/archivos/operativa")
async def subir_operativa(
    archivo: UploadFile = File(...),
    pesoArchivo: int = Form(...),
    payload:   dict = Depends(solo_roles("admin"))
):
    _validar_xlsx(archivo.filename)
    contenido = await archivo.read()
    if not validarPeso_Archivo(contenido, pesoArchivo):
        raise HTTPException(status_code=413, detail="Archivo demasiado grande o tamaño inconsistente")
    RUTA_OPERATIVA.parent.mkdir(parents=True, exist_ok=True)
    RUTA_OPERATIVA.write_bytes(contenido)
    registrar("SUBIDA_ARCHIVO", usuario=payload.get("sub"), detalle=f"archivo=operativa.xlsx bytes={len(contenido)}")
    return ApiResponse(success=True, message="Base operativa guardada", data={"nombre": archivo.filename, "bytes": len(contenido)})


@router.post("/archivos/siscep")
async def subir_siscep(
    archivo: UploadFile = File(...),
    pesoArchivo: int = Form(...),
    payload:   dict = Depends(solo_roles("admin"))
):
    _validar_xlsx(archivo.filename)
    contenido = await archivo.read()
    if not validarPeso_Archivo(contenido, pesoArchivo):
        raise HTTPException(status_code=413, detail="Archivo demasiado grande o tamaño inconsistente")
    RUTA_SISCEP.parent.mkdir(parents=True, exist_ok=True)
    RUTA_SISCEP.write_bytes(contenido)
    registrar("SUBIDA_ARCHIVO", usuario=payload.get("sub"), detalle=f"archivo=siscep.xlsx bytes={len(contenido)}")
    return ApiResponse(success=True, message="Base SisCep guardada", data={"nombre": archivo.filename, "bytes": len(contenido)})
