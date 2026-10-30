"""
/Indicadores/censo-dm: el Censo de pacientes con DM, denominador de DM 05 (ver los que estan
subidos y subir uno nuevo, que genera o recalcula los meses que lo usan).
"""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from auth.services.jwt_Services import solo_roles
from configs.response import ApiResponse
from services.censo_dm.archivo_censo_dm_Services import censos_dm_subidos, subir_censo_dm

censoDmApi = APIRouter()

ROLES_CONSULTA  = ("admin", "trabajador_ftp", "visitante")
ROLES_EXTRACTOR = ("admin", "trabajador_ftp")


#Get Indicadores/censo-dm/subidos
@censoDmApi.get("/subidos")
async def censos_subidos(payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Censos DM subidos", data=censos_dm_subidos())


##--------------------------------------

#Post Indicadores/censo-dm/subir
@censoDmApi.post("/subir")
async def subir_archivo_censo(
    archivo:     UploadFile = File(...),
    pesoArchivo: int        = Form(...),
    anio:        int | None = Form(None),
    payload:     dict       = Depends(solo_roles(*ROLES_EXTRACTOR)),
):
    mensaje, datos = subir_censo_dm(payload.get("sub"), archivo.filename, await archivo.read(), pesoArchivo, anio)
    return ApiResponse(success=True, message=mensaje, data=datos)
