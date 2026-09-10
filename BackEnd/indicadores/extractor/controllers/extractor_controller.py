"""
Recibe y procesa el Excel mensual crudo de los indicadores del modulo Extractor
(EH 03, DM 04 por ahora -- fuente "extractor" en indicadores/mapeo/).
Un solo Excel del mes (+ su cruce con Egresos) alimenta a TODOS los
indicadores del extractor a la vez -- ver INDICADORES_EXTRACTOR en config.py.
Usado en: extractor/__init__.py (prefix /extractor)
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from auth.services.jwt_utils import solo_roles
from configs.response import ApiResponse
from shared.validarArchivo_service import validarPeso_Archivo
from shared.auditoria_service import registrar
from shared.MESES import MESES_ESTANDAR
from extractor.config import INDICADORES_EXTRACTOR
from extractor.services.extractor_service import procesar_archivo_mensual, estado_ventanas

router = APIRouter()


@router.get("/indicadores")
async def listar_indicadores_extractor(
    payload: dict = Depends(solo_roles("admin", "trabajador_ftp", "visitante")),
):
    return ApiResponse(success=True, message="Indicadores del modulo Extractor", data=INDICADORES_EXTRACTOR)


@router.get("/estado")
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


@router.post("/subir")
async def subir_archivo_mensual(
    anio:           int          = Form(...),
    mes:            str          = Form(...),   # "Enero".."Diciembre"
    archivo:        UploadFile   = File(...),   # SUI_13_MM_AAAA.xlsx
    pesoArchivo:    int          = Form(...),
    archivoCruce:   UploadFile | None = File(None),   # EGRESOS_PACIENTES_DIARIA_MM_AAAA.xlsx
    pesoArchivoCruce: int | None = Form(None),
    payload:        dict         = Depends(solo_roles("admin", "trabajador_ftp")),
):
    if mes not in MESES_ESTANDAR:
        raise HTTPException(status_code=400, detail=f"Mes invalido: '{mes}' -- debe ser uno de {MESES_ESTANDAR}")

    if not archivo.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    contenido = await archivo.read()
    if not validarPeso_Archivo(contenido, pesoArchivo):
        raise HTTPException(status_code=413, detail="Archivo demasiado grande o tamaño inconsistente")

    contenido_cruce = None
    if archivoCruce is not None:
        if not archivoCruce.filename.endswith((".xlsx", ".xls")):
            raise HTTPException(status_code=400, detail="El archivo de cruce debe ser Excel (.xlsx, .xls)")
        contenido_cruce = await archivoCruce.read()
        if pesoArchivoCruce and not validarPeso_Archivo(contenido_cruce, pesoArchivoCruce):
            raise HTTPException(status_code=413, detail="Archivo de cruce demasiado grande o tamaño inconsistente")

    try:
        resultados = procesar_archivo_mensual(anio, mes, contenido, contenido_cruce)
    except (FileNotFoundError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    algun_corte = any(r["corte_generado"] for r in resultados.values())
    registrar(
        "SUBIDA_ARCHIVO",
        usuario=payload.get("sub"),
        detalle=f"archivo=extractor({mes} {anio}, {archivo.filename}) bytes={len(contenido)} indicadores={list(resultados.keys())}",
    )

    return ApiResponse(
        success=True,
        message=f"{mes} {anio} procesado para {', '.join(resultados.keys())}" + (" (corte generado)" if algun_corte else ""),
        data=resultados,
    )
