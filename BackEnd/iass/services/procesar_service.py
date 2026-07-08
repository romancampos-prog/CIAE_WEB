"""
Orquesta el procesamiento de todos los IASS y genera el Excel final.
Persiste los datos en JSON por indicador (sesion/{anio}/IASS_0N.json).
Usado en: iass/controllers/iass_controller.py, iass/controllers/reportes_controller.py
"""
import json
import base64
import datetime
from pathlib import Path

from iass.config import RUTA_DATA_IASS
from iass.config import ORDEN_DEMAS_IASS
from iass.services.extraccion_service import calcular_IASS

MESES_NOMBRE = {
    "01": "ENERO",  "02": "FEBRERO",   "03": "MARZO",    "04": "ABRIL",
    "05": "MAYO",   "06": "JUNIO",     "07": "JULIO",    "08": "AGOSTO",
    "09": "SEPTIEMBRE", "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE",
}


def _ruta_sesion(anio: str) -> Path:
    return RUTA_DATA_IASS / anio


def _calcular_indicadores_pendientes(datos: dict, numerador: dict) -> tuple[list, dict]:
    pendientes_ind: dict[str, list] = {}

    for u in ORDEN_DEMAS_IASS:
        if u not in numerador:
            pendientes_ind[u] = [
                "IASS 01", "IASS 02", "IASS 03",
                "IASS 04", "IASS 05", "IASS 06",
            ]

    for ind_key in ["IASS 02", "IASS 03", "IASS 04", "IASS 05", "IASS 06"]:
        for unidad, vals in datos.get(ind_key, {}).items():
            if unidad in ("DELEGACION", "Delegación"):
                continue
            if vals.get("denominador") is None:
                if unidad not in pendientes_ind:
                    pendientes_ind[unidad] = []
                if ind_key not in pendientes_ind[unidad]:
                    pendientes_ind[unidad].append(ind_key)

    return list(pendientes_ind.keys()), pendientes_ind


def _guardar_sesion_json(
    anio: str, mes: str, datos: dict,
    unidades_pendientes: list,
    indicadores_pendientes: dict | None = None,
) -> None:
    mes_nombre = MESES_NOMBRE.get(mes, mes)
    ruta       = _ruta_sesion(anio)
    ruta.mkdir(parents=True, exist_ok=True)
    generado   = datetime.datetime.now().isoformat(timespec="seconds")

    for ind_key, ind_datos in datos.items():
        ind_file  = ind_key.replace(" ", "_") + ".json"
        ruta_json = ruta / ind_file

        if ruta_json.exists():
            with open(ruta_json, encoding="utf-8") as f:
                json_data = json.load(f)
        else:
            json_data = {"INDICADOR": ind_key, "ANIO": anio, "MESES": {}}

        datos_mes = {
            unit: {
                "NUMERADOR":   vals.get("numerador"),
                "DENOMINADOR": vals.get("denominador"),
                "TASA":        vals.get("tasa"),
                "COLOR":       (vals.get("color") or "Rojo").upper(),
            }
            for unit, vals in ind_datos.items()
        }

        json_data["MESES"][mes_nombre] = {
            "GENERADO":              generado,
            "UNIDADES_PENDIENTES":   unidades_pendientes,
            "INDICADORES_PENDIENTES": indicadores_pendientes or {},
            "DATOS":                 datos_mes,
        }

        with open(ruta_json, "w", encoding="utf-8") as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)


def _leer_sesion_mes(anio: str, mes_nombre: str) -> dict:
    ruta  = _ruta_sesion(anio)
    datos = {}
    for ind_n in range(1, 7):
        ind_key   = f"IASS 0{ind_n}"
        ruta_json = ruta / f"IASS_0{ind_n}.json"
        if not ruta_json.exists():
            continue
        with open(ruta_json, encoding="utf-8") as f:
            d = json.load(f)
        mes_data = d.get("MESES", {}).get(mes_nombre.upper(), {}).get("DATOS", {})
        datos[ind_key] = {
            unit: {
                "numerador":   v.get("NUMERADOR"),
                "denominador": v.get("DENOMINADOR"),
                "tasa":        v.get("TASA"),
                "color":       (v.get("COLOR") or "ROJO").capitalize(),
            }
            for unit, v in mes_data.items()
        }
    return datos


def _get_pendientes(anio: str, mes_nombre: str) -> list:
    pendientes, _ = _get_pendientes_info(anio, mes_nombre)
    return pendientes


