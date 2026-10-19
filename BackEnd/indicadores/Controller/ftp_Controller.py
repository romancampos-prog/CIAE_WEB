"""
/Indicadores/ftp: generacion de los indicadores que salen de los reportes SIAIS del FTP (al
terminar quedan guardados en BD_CIAE; el Excel se pide aparte a /Indicadores/excel) y la
poblacion InfoSalud que usan como denominador.
"""
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from schemas.DTO.indicadores_ViewModel import (
    GenerarCategoriaRequest, GenerarIndicadorRequest, RecalcularPoblacionRequest, RegenerarCategoriaRequest,
    RegenerarIndicadorRequest,
)
from services.bd_Ciae_Guardado_Services import meses_con_datos
from services.ftp.generacion_indicador_ftp_Services import (
    generar_categoria, generar_indicador, indicadores_para_generar, recalcular_poblacion, regenerar_categoria,
    regenerar_indicador,
)
from services.poblacion_Services import archivo_poblacion_actual, subir_poblacion

ftpApi = APIRouter()

ROLES_CONSULTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")
ROLES_FTP      = ("admin", "trabajador_ftp")


#Get Indicadores/ftp/indicadores
@ftpApi.get("/indicadores")
async def indicadores_ftp(payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Indicadores del modulo FTP", data=indicadores_para_generar())


##--------------------------------------

#Get Indicadores/ftp/meses-generados?indicador=CAMA 01&ano=2026
@ftpApi.get("/meses-generados")
async def meses_generados_ftp(indicador: str = Query(...), ano: str = Query(...), payload: dict = Depends(solo_roles(*ROLES_FTP))):
    return ApiResponse(success=True, message="Meses con datos obtenidos", data={"meses": meses_con_datos(indicador, ano)})


##--------------------------------------

# Los endpoints que generan no son async: FastAPI los corre en un hilo aparte y la descarga del
# FTP no bloquea el servidor.
#Get Indicadores/ftp/generar?indicador=CAMA 01&ano=2026&mes=07&semana=3 (semana es opcional)
@ftpApi.get("/generar")
def generar_indicador_ftp(solicitud: GenerarIndicadorRequest = Depends(), payload: dict = Depends(solo_roles(*ROLES_FTP))):
    mensaje, datos = generar_indicador(solicitud.indicador, solicitud.ano, solicitud.mes, solicitud.semana)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post Indicadores/ftp/regenerar  (mes definitivo que ya estaba generado; exige contrasena)
@ftpApi.post("/regenerar")
def regenerar_indicador_ftp(solicitud: RegenerarIndicadorRequest, payload: dict = Depends(solo_roles(*ROLES_FTP))):
    mensaje, datos = regenerar_indicador(payload.get("sub"), solicitud.password, solicitud.indicador, solicitud.ano, solicitud.mes)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post Indicadores/ftp/generar-categoria
@ftpApi.post("/generar-categoria")
def generar_categoria_ftp(solicitud: GenerarCategoriaRequest, payload: dict = Depends(solo_roles(*ROLES_FTP))):
    exito, mensaje, datos = generar_categoria(solicitud.categoria, solicitud.ano, solicitud.mes, solicitud.semana)
    return ApiResponse(success=exito, message=mensaje, data=datos)


##--------------------------------------

#Post Indicadores/ftp/regenerar-categoria  (mes definitivo que la categoria ya tenia generado; exige contrasena)
@ftpApi.post("/regenerar-categoria")
def regenerar_categoria_ftp(solicitud: RegenerarCategoriaRequest, payload: dict = Depends(solo_roles(*ROLES_FTP))):
    exito, mensaje, datos = regenerar_categoria(payload.get("sub"), solicitud.password, solicitud.categoria, solicitud.ano, solicitud.mes)
    return ApiResponse(success=exito, message=mensaje, data=datos)


##--------------------------------------

#Get Indicadores/ftp/poblacion/archivo-actual?anio=2026
@ftpApi.get("/poblacion/archivo-actual")
async def archivo_poblacion(anio: str | None = None, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Archivo de población actual", data=archivo_poblacion_actual(anio))


##--------------------------------------

#Post Indicadores/ftp/poblacion/subir
@ftpApi.post("/poblacion/subir")
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
@ftpApi.post("/poblacion/recalcular")
def recalcular_con_poblacion(solicitud: RecalcularPoblacionRequest, payload: dict = Depends(solo_roles(*ROLES_FTP))):
    mensaje, datos = recalcular_poblacion(solicitud.ano)
    return ApiResponse(success=True, message=mensaje, data=datos)
