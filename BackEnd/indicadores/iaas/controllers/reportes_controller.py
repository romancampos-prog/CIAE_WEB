"""
Endpoints de reportes IAAS (generar, descargar, datos para gráfica).
Usado en: iass/__init__.py expuesto en main.py (prefix /reportes)
"""
import base64
import io
import json
import traceback
from typing import Optional, List

from fastapi import APIRouter, Query, Depends, HTTPException, UploadFile, File, Form

from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from iaas.services.procesar_service import procesar_IAAS as ProcesarIAAS
from iaas.services.generar_iaas import (
    Excel_IAAS01, Excel_IAAS02, Excel_IAAS03,
    Excel_IAAS04, Excel_IAAS05, Excel_IAAS06,
    RUTA_BASE_IAAS,
)
from iaas.services.datos_json_service import leer_indicador_anio
from iaas.services.grafica_service import (
    calcular_datos_grafica_iaas,
    NOMBRE_A_NUM_IAAS as _NOMBRE_A_NUM_IAAS,
)

router = APIRouter()

ROLES_IAAS      = ("admin", "trabajador_IAAS")
ROLES_IAAS_GRAF = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")


@router.get("/IAAS/meses-guardados")
async def IAAS_meses_guardados(
    anio:    str = Query(...),
    payload: dict = Depends(solo_roles(*ROLES_IAAS_GRAF))
):
    data = next((d for n in range(1, 7) if (d := leer_indicador_anio(anio, n))), None)
    if not data:
        return ApiResponse(success=True, message="Sin datos guardados", data={"meses": []})

    meses = sorted(
        num for nombre, num in _NOMBRE_A_NUM_IAAS.items()
        if nombre in data.get("MESES", {})
    )
    return ApiResponse(success=True, message="Meses guardados obtenidos", data={"meses": meses})


_EXCEL_POR_IND = {
    "IAAS 01": Excel_IAAS01, "IAAS 02": Excel_IAAS02,
    "IAAS 03": Excel_IAAS03, "IAAS 04": Excel_IAAS04,
    "IAAS 05": Excel_IAAS05, "IAAS 06": Excel_IAAS06,
}

@router.get("/IAAS/descargar")
async def IAAS_descargar(
    anio:      str           = Query(...),
    indicador: Optional[str] = Query(None),
    payload:   dict          = Depends(solo_roles(*ROLES_IAAS))
):
    from iaas.services.generar_iaas import Excel_IAAS_Completo

    if indicador and indicador in _EXCEL_POR_IND:
        num       = indicador.replace("IAAS ", "").zfill(2)
        stream    = _EXCEL_POR_IND[indicador](anio)
        nombre    = f"IAAS_{num}_{anio}.xlsx"
        contenido = stream.read()
    else:
        # Siempre se genera al momento, nunca se sirve un archivo guardado de antes.
        stream    = Excel_IAAS_Completo(anio, "0", {})
        contenido = stream.read()
        nombre    = f"IAAS_{anio}.xlsx"

    return ApiResponse(success=True, message=nombre, data={
        "archivo_b64":    base64.b64encode(contenido).decode("utf-8"),
        "nombre_archivo": nombre,
    })


@router.get("/IAAS/datos-grafica")
async def IAAS_datos_grafica(
    anio:    str = Query(...),
    payload: dict = Depends(solo_roles(*ROLES_IAAS_GRAF))
):
    return ApiResponse(
        success=True, message="Datos de gráfica IAAS obtenidos",
        data=calcular_datos_grafica_iaas(anio),
    )


@router.post("/IAAS/Generar")
async def recibir_datos_iass(
    anio:                       str                  = Form(...),
    mes:                        str                  = Form(...),
    numerador:                  List[UploadFile]     = File(default=[]),
    denominador:                Optional[str]        = Form(None),
    excel_denominador_IAAS_01: Optional[UploadFile] = File(None),
    payload:                    dict                 = Depends(solo_roles(*ROLES_IAAS))
):
    try:
        numerador_bytes            = {f.filename: await f.read() for f in numerador}
        excel_denominador_01_bytes = await excel_denominador_IAAS_01.read() if excel_denominador_IAAS_01 else None
        denominador_dict           = json.loads(denominador) if denominador else {}

        resultado = ProcesarIAAS(
            anio                       = anio,
            mes                        = mes,
            numerador                  = numerador_bytes,
            denominador                = denominador_dict,
            excel_denominador_IAAS_01 = excel_denominador_01_bytes
        )
        return ApiResponse(success=True, message=resultado["mensaje"], data={
            "archivo_b64":    resultado["archivo_b64"],
            "nombre_archivo": resultado["nombre_archivo"]
        })
    except ValueError as e:
        msg = str(e)
        try:
            detail = json.loads(msg)
        except Exception:
            detail = msg
        raise HTTPException(status_code=400, detail=detail)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al recibir datos IAAS: {str(e)}")
