import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

#mis archivos
from auth.services.auth_service import verificar_credenciales
from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from schemas.DTO.generacion_iaas_ViewModel import SesionIAASRequest
from schemas.model.generacion_iaas_Model import DenominadoresCapturados, MesesGuardadosIAAS
from shared.auditoria_service import registrar
from shared.validarArchivo_service import validarPeso_Archivo
from services.iaas.extraccion_excel_iaas_Services import ErroresValidacionExcel
from services.iaas.generacion_iaas_Services import SesionIAASVaciaError, completar_unidad_tardia, generar_iaas
from services.iaas.info_iaas_Services import indicadores_para_generar, unidades_iaas
from services.iaas.sesion_iaas_Services import armar_sesion, meses_guardados_iaas, nombre_del_mes

#/Indicadores/iaas  (INFORMACION Y GENERACION DE IAAS: al terminar queda guardado en BD_CIAE;
#el Excel se pide aparte a /Indicadores/excel)
iaasApi = APIRouter()

ROLES_IAAS_VISTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")
ROLES_IAAS_FULL  = ("admin", "trabajador_IAAS")


async def _leer_archivo_validado(archivo: UploadFile, peso: int, etiqueta: str) -> bytes:
    contenido = await archivo.read()
    if not validarPeso_Archivo(contenido, peso):
        raise HTTPException(status_code=413, detail=f"{etiqueta} demasiado grande o tamaño inconsistente")
    return contenido


def _detalle_de(error: ErroresValidacionExcel) -> list[str]:
    return error.mensajes


#Get Indicadores/iaas/unidades
@iaasApi.get("/unidades")
async def UnidadesIAAS(payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA))):
    return ApiResponse(success=True, message="Unidades IAAS obtenidas", data=unidades_iaas())


#Get Indicadores/iaas/indicadores
@iaasApi.get("/indicadores")
async def IndicadoresGenerarIAAS(payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA))):
    return ApiResponse(success=True, message="Indicadores IAAS obtenidos", data=indicadores_para_generar())


#Get Indicadores/iaas/meses-guardados?anio=2026
@iaasApi.get("/meses-guardados")
async def MesesGuardadosIAASEndpoint(anio: str, payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA))):
    return ApiResponse(
        success=True, message="Meses guardados obtenidos",
        data=MesesGuardadosIAAS(meses=meses_guardados_iaas(anio)).model_dump(),
    )


#Get Indicadores/iaas/sesion?anio=2026&mes=03
@iaasApi.get("/sesion")
async def SesionIAASEndpoint(solicitud: SesionIAASRequest = Depends(), payload: dict = Depends(solo_roles(*ROLES_IAAS_VISTA))):
    sesion = armar_sesion(solicitud.anio, solicitud.mes)
    if sesion is None:
        return ApiResponse(success=True, message="Sin sesión para este período", data=None)
    return ApiResponse(success=True, message="Sesión encontrada", data=sesion.model_dump())


#Post Indicadores/iaas/generar  (multipart: numerador[] es un Excel por unidad, con el nombre de
#unidad como nombre de archivo; denominador es JSON {indicador: {unidad: valor}})
@iaasApi.post("/generar")
async def GenerarIAAS(
    anio:                           str                = Form(...),
    mes:                            str                = Form(...),
    numerador:                      list[UploadFile]   = File(default=[]),
    pesoNumerador:                  list[int]          = Form(default=[]),
    denominador:                    str | None         = Form(None),
    excel_denominador_IAAS_01:      UploadFile | None  = File(None),
    peso_excel_denominador_IAAS_01: int | None         = Form(None),
    payload:                        dict               = Depends(solo_roles(*ROLES_IAAS_FULL)),
):
    if len(numerador) != len(pesoNumerador):
        raise HTTPException(status_code=400, detail="Falta el peso declarado de alguno de los archivos")

    numerador_por_unidad: dict[str, bytes] = {}
    for archivo, peso in zip(numerador, pesoNumerador):
        numerador_por_unidad[archivo.filename] = await _leer_archivo_validado(archivo, peso, f"Archivo '{archivo.filename}'")

    excel_den01_bytes = None
    if excel_denominador_IAAS_01:
        excel_den01_bytes = await _leer_archivo_validado(excel_denominador_IAAS_01, peso_excel_denominador_IAAS_01, "Archivo del denominador")

    denominador_capturado: DenominadoresCapturados = json.loads(denominador) if denominador else {}

    try:
        resultado = generar_iaas(anio, mes, numerador_por_unidad, denominador_capturado, excel_den01_bytes)
    except ErroresValidacionExcel as error:
        raise HTTPException(status_code=400, detail=_detalle_de(error))

    registrar("SUBIDA_ARCHIVO", usuario=payload.get("sub"), detalle=f"IAAS/generar anio={anio} mes={mes} archivos={len(numerador_por_unidad)}")
    return ApiResponse(success=True, message=resultado.mensaje, data=resultado.model_dump())


#Post Indicadores/iaas/completar-unidad  (requiere contrasena)
@iaasApi.post("/completar-unidad")
async def CompletarUnidadIAAS(
    anio:                          str               = Form(...),
    mes:                           str               = Form(...),
    unidad:                        str               = Form(...),
    indicadores:                   str               = Form(...),   # JSON: ["IAAS 01", ...]
    denominadores:                 str               = Form(...),   # JSON: {"IAAS 02": "125", ...}
    password:                      str               = Form(...),
    excel_unidad:                  UploadFile | None = File(None),
    peso_excel_unidad:              int | None        = Form(None),
    excel_denominador_iaas01:       UploadFile | None = File(None),
    peso_excel_denominador_iaas01:  int | None        = Form(None),
    payload:                        dict              = Depends(solo_roles(*ROLES_IAAS_FULL)),
):
    usuario = payload.get("sub")
    if not verificar_credenciales(usuario, password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    indicadores_list: list[str] = json.loads(indicadores)
    denominadores_dict: dict    = json.loads(denominadores)

    excel_bytes = await _leer_archivo_validado(excel_unidad, peso_excel_unidad, "Archivo de la unidad") if excel_unidad else None
    excel_den01_bytes = (
        await _leer_archivo_validado(excel_denominador_iaas01, peso_excel_denominador_iaas01, "Archivo del denominador")
        if excel_denominador_iaas01 else None
    )

    try:
        resultado = completar_unidad_tardia(anio, mes, unidad, indicadores_list, denominadores_dict, excel_bytes, excel_den01_bytes)
    except ErroresValidacionExcel as error:
        raise HTTPException(status_code=400, detail=_detalle_de(error))
    except SesionIAASVaciaError as error:
        raise HTTPException(status_code=400, detail=str(error))

    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"IAAS/completar-unidad unidad={unidad} anio={anio} mes={mes}")
    mes_nombre = nombre_del_mes(mes)
    return ApiResponse(success=True, message=f"Unidad {unidad} actualizada en {mes_nombre} {anio}", data=resultado.model_dump())
