"""
/Indicadores/iaas: generacion de los 6 indicadores de IAAS de un mes (al terminar quedan
guardados en BD_CIAE; el Excel se pide aparte a /Indicadores/excel).
"""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from schemas.DTO.iaas_ViewModel import EstadoMesIAASRequest
from services.iaas.completar_unidad_iaas_Services import completar_unidad_tardia
from services.iaas.estado_mes_iaas_Services import estado_del_mes, meses_generados_iaas
from services.iaas.generar_mes_iaas_Services import generar_iaas
from services.iaas.pagina_generar_iaas_Services import indicadores_para_generar, unidades_iaas

iaasApi = APIRouter()

ROLES_CONSULTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")
ROLES_IAAS     = ("admin", "trabajador_IAAS")


#Get Indicadores/iaas/unidades
@iaasApi.get("/unidades")
async def unidades(payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Unidades IAAS obtenidas", data=unidades_iaas())


##--------------------------------------

#Get Indicadores/iaas/indicadores
@iaasApi.get("/indicadores")
async def indicadores_iaas(payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Indicadores IAAS obtenidos", data=indicadores_para_generar())


##--------------------------------------

#Get Indicadores/iaas/meses-generados?anio=2026
@iaasApi.get("/meses-generados")
async def meses_generados(anio: str, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Meses guardados obtenidos", data={"meses": meses_generados_iaas(anio)})


##--------------------------------------

#Get Indicadores/iaas/estado-mes?anio=2026&mes=03  (lo guardado y las unidades pendientes del mes)
@iaasApi.get("/estado-mes")
async def estado_mes(solicitud: EstadoMesIAASRequest = Depends(), payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    estado = estado_del_mes(solicitud.anio, solicitud.mes)
    if estado is None:
        return ApiResponse(success=True, message="Sin sesión para este período", data=None)
    return ApiResponse(success=True, message="Sesión encontrada", data=estado.model_dump())


##--------------------------------------

#Post Indicadores/iaas/generar  (multipart: numerador[] es un Excel por unidad, con el nombre de
#unidad como nombre de archivo; denominador es JSON {indicador: {unidad: valor}})
@iaasApi.post("/generar")
async def generar_mes_iaas(
    anio:                           str                = Form(...),
    mes:                            str                = Form(...),
    numerador:                      list[UploadFile]   = File(default=[]),
    pesoNumerador:                  list[int]          = Form(default=[]),
    denominador:                    str | None         = Form(None),
    excel_denominador_IAAS_01:      UploadFile | None  = File(None),
    peso_excel_denominador_IAAS_01: int | None         = Form(None),
    payload:                        dict               = Depends(solo_roles(*ROLES_IAAS)),
):
    archivos_numerador = [(archivo.filename, await archivo.read()) for archivo in numerador]
    excel_denominador = await excel_denominador_IAAS_01.read() if excel_denominador_IAAS_01 else None
    mensaje, datos = generar_iaas(
        payload.get("sub"), anio, mes, archivos_numerador, pesoNumerador, denominador, excel_denominador, peso_excel_denominador_IAAS_01,
    )
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post Indicadores/iaas/completar-unidad  (unidad que entrego tarde; requiere contrasena)
@iaasApi.post("/completar-unidad")
async def completar_unidad(
    anio:                           str               = Form(...),
    mes:                            str               = Form(...),
    unidad:                         str               = Form(...),
    indicadores:                    str               = Form(...),   # JSON: ["IAAS 01", ...]
    denominadores:                  str               = Form(...),   # JSON: {"IAAS 02": "125", ...}
    password:                       str               = Form(...),
    excel_unidad:                   UploadFile | None = File(None),
    peso_excel_unidad:              int | None        = Form(None),
    excel_denominador_iaas01:       UploadFile | None = File(None),
    peso_excel_denominador_iaas01:  int | None        = Form(None),
    payload:                        dict              = Depends(solo_roles(*ROLES_IAAS)),
):
    mensaje, datos = completar_unidad_tardia(
        payload.get("sub"), password, anio, mes, unidad, indicadores, denominadores,
        await excel_unidad.read() if excel_unidad else None, peso_excel_unidad,
        await excel_denominador_iaas01.read() if excel_denominador_iaas01 else None, peso_excel_denominador_iaas01,
    )
    return ApiResponse(success=True, message=mensaje, data=datos)
