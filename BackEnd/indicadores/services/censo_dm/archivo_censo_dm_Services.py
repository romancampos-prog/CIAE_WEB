"""
El Censo de pacientes con DM (denominador de DM 05): cuales estan subidos y subir uno nuevo.
Usado en: Controller/censo_dm_Controller.py
"""
import datetime

from fastapi import HTTPException

from compartido.auditoria_Services import registrar
from compartido.validar_archivo_Services import validar_archivo_subido
from datos.bd_ciae.censo_dm_Datos import anios_con_censo_dm, guardar_censo_dm, leer_censo_dm
from datos.excel_subido.excel_censo_dm_Datos import leer_excel_censo_dm
from schemas.model.censo_dm_Model import CensoDMSubido, ResultadoCargaCensoDM
from services.censo_dm.recalcular_censo_dm_Services import recalcular_con_censo_dm


def censos_dm_subidos() -> list[dict]:
    """Cada censo subido (año, archivo y cuando se subio), del mas reciente al mas viejo."""
    censos = []

    for anio in anios_con_censo_dm():
        datos = leer_censo_dm(anio)
        censos.append(CensoDMSubido(anio=anio, archivo=datos.get("ARCHIVO", ""), fecha_carga=datos.get("FECHA_CARGA", "")).model_dump())

    return censos


##--------------------------------------

def subir_censo_dm(usuario: str | None, nombre_archivo: str, contenido: bytes, peso: int, anio: int | None) -> tuple[str, dict]:
    """Endpoint de subir el censo: (mensaje, datos) para la respuesta."""

    # 1. Validar que sea Excel y que pese lo que dijo el front
    validar_archivo_subido(contenido, peso, nombre_archivo)

    # 2. Leer el Excel nacional (lo de Guanajuato); el año sale del titulo y, si no viene, del que mando el front
    try:
        leido = leer_excel_censo_dm(contenido)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))

    anio_censo = leido["anio_detectado"] or anio

    if not anio_censo:
        raise HTTPException(status_code=422, detail="No se encontró el año en el título del censo; indícalo al subirlo.")
    if not leido["unidades"]:
        raise HTTPException(status_code=422, detail="El archivo no trae unidades de Guanajuato.")

    # 3. Guardar en BD_CIAE
    guardar_censo_dm(anio_censo, {
        "ARCHIVO": nombre_archivo,
        "HOJA": leido["hoja"],
        "ANIO": anio_censo,
        "FECHA_CARGA": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
        "UNIDADES": leido["unidades"],
    })

    # 4. Generar o recalcular los meses que usan este censo
    recalculados = recalcular_con_censo_dm(anio_censo)

    # 5. Auditar
    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"archivo=censo_dm_{anio_censo}({nombre_archivo}) bytes={len(contenido)} recalculados={len(recalculados)}")

    mensaje = f"Censo DM {anio_censo} cargado: {len(leido['unidades'])} unidades."
    if recalculados:
        mensaje += f" Se generó o recalculó {', '.join(recalculados)}."

    return mensaje, ResultadoCargaCensoDM(
        anio=anio_censo, archivo=nombre_archivo, unidades=len(leido["unidades"]),
        no_encontradas=leido["no_encontradas"], extras=leido["extras"], recalculados=recalculados,
    ).model_dump()
