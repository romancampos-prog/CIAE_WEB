"""
/Indicadores/ftp: generacion de los indicadores que salen de los reportes SIAIS del FTP (al
terminar quedan guardados en BD_CIAE; el Excel se pide aparte a /Indicadores/excel). La
poblacion InfoSalud que usan como denominador esta en poblacion_Controller.py.
"""
from fastapi import APIRouter, Depends, Query

from auth.services.jwt_Services import solo_roles
from configs.response import ApiResponse
from schemas.DTO.ftp_ViewModel import (
    GenerarCategoriaRequest, GenerarIndicadorRequest, RegenerarCategoriaRequest, RegenerarIndicadorRequest,
)
from services.ftp.generar_categoria_ftp_Services import generar_categoria, regenerar_categoria
from services.ftp.generar_indicador_ftp_Services import generar_indicador, regenerar_indicador
from services.ftp.pagina_generar_ftp_Services import indicadores_para_generar, meses_generados_ftp

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
async def meses_generados(indicador: str = Query(...), ano: str = Query(...), payload: dict = Depends(solo_roles(*ROLES_FTP))):
    return ApiResponse(success=True, message="Meses con datos obtenidos", data={"meses": meses_generados_ftp(indicador, ano)})


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
