"""
/Indicadores/ftp/poblacion: la poblacion InfoSalud que usan como denominador FTP y los cortes
del Extractor (ver el archivo cargado, subir uno nuevo y recalcular lo que ya estaba guardado).
Sigue colgando de /ftp para no cambiarle la ruta al front.
"""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from auth.services.jwt_Services import solo_roles
from configs.response import ApiResponse
from schemas.DTO.poblacion_ViewModel import RecalcularPoblacionRequest
from services.poblacion.archivo_poblacion_Services import archivo_poblacion_actual, subir_poblacion
from services.poblacion.recalcular_poblacion_Services import recalcular_poblacion

poblacionApi = APIRouter()

ROLES_CONSULTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")
ROLES_FTP      = ("admin", "trabajador_ftp")


#Get Indicadores/ftp/poblacion/archivo-actual?anio=2026
@poblacionApi.get("/archivo-actual")
async def archivo_poblacion(anio: str | None = None, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Archivo de población actual", data=archivo_poblacion_actual(anio))


##--------------------------------------

#Post Indicadores/ftp/poblacion/subir
@poblacionApi.post("/subir")
async def subir_archivo_poblacion(
    archivo:     UploadFile = File(...),
    pesoArchivo: int        = Form(...),
    anio:        str | None = Form(None),
    payload:     dict       = Depends(solo_roles(*ROLES_FTP)),
):
    mensaje, datos = subir_poblacion(payload.get("sub"), archivo.filename, await archivo.read(), pesoArchivo, anio)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post Indicadores/ftp/poblacion/recalcular
@poblacionApi.post("/recalcular")
def recalcular_con_poblacion(solicitud: RecalcularPoblacionRequest, payload: dict = Depends(solo_roles(*ROLES_FTP))):
    mensaje, datos = recalcular_poblacion(solicitud.ano)
    return ApiResponse(success=True, message=mensaje, data=datos)
