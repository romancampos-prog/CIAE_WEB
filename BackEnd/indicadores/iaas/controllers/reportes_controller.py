"""
Endpoints de reportes IASS (generar, descargar, datos para gráfica).
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
from iaas.services.procesar_service import procesar_IASS as ProcesarIASS
from iaas.services.generar_iass import (
    Excel_IASS01, Excel_IASS02, Excel_IASS03,
    Excel_IASS04, Excel_IASS05, Excel_IASS06,
    RUTA_BASE_IASS, UNIDADES_UCI,
)

router = APIRouter()

ROLES_IASS      = ("admin", "trabajador_IAAS")
ROLES_IASS_GRAF = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")

_NOMBRE_A_NUM_IASS = {
    "ENERO": "01", "FEBRERO": "02", "MARZO": "03", "ABRIL": "04",
    "MAYO": "05", "JUNIO": "06", "JULIO": "07", "AGOSTO": "08",
    "SEPTIEMBRE": "09", "OCTUBRE": "10", "NOVIEMBRE": "11", "DICIEMBRE": "12",
}


@router.get("/ASS_PRUEBA")
async def IASS(payload: dict = Depends(solo_roles(*ROLES_IASS))):
    archivo   = Excel_IASS01()
    excel_b64 = base64.b64encode(archivo.getvalue()).decode("utf-8")
    return ApiResponse(success=True, message="IAAS 01 generado", data={"archivo_b64": excel_b64, "nombre_archivo": "IAAS_01.xlsx"})


@router.get("/ASS_02")
async def IASS_02(payload: dict = Depends(solo_roles(*ROLES_IASS))):
    excel_b64 = base64.b64encode(Excel_IASS02().getvalue()).decode("utf-8")
    return ApiResponse(success=True, message="IAAS 02 generado", data={"archivo_b64": excel_b64, "nombre_archivo": "IAAS_02.xlsx"})


@router.get("/ASS_03")
async def IASS_03(payload: dict = Depends(solo_roles(*ROLES_IASS))):
    excel_b64 = base64.b64encode(Excel_IASS03().getvalue()).decode("utf-8")
    return ApiResponse(success=True, message="IAAS 03 generado", data={"archivo_b64": excel_b64, "nombre_archivo": "IAAS_03.xlsx"})


@router.get("/ASS_04")
async def IASS_04(payload: dict = Depends(solo_roles(*ROLES_IASS))):
    excel_b64 = base64.b64encode(Excel_IASS04().getvalue()).decode("utf-8")
    return ApiResponse(success=True, message="IAAS 04 generado", data={"archivo_b64": excel_b64, "nombre_archivo": "IAAS_04.xlsx"})


@router.get("/ASS_05")
async def IASS_05(payload: dict = Depends(solo_roles(*ROLES_IASS))):
    excel_b64 = base64.b64encode(Excel_IASS05().getvalue()).decode("utf-8")
    return ApiResponse(success=True, message="IAAS 05 generado", data={"archivo_b64": excel_b64, "nombre_archivo": "IAAS_05.xlsx"})


@router.get("/ASS_06")
async def IASS_06(payload: dict = Depends(solo_roles(*ROLES_IASS))):
    excel_b64 = base64.b64encode(Excel_IASS06().getvalue()).decode("utf-8")
    return ApiResponse(success=True, message="IAAS 06 generado", data={"archivo_b64": excel_b64, "nombre_archivo": "IAAS_06.xlsx"})


@router.get("/IASS/meses-guardados")
async def IASS_meses_guardados(
    anio:    str = Query(...),
    payload: dict = Depends(solo_roles(*ROLES_IASS_GRAF))
):
    ruta_json = next(
        (RUTA_BASE_IASS / str(anio) / f"IAAS_0{n}.json"
         for n in range(1, 7)
         if (RUTA_BASE_IASS / str(anio) / f"IAAS_0{n}.json").exists()),
        None,
    )
    if ruta_json is None:
        return ApiResponse(success=True, message="Sin datos guardados", data={"meses": []})
    try:
        with open(ruta_json, encoding="utf-8") as f:
            data = json.load(f)
        meses = sorted(
            num for nombre, num in _NOMBRE_A_NUM_IASS.items()
            if nombre in data.get("MESES", {})
        )
        return ApiResponse(success=True, message="Meses guardados obtenidos", data={"meses": meses})
    except Exception as e:
        print(f"[IASS meses-guardados] {e}")
        return ApiResponse(success=False, message=str(e), data={"meses": []})


_EXCEL_POR_IND = {
    "IAAS 01": Excel_IASS01, "IAAS 02": Excel_IASS02,
    "IAAS 03": Excel_IASS03, "IAAS 04": Excel_IASS04,
    "IAAS 05": Excel_IASS05, "IAAS 06": Excel_IASS06,
}

@router.get("/IASS/descargar")
async def IASS_descargar(
    anio:      str           = Query(...),
    indicador: Optional[str] = Query(None),
    payload:   dict          = Depends(solo_roles(*ROLES_IASS))
):
    from iaas.services.generar_iass import Excel_IASS_Completo

    if indicador and indicador in _EXCEL_POR_IND:
        num      = indicador.replace("IAAS ", "").zfill(2)
        stream   = _EXCEL_POR_IND[indicador]()
        nombre   = f"IAAS_{num}_{anio}.xlsx"
        contenido = stream.read()
    else:
        ruta = RUTA_BASE_IASS / str(anio) / f"IAAS_{anio}.xlsx"
        if not ruta.exists():
            stream    = Excel_IASS_Completo(anio, "0", {})
            contenido = stream.read()
        else:
            with open(ruta, "rb") as f:
                contenido = f.read()
        nombre = f"IAAS_{anio}.xlsx"

    return ApiResponse(success=True, message=nombre, data={
        "archivo_b64":    base64.b64encode(contenido).decode("utf-8"),
        "nombre_archivo": nombre,
    })


@router.get("/IASS/datos-grafica")
async def IASS_datos_grafica(
    anio:    str = Query(...),
    payload: dict = Depends(solo_roles(*ROLES_IASS_GRAF))
):
    ruta_sesion = RUTA_BASE_IASS / str(anio)
    datos: dict = {}
    meses_set: set = set()

    for ind_n in range(1, 7):
        ind_key   = f"IAAS 0{ind_n}"
        ruta_json = ruta_sesion / f"IAAS_0{ind_n}.json"
        if not ruta_json.exists():
            datos[ind_key] = {}
            continue
        try:
            with open(ruta_json, encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"[IASS datos-grafica] {ind_key}: {e}")
            datos[ind_key] = {}
            continue

        ind_data: dict = {}
        for mes_nombre, mes_data in data.get("MESES", {}).items():
            mes_str = _NOMBRE_A_NUM_IASS.get(mes_nombre.upper())
            if not mes_str:
                continue
            for unidad, vals in mes_data.get("DATOS", {}).items():
                n_v   = vals.get("NUMERADOR")
                d_v   = vals.get("DENOMINADOR")
                t_v   = vals.get("TASA")
                color = (vals.get("COLOR") or "Rojo").capitalize()
                if n_v is not None or t_v is not None:
                    meses_set.add(mes_str)
                    ind_data.setdefault(unidad, []).append({
                        "mes":         mes_str,
                        "tasa":        t_v if t_v is not None else 0,
                        "numerador":   n_v if n_v is not None else 0,
                        "denominador": d_v if d_v is not None else 0,
                        "color":       color,
                    })
        datos[ind_key] = ind_data

    return ApiResponse(success=True, message="Datos de gráfica IASS obtenidos", data={
        "unidades":        list(UNIDADES_UCI),
        "meses_con_datos": sorted(meses_set),
        "datos":           datos,
    })


@router.post("/IASS/Generar")
async def RecibirDatosIASS(
    anio:                       str                  = Form(...),
    mes:                        str                  = Form(...),
    numerador:                  List[UploadFile]     = File(default=[]),
    denominador:                Optional[str]        = Form(None),
    excel_denominador_IASS_01: Optional[UploadFile] = File(None),
    payload:                    dict                 = Depends(solo_roles(*ROLES_IASS))
):
    try:
        numerador_bytes            = {f.filename: await f.read() for f in numerador}
        excel_denominador_01_bytes = await excel_denominador_IASS_01.read() if excel_denominador_IASS_01 else None
        denominador_dict           = json.loads(denominador) if denominador else {}

        resultado = ProcesarIASS(
            anio                       = anio,
            mes                        = mes,
            numerador                  = numerador_bytes,
            denominador                = denominador_dict,
            excel_denominador_IASS_01 = excel_denominador_01_bytes
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
        raise HTTPException(status_code=500, detail=f"Error al recibir datos IASS: {str(e)}")
