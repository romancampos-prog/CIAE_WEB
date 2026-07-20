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
    RUTA_BASE_IAAS, UNIDADES_UCI, _alias_hgsz, _acumular_unidad,
)
from iaas.services.extraccion_service import _semaforo_general, _semaforo_IAAS01

# HGS/HGSMF y HGSZ/HGSZMF son la misma unidad — el dato crudo a veces trae el alias.
# Mismo criterio que ya usa el Excel (_dato_unidad en generar_iaas.py), aquí solo se
# arma una vez el mapa alias→nombre canónico para no repetir la búsqueda cada vez.
_ALIAS_A_CANONICO_IAAS = {
    alias: u for u in UNIDADES_UCI
    for alias in [_alias_hgsz(u)] if alias
}

router = APIRouter()

ROLES_IAAS      = ("admin", "trabajador_IAAS")
ROLES_IAAS_GRAF = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")

_NOMBRE_A_NUM_IAAS = {
    "ENERO": "01", "FEBRERO": "02", "MARZO": "03", "ABRIL": "04",
    "MAYO": "05", "JUNIO": "06", "JULIO": "07", "AGOSTO": "08",
    "SEPTIEMBRE": "09", "OCTUBRE": "10", "NOVIEMBRE": "11", "DICIEMBRE": "12",
}


@router.get("/IAAS/meses-guardados")
async def IAAS_meses_guardados(
    anio:    str = Query(...),
    payload: dict = Depends(solo_roles(*ROLES_IAAS_GRAF))
):
    ruta_json = next(
        (RUTA_BASE_IAAS / str(anio) / f"IAAS_0{n}.json"
         for n in range(1, 7)
         if (RUTA_BASE_IAAS / str(anio) / f"IAAS_0{n}.json").exists()),
        None,
    )
    if ruta_json is None:
        return ApiResponse(success=True, message="Sin datos guardados", data={"meses": []})
    try:
        with open(ruta_json, encoding="utf-8") as f:
            data = json.load(f)
        meses = sorted(
            num for nombre, num in _NOMBRE_A_NUM_IAAS.items()
            if nombre in data.get("MESES", {})
        )
        return ApiResponse(success=True, message="Meses guardados obtenidos", data={"meses": meses})
    except Exception as e:
        print(f"[IAAS meses-guardados] {e}")
        return ApiResponse(success=False, message=str(e), data={"meses": []})


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
    ruta_sesion = RUTA_BASE_IAAS / str(anio)
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
            print(f"[IAAS datos-grafica] {ind_key}: {e}")
            datos[ind_key] = {}
            continue

        # all_months: {mes_num: {unidad: {"numerador":, "denominador":}}} -- mismo formato
        # que usa _acumular_unidad para el Excel, aquí se reutiliza para el acumulado del
        # front, así el criterio de "cuánto llevamos sumado" es idéntico en los dos lugares.
        all_months: dict = {}
        ind_data: dict   = {}
        for mes_nombre, mes_data in data.get("MESES", {}).items():
            mes_str = _NOMBRE_A_NUM_IAAS.get(mes_nombre.upper())
            if not mes_str:
                continue
            mes_num = int(mes_str)
            for unidad, vals in mes_data.get("DATOS", {}).items():
                unidad = _ALIAS_A_CANONICO_IAAS.get(unidad, unidad)
                n_v   = vals.get("NUMERADOR")
                d_v   = vals.get("DENOMINADOR")
                t_v   = vals.get("TASA")
                color = (vals.get("COLOR") or "Bajo").capitalize()
                all_months.setdefault(mes_num, {})[unidad] = {"numerador": n_v, "denominador": d_v}
                if n_v is not None or t_v is not None or d_v is not None:
                    meses_set.add(mes_str)
                    ind_data.setdefault(unidad, []).append({
                        "mes":         mes_str,
                        "tasa":        t_v,
                        "numerador":   n_v,
                        "denominador": d_v,
                        "color":       color,
                    })

        # Acumulado (Ene→ese mes) por unidad y mes -- calculado aquí, una sola vez, con el
        # mismo semáforo que ya corregimos (_semaforo_general/_semaforo_IAAS01). El frontend
        # ya no debe sumar ni decidir colores, solo mostrar lo que manda el backend.
        for unidad, registros in ind_data.items():
            for reg in registros:
                mes_num = int(reg["mes"])
                acum_num, acum_den, tiene = _acumular_unidad(all_months, unidad, mes_num)
                if not tiene:
                    reg.update(numerador_acum=None, denominador_acum=None, tasa_acum=None, color_acum="Gris")
                    continue
                raw = {unidad: {"numerador": acum_num, "denominador": acum_den}}
                calc = (_semaforo_IAAS01(raw) if ind_key == "IAAS 01" else _semaforo_general(raw, ind_key))[unidad]
                reg.update(
                    numerador_acum=acum_num, denominador_acum=acum_den,
                    tasa_acum=calc["tasa"], color_acum=calc["color"],
                )

        datos[ind_key] = ind_data

    return ApiResponse(success=True, message="Datos de gráfica IAAS obtenidos", data={
        "unidades":        list(UNIDADES_UCI),
        "meses_con_datos": sorted(meses_set),
        "datos":           datos,
    })


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
