"""
Endpoints de reportes IAAS (generar, descargar, datos para gráfica).
Usado en: iass/__init__.py expuesto en main.py (prefix /reportes)
"""
import json
import traceback
from typing import Optional, List

from fastapi import APIRouter, Query, Depends, HTTPException, UploadFile, File, Form

from configs.response import ApiResponse
from auth.services.jwt_utils import solo_roles
from iaas.services.procesar_service import procesar_IAAS as ProcesarIAAS
from iaas.services.datos_json_service import leer_indicador_anio
from iaas.services.grafica_service import NOMBRE_A_NUM_IAAS as _NOMBRE_A_NUM_IAAS
from shared.validarArchivo_service import validarPeso_Archivo
from shared.auditoria_service import registrar

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

    meses_guardados = {m.upper() for m in data.get("MESES", {})}
    meses = sorted(
        num for nombre, num in _NOMBRE_A_NUM_IAAS.items()
        if nombre in meses_guardados
    )
    return ApiResponse(success=True, message="Meses guardados obtenidos", data={"meses": meses})


@router.post("/IAAS/Generar")
async def recibir_datos_iass(
    anio:                       str                  = Form(...),
    mes:                        str                  = Form(...),
    numerador:                  List[UploadFile]     = File(default=[]),
    pesoNumerador:               List[int]           = Form(default=[]),
    denominador:                Optional[str]        = Form(None),
    excel_denominador_IAAS_01: Optional[UploadFile] = File(None),
    peso_excel_denominador_IAAS_01: Optional[int] = Form(None),
    payload:                    dict                 = Depends(solo_roles(*ROLES_IAAS))
):
    # Validación de tamaño va ANTES del try/except de abajo: si no, el
    # "except Exception" genérico atraparía nuestro HTTPException(413) y
    # lo convertiría en un 500 en vez de dejarlo pasar como 413.
    if len(numerador) != len(pesoNumerador):
        raise HTTPException(status_code=400, detail="Falta el peso declarado de alguno de los archivos")

    numerador_bytes = {}
    for archivo, peso in zip(numerador, pesoNumerador):
        contenido = await archivo.read()
        if not validarPeso_Archivo(contenido, peso):
            raise HTTPException(status_code=413, detail=f"Archivo '{archivo.filename}' demasiado grande o tamaño inconsistente")
        numerador_bytes[archivo.filename] = contenido

    excel_denominador_01_bytes = None
    if excel_denominador_IAAS_01:
        excel_denominador_01_bytes = await excel_denominador_IAAS_01.read()
        if not validarPeso_Archivo(excel_denominador_01_bytes, peso_excel_denominador_IAAS_01):
            raise HTTPException(status_code=413, detail="Archivo del denominador demasiado grande o tamaño inconsistente")

    try:
        denominador_dict = json.loads(denominador) if denominador else {}

        resultado = ProcesarIAAS(
            anio                       = anio,
            mes                        = mes,
            numerador                  = numerador_bytes,
            denominador                = denominador_dict,
            excel_denominador_IAAS_01 = excel_denominador_01_bytes
        )
        registrar("SUBIDA_ARCHIVO", usuario=payload.get("sub"), detalle=f"IAAS/Generar anio={anio} mes={mes} archivos={len(numerador_bytes)}")
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
