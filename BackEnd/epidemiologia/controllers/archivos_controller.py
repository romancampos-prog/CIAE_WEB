"""
Módulo  : archivos_controller.py
Carpeta : epidemiologia/controllers/
Qué hace: Endpoints para subir la base operativa y la base SisCep (responden ApiResponse).
Usado en: Routes/epidemiologia_Route.py (prefix /epidemiologia/archivos)
"""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from epidemiologia.services.dengue.subir_bases_service import subir_base_operativa, subir_base_siscep

archivosApi = APIRouter()


#Post epidemiologia/archivos/operativa
@archivosApi.post("/operativa")
async def subir_operativa(
    archivo:     UploadFile = File(...),
    pesoArchivo: int        = Form(...),
    payload:     dict       = Depends(solo_roles("admin")),
):
    mensaje, datos = subir_base_operativa(payload.get("sub"), archivo.filename, await archivo.read(), pesoArchivo)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post epidemiologia/archivos/siscep
@archivosApi.post("/siscep")
async def subir_siscep(
    archivo:     UploadFile = File(...),
    pesoArchivo: int        = Form(...),
    payload:     dict       = Depends(solo_roles("admin")),
):
    mensaje, datos = subir_base_siscep(payload.get("sub"), archivo.filename, await archivo.read(), pesoArchivo)
    return ApiResponse(success=True, message=mensaje, data=datos)
