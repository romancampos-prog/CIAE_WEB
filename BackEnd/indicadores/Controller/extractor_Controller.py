"""
Recibe y procesa el Excel mensual crudo de los indicadores del motor Extractor
(modulo "Extractor" en indicadores/mapeo/: EH 03, DM 04, MT 03). Un solo
Excel del mes (+ su cruce con Egresos) alimenta a TODOS los indicadores del
extractor a la vez -- ver corte_extractor_Services.indicadores_extractor(); cada
uno decide que hacer segun su periodicidad (generacion_extractor_Services).
Usado en: Routes/indicadores_Route.py (prefix /extractor)
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from shared.validarArchivo_service import validarPeso_Archivo
from shared.auditoria_service import registrar
from shared.MESES import MESES_ESTANDAR
from services.extractor.corte_extractor_Services import indicadores_extractor, estado_ventanas, detalle_indicadores_extractor
from services.extractor.generacion_extractor_Services import aplicar_cruce_mes, estado_archivos, procesar_archivo_mensual

extractorApi = APIRouter()


@extractorApi.get("/indicadores")
async def listar_indicadores_extractor(
    payload: dict = Depends(solo_roles("admin", "trabajador_ftp", "visitante")),
):
    return ApiResponse(success=True, message="Indicadores del modulo Extractor", data=indicadores_extractor())


@extractorApi.get("/indicadores/detalle")
async def detalle_indicadores(
    payload: dict = Depends(solo_roles("admin", "trabajador_ftp", "visitante")),
):
    """Por indicador: titulo, periodicidad, corte/mensual, agrupacion y que archivos usa -- todo del mapeo."""
    return ApiResponse(success=True, message="Detalle de indicadores del modulo Extractor", data=detalle_indicadores_extractor())


@extractorApi.get("/estado")
async def estado_meses_subidos(
    anio: int,
    payload: dict = Depends(solo_roles("admin", "trabajador_ftp", "visitante")),
):
    """
    Cuantos de los 12 meses de cada ventana (corte Junio/Diciembre del anio,
    y el Junio siguiente) ya estan subidos -- para que el front muestre el
    avance antes de poder generar el indicador. Un mes cuenta como subido
    solo si ya quedo guardado para TODOS los indicadores del extractor.
    """
    try:
        estado = estado_ventanas(anio)
    except (FileNotFoundError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ApiResponse(success=True, message="Estado de meses subidos", data=estado)


@extractorApi.get("/estado-archivos")
async def estado_archivos_anio(
    anio: int,
    payload: dict = Depends(solo_roles("admin", "trabajador_ftp", "visitante")),
):
    """Por archivo (SUI-13, Egresos...) y mes del año: si ya esta subido y a que indicadores alimenta."""
    try:
        return ApiResponse(success=True, message="Estado de archivos subidos", data=estado_archivos(anio))
    except (FileNotFoundError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))


def _validar_mes(mes: str) -> None:
    if mes not in MESES_ESTANDAR:
        raise HTTPException(status_code=400, detail=f"Mes invalido: '{mes}' -- debe ser uno de {MESES_ESTANDAR}")


async def _leer_excel_subido(archivo: UploadFile, peso: int | None, etiqueta: str) -> bytes:
    if not archivo.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail=f"{etiqueta}: solo se aceptan archivos Excel (.xlsx, .xls)")
    contenido = await archivo.read()
    if peso and not validarPeso_Archivo(contenido, peso):
        raise HTTPException(status_code=413, detail=f"{etiqueta}: archivo demasiado grande o tamaño inconsistente")
    return contenido


def _responder(resultados: dict, mes: str, anio: int, usuario: str | None, detalle_auditoria: str) -> ApiResponse:
    """
    Cada indicador se procesa por separado: si todos fallaron (ej. el archivo es de
    otro mes) es un error de la subida; si solo algunos, los demas ya quedaron guardados.
    """
    fallidos = {ind: r["error"] for ind, r in resultados.items() if "error" in r}
    procesados = [ind for ind in resultados if ind not in fallidos]
    if not procesados:
        raise HTTPException(status_code=422, detail="\n".join(dict.fromkeys(fallidos.values())))

    algun_corte = any(r.get("corte_generado") for r in resultados.values())
    cortes_recalc = sorted({c for r in resultados.values() for c in r.get("cortes_recalculados", [])})
    registrar(
        "SUBIDA_ARCHIVO",
        usuario=usuario,
        detalle=f"{detalle_auditoria} indicadores={procesados}"
                + (f" fallidos={list(fallidos)}" if fallidos else "")
                + (f" cortes_recalculados={cortes_recalc}" if cortes_recalc else ""),
    )

    mensaje = f"{mes} {anio} procesado para {', '.join(procesados)}"
    if algun_corte:
        mensaje += " (corte generado)"
    if cortes_recalc:
        mensaje += f" -- se recalculó también el corte de {', '.join(cortes_recalc)}, que ya estaba cerrado"
    if fallidos:
        mensaje += f" -- no se pudo procesar {', '.join(fallidos)}"
    return ApiResponse(success=True, message=mensaje, data=resultados)


@extractorApi.post("/subir")
async def subir_archivo_mensual(
    anio:           int          = Form(...),
    mes:            str          = Form(...),   # "Enero".."Diciembre"
    archivo:        UploadFile   = File(...),   # el Excel del mes; el nombre no importa, se valida por su contenido
    pesoArchivo:    int          = Form(...),
    archivoBase:    str          = Form("SUI_13"),   # que archivo es (SUI_13, EGRESOS_TOCO...) -- decide que indicadores se procesan
    archivoCruce:   UploadFile | None = File(None),   # Egresos opcional; tambien se puede subir despues en /subir-cruce
    pesoArchivoCruce: int | None = Form(None),
    payload:        dict         = Depends(solo_roles("admin", "trabajador_ftp")),
):
    _validar_mes(mes)
    contenido = await _leer_excel_subido(archivo, pesoArchivo, archivoBase)
    contenido_cruce = await _leer_excel_subido(archivoCruce, pesoArchivoCruce, "Egresos Pacientes") if archivoCruce is not None else None

    try:
        resultados = procesar_archivo_mensual(anio, mes, contenido, contenido_cruce, archivo=archivoBase)
    except (FileNotFoundError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return _responder(
        resultados, mes, anio, payload.get("sub"),
        f"archivo=extractor-{archivoBase}({mes} {anio}, {archivo.filename}) bytes={len(contenido)}"
        + (f" egresos={archivoCruce.filename}" if archivoCruce is not None else ""),
    )


@extractorApi.post("/subir-cruce")
async def subir_archivo_cruce(
    anio:        int        = Form(...),
    mes:         str        = Form(...),
    archivo:     UploadFile = File(...),   # EGRESOS_PACIENTES_DIARIA_MM_AAAA.xlsx
    pesoArchivo: int        = Form(...),
    payload:     dict       = Depends(solo_roles("admin", "trabajador_ftp")),
):
    """Egresos por separado: completa la via 2 de los indicadores con cruce usando lo que dejo el SUI-13 de ese mes."""
    _validar_mes(mes)
    contenido = await _leer_excel_subido(archivo, pesoArchivo, "Egresos Pacientes")
    resultados = aplicar_cruce_mes(anio, mes, contenido)
    return _responder(
        resultados, mes, anio, payload.get("sub"),
        f"archivo=extractor-cruce({mes} {anio}, {archivo.filename}) bytes={len(contenido)}",
    )