def _get_pendientes_info(anio: str, mes_nombre: str) -> tuple[list, dict]:
    ruta = _ruta_sesion(anio)

    datos_por_ind: dict[str, dict] = {}
    for ind_n in range(1, 7):
        ind_key   = f"IASS 0{ind_n}"
        ruta_json = ruta / f"IASS_0{ind_n}.json"
        if not ruta_json.exists():
            datos_por_ind[ind_key] = {}
            continue
        try:
            with open(ruta_json, encoding="utf-8") as f:
                d = json.load(f)
            datos_por_ind[ind_key] = (
                d.get("MESES", {}).get(mes_nombre.upper(), {}).get("DATOS", {})
            )
        except Exception:
            datos_por_ind[ind_key] = {}

    if not any(datos_por_ind.values()):
        return [], {}

    pendientes_ind: dict[str, list] = {}
    for unidad in ORDEN_DEMAS_IASS:
        inds_pend = []
        for ind_n in range(1, 7):
            ind_key    = f"IASS 0{ind_n}"
            datos_unit = datos_por_ind.get(ind_key, {}).get(unidad)
            if datos_unit is None or datos_unit.get("DENOMINADOR") is None:
                inds_pend.append(ind_key)
        if inds_pend:
            pendientes_ind[unidad] = inds_pend

    return list(pendientes_ind.keys()), pendientes_ind


def _recalcular_delegacion(datos_ind: dict, ind: str) -> dict:
    from iass.services.extraccion_service import _semaforo_IASS01, _semaforo_general
    total_num = sum(
        (v.get("numerador") or 0)
        for u, v in datos_ind.items()
        if u not in ("DELEGACION", "Delegación") and isinstance(v, dict)
    )
    total_den = sum(
        (v.get("denominador") or 0)
        for u, v in datos_ind.items()
        if u not in ("DELEGACION", "Delegación") and isinstance(v, dict)
    )
    raw = {"DELEGACION": {"numerador": total_num, "denominador": total_den or None}}
    result = _semaforo_IASS01(raw) if ind == "IASS 01" else _semaforo_general(raw, ind)
    datos_ind["DELEGACION"] = result.get("DELEGACION", {})
    return datos_ind


def procesar_IASS(anio: str, mes: str, numerador: dict, denominador: dict,
                    excel_denominador_IASS_01: bytes | None) -> dict:
    datos = {
        "IASS 01": calcular_IASS("IASS 01", numerador, excel_denominador_IASS_01),
        "IASS 02": calcular_IASS("IASS 02", numerador, denominador),
        "IASS 03": calcular_IASS("IASS 03", numerador, denominador),
        "IASS 04": calcular_IASS("IASS 04", numerador, denominador),
        "IASS 05": calcular_IASS("IASS 05", numerador, denominador),
        "IASS 06": calcular_IASS("IASS 06", numerador, denominador),
    }

    unidades_pendientes, indicadores_pendientes = _calcular_indicadores_pendientes(datos, numerador)
    _guardar_sesion_json(anio, mes, datos, unidades_pendientes, indicadores_pendientes)

    from iass.services.generar_iass import Excel_IASS_Completo
    stream      = Excel_IASS_Completo(anio, mes, datos)
    archivo_b64 = base64.b64encode(stream.read()).decode("utf-8")

    return {
        "mensaje":             "Reporte IASS generado",
        "archivo_b64":         archivo_b64,
        "nombre_archivo":      f"IASS_{anio}_{mes}.xlsx",
        "unidades_pendientes": unidades_pendientes,
    }


def completar_unidad_tardia(anio: str, mes: str, unidad: str,
                             indicadores_seleccionados: list,
                             denominadores_02_06: dict,
                             excel_bytes: bytes) -> dict:
    mes_nombre = MESES_NOMBRE.get(mes, mes)
    datos_completos = _leer_sesion_mes(anio, mes_nombre)

    if not datos_completos:
        raise ValueError(
            f"No hay sesión guardada para {mes_nombre} {anio}. "
            "Genera el reporte completo primero."
        )

    from iass.services.extraccion_service import calcular_unidad_tardia as _calc
    nuevos = _calc(unidad, excel_bytes, indicadores_seleccionados,
                   denominadores_02_06, datos_completos)

    for ind, result in nuevos.items():
        datos_completos.setdefault(ind, {}).update(result)
        datos_completos[ind] = _recalcular_delegacion(datos_completos[ind], ind)

    pendientes, ind_pend = _get_pendientes_info(anio, mes_nombre)

    if unidad in ind_pend:
        restantes = [i for i in ind_pend[unidad] if i not in indicadores_seleccionados]
        if restantes:
            ind_pend[unidad] = restantes
        else:
            del ind_pend[unidad]

    pendientes = [u for u in ind_pend.keys()]

    _guardar_sesion_json(anio, mes, datos_completos, pendientes, ind_pend)

    from iass.services.generar_iass import Excel_IASS_Completo
    stream      = Excel_IASS_Completo(anio, mes, datos_completos)
    archivo_b64 = base64.b64encode(stream.read()).decode("utf-8")

    return {
        "archivo_b64":         archivo_b64,
        "nombre_archivo":      f"IASS_{anio}_{mes}.xlsx",
        "unidades_pendientes": pendientes,
    }
