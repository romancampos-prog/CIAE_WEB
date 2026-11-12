"""
/Indicadores/extractor: el Excel crudo mensual de cada archivo (SUI-13, Egresos TOCO...) se
procesa para los indicadores del motor Extractor que el mapeo le asigna (mapeo/extractor/).
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth.services.jwt_Services import solo_roles
from auth.services.roles_Services import GENERAN_INDICADORES, VEN_PAGINAS_GENERAR
from configs.response import ApiResponse
from services.extractor.estado_archivos_Services import estado_archivos
from services.extractor.estado_cortes_Services import estado_ventanas
from services.extractor.pagina_generar_extractor_Services import indicadores_para_generar
from services.extractor.subir_archivo_extractor_Services import generar_archivo_mensual

extractorApi = APIRouter()

# Un archivo o un mapeo que no cuadra con lo que se esperaba (mes equivocado, columna faltante...).
ERRORES_DE_DATOS = (FileNotFoundError, KeyError, ValueError)


#Get Indicadores/extractor/indicadores
@extractorApi.get("/indicadores")
async def indicadores_extractor(payload: dict = Depends(solo_roles(*VEN_PAGINAS_GENERAR))):
    return ApiResponse(success=True, message="Indicadores del modulo Extractor", data=indicadores_para_generar())


##--------------------------------------

#Get Indicadores/extractor/estado-cortes?anio=2026  (cuantos de los 12 meses de cada corte ya estan subidos)
@extractorApi.get("/estado-cortes")
async def estado_cortes(anio: int, payload: dict = Depends(solo_roles(*VEN_PAGINAS_GENERAR))):
    try:
        return ApiResponse(success=True, message="Estado de meses subidos", data=estado_ventanas(anio))
    except ERRORES_DE_DATOS as error:
        raise HTTPException(status_code=422, detail=str(error))


##--------------------------------------

#Get Indicadores/extractor/estado-archivos?anio=2026  (por archivo y mes: si ya esta subido)
@extractorApi.get("/estado-archivos")
async def estado_archivos_anio(anio: int, payload: dict = Depends(solo_roles(*VEN_PAGINAS_GENERAR))):
    try:
        return ApiResponse(success=True, message="Estado de archivos subidos", data=estado_archivos(anio))
    except ERRORES_DE_DATOS as error:
        raise HTTPException(status_code=422, detail=str(error))


##--------------------------------------

#Post Indicadores/extractor/generar  (el Excel de un mes; el nombre no importa, se valida por su contenido)
@extractorApi.post("/generar")
async def generar_mes_extractor(
    anio:             int               = Form(...),
    mes:              str               = Form(...),   # "Enero".."Diciembre"
    archivo:          UploadFile        = File(...),
    pesoArchivo:      int               = Form(...),
    archivoBase:      str               = Form("SUI_13"),   # que archivo es (SUI_13, EGRESOS_TOCO...): decide que indicadores se procesan
    payload:          dict              = Depends(solo_roles(*GENERAN_INDICADORES)),
):
    contenido = await archivo.read()

    try:
        mensaje, datos = generar_archivo_mensual(payload.get("sub"), anio, mes, archivo.filename, contenido, pesoArchivo, archivoBase)
    except ERRORES_DE_DATOS as error:
        raise HTTPException(status_code=422, detail=str(error))

    return ApiResponse(success=True, message=mensaje, data=datos)

