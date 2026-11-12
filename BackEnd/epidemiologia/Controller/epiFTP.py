
from datetime import date

from fastapi import APIRouter, Depends, File, Form, UploadFile

from auth.services.jwt_Services import solo_roles
from auth.services.roles_Services import EDITAN_EPIDEMIOLOGIA, INTERNOS, UNIDAD, VEN_ACCIONES
from configs.response import ApiResponse
from ..services.ftp.consulta_extraccion_Services import consultar_extraccion
from ..schemas.DTO.estatus_accion_ViewModel import CambioEstatus
from ..services.ftp.estatus_acciones_Services import cambiar_estatus
from ..services.ftp.estudios_acciones_Services import descargar_estudio, subir_estudio
from ..services.ftp.excel_extraccion_Services import excel_de_extraccion
from ..services.ftp.ftpExtraer import ftp_Extraer_Epidemeologia
from ..services.ftp.periodos_extraccion_Services import periodos_de_extraccion

ftpApi = APIRouter()

#Post epidemiologia/ftp/extraer/OC30  (semana vacia = definitivo del mes)
@ftpApi.post("/extraer/OC30")
def ftpExtraer(ano: int, mes: int, semana: int | None = None, payload: dict = Depends(solo_roles(*EDITAN_EPIDEMIOLOGIA))):
    archivo: str = "AccionesOC30"
    mensaje, datos = ftp_Extraer_Epidemeologia(ano, mes, semana, archivo)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Get epidemiologia/ftp/extraccion/OC30?ano=2026&mes=9  (definitivo del mes o, si aun no hay, su ultima semana)
@ftpApi.get("/extraccion/OC30")
def ftpConsultar(ano: int, mes: int, payload: dict = Depends(solo_roles(*VEN_ACCIONES))):
    archivo: str = "AccionesOC30"
    # El usuario de unidad solo ve las filas de su unidad (los nombres vienen en el token) y no los errores
    es_unidad = payload.get("rol") == UNIDAD
    unidades_usuario = payload.get("unidades", []) if es_unidad else None
    mensaje, datos = consultar_extraccion(ano, mes, archivo, unidades_usuario, not es_unidad)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Get epidemiologia/ftp/extraccion/OC30/periodos?ano=2026  (meses con extraccion: definitivo o ultima semana)
@ftpApi.get("/extraccion/OC30/periodos")
def ftpPeriodos(ano: int, payload: dict = Depends(solo_roles(*VEN_ACCIONES))):
    archivo: str = "AccionesOC30"
    mensaje, datos = periodos_de_extraccion(ano, archivo)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Get epidemiologia/ftp/excel/OC30?desde=2026-08-01&hasta=2026-10-21  (el rango puede abarcar varios meses)
@ftpApi.get("/excel/OC30")
def ftpExcel(desde: date, hasta: date, payload: dict = Depends(solo_roles(*VEN_ACCIONES))):
    archivo: str = "AccionesOC30"
    unidades_usuario = payload.get("unidades", []) if payload.get("rol") == UNIDAD else None
    mensaje, datos = excel_de_extraccion(desde, hasta, archivo, unidades_usuario, payload.get("sub", "-"))
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post epidemiologia/ftp/estatus/OC30  {id, estatus}  (quien edita Epidemiología: No revisado / En proceso / Con estudio)
@ftpApi.post("/estatus/OC30")
def ftpEstatus(cambio: CambioEstatus, payload: dict = Depends(solo_roles(*EDITAN_EPIDEMIOLOGIA))):
    archivo: str = "AccionesOC30"
    mensaje, datos = cambiar_estatus(archivo, cambio.id, cambio.estatus, payload.get("sub", "-"))
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post epidemiologia/ftp/estudio/OC30  (form: ano, mes, id, archivo, pesoArchivo y password si reemplaza; quien edita Epidemiología y solo "Con estudio")
@ftpApi.post("/estudio/OC30")
async def ftpSubirEstudio(
    ano:         int        = Form(...),
    mes:         int        = Form(...),
    id:          str        = Form(..., min_length=1, max_length=64),
    archivo:     UploadFile = File(...),
    pesoArchivo: int        = Form(...),
    password:    str | None = Form(None),
    payload:     dict       = Depends(solo_roles(*EDITAN_EPIDEMIOLOGIA)),
):
    extraccion: str = "AccionesOC30"
    mensaje, datos = subir_estudio(extraccion, ano, mes, id, archivo.filename or "", await archivo.read(), pesoArchivo, payload.get("sub", "-"), password)
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Get epidemiologia/ftp/estudio/OC30?id=...  (el Excel del estudio de un registro, en base64; internos, no la unidad)
@ftpApi.get("/estudio/OC30")
def ftpDescargarEstudio(id: str, payload: dict = Depends(solo_roles(*INTERNOS))):
    extraccion: str = "AccionesOC30"
    mensaje, datos = descargar_estudio(extraccion, id)
    return ApiResponse(success=True, message=mensaje, data=datos)
