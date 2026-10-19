"""
/Indicadores/extractor: el Excel crudo mensual de cada archivo (SUI-13, Egresos TOCO...) se
procesa para los indicadores del motor Extractor que el mapeo le asigna (mapeo/extractor/).
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from services.extractor.corte_extractor_Services import estado_ventanas
from services.extractor.generacion_extractor_Services import completar_cruce, estado_archivos, generar_archivo_mensual, indicadores_para_generar

extractorApi = APIRouter()

ROLES_CONSULTA = ("admin", "trabajador_ftp", "visitante")
ROLES_EXTRACTOR = ("admin", "trabajador_ftp")
# Un archivo o un mapeo que no cuadra con lo que se esperaba (mes equivocado, columna faltante...).
ERRORES_DE_DATOS = (FileNotFoundError, KeyError, ValueError)


#Get Indicadores/extractor/indicadores
@extractorApi.get("/indicadores")
async def indicadores_extractor(payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Indicadores del modulo Extractor", data=indicadores_para_generar())


##--------------------------------------

#Get Indicadores/extractor/estado-cortes?anio=2026  (cuantos de los 12 meses de cada corte ya estan subidos)
@extractorApi.get("/estado-cortes")
async def estado_cortes(anio: int, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    try:
        return ApiResponse(success=True, message="Estado de meses subidos", data=estado_ventanas(anio))
    except ERRORES_DE_DATOS as error:
        raise HTTPException(status_code=422, detail=str(error))


##--------------------------------------

#Get Indicadores/extractor/estado-archivos?anio=2026  (por archivo y mes: si ya esta subido)
@extractorApi.get("/estado-archivos")
async def estado_archivos_anio(anio: int, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
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
    archivoCruce:     UploadFile | None = File(None),       # Egresos opcional; tambien se puede subir despues en /completar-cruce
    pesoArchivoCruce: int | None        = Form(None),
    payload:          dict              = Depends(solo_roles(*ROLES_EXTRACTOR)),
):
    contenido = await archivo.read()
    contenido_cruce = await archivoCruce.read() if archivoCruce is not None else None
    try:
        mensaje, datos = generar_archivo_mensual(
            payload.get("sub"), anio, mes, archivo.filename, contenido, pesoArchivo, archivoBase,
            archivoCruce.filename if archivoCruce is not None else None, contenido_cruce, pesoArchivoCruce,
        )
    except ERRORES_DE_DATOS as error:
        raise HTTPException(status_code=422, detail=str(error))
    return ApiResponse(success=True, message=mensaje, data=datos)


##--------------------------------------

#Post Indicadores/extractor/completar-cruce  (Egresos por separado: completa la via 2 con lo que dejo el SUI-13 del mes)
@extractorApi.post("/completar-cruce")
async def completar_cruce_mes(
    anio:        int        = Form(...),
    mes:         str        = Form(...),
    archivo:     UploadFile = File(...),   # EGRESOS_PACIENTES_DIARIA_MM_AAAA.xlsx
    pesoArchivo: int        = Form(...),
    payload:     dict       = Depends(solo_roles(*ROLES_EXTRACTOR)),
):
    mensaje, datos = completar_cruce(payload.get("sub"), anio, mes, archivo.filename, await archivo.read(), pesoArchivo)
    return ApiResponse(success=True, message=mensaje, data=datos)
