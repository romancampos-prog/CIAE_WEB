"""
Orquesta el procesamiento de todos los IAAS y genera el Excel final.
Persiste los datos en JSON por indicador (sesion/{anio}/IAAS_0N.json).
Usado en: iass/controllers/iaas_controller.py, iass/controllers/reportes_controller.py
"""
import base64
import datetime
from pathlib import Path

from iaas.config import RUTA_DATA_IAAS
from iaas.config import ORDEN_DEMAS_IAAS
from iaas.services.extraccion_service import calcular_IAAS
from iaas.services.datos_json_service import leer_indicador_anio, escribir_indicador_anio

MESES_NOMBRE = {
    "01": "ENERO",  "02": "FEBRERO",   "03": "MARZO",    "04": "ABRIL",
    "05": "MAYO",   "06": "JUNIO",     "07": "JULIO",    "08": "AGOSTO",
    "09": "SEPTIEMBRE", "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE",
}


def _ruta_sesion(anio: str) -> Path:
    return RUTA_DATA_IAAS / anio


def _calcular_indicadores_pendientes(datos: dict, numerador: dict) -> tuple[list, dict]:
    pendientes_ind: dict[str, list] = {}

    for u in ORDEN_DEMAS_IAAS:
        if u not in numerador:
            pendientes_ind[u] = [
                "IAAS 01", "IAAS 02", "IAAS 03",
                "IAAS 04", "IAAS 05", "IAAS 06",
            ]

    for ind_key in ["IAAS 02", "IAAS 03", "IAAS 04", "IAAS 05", "IAAS 06"]:
        for unidad, vals in datos.get(ind_key, {}).items():
            if unidad == "DELEGACION":
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
    generado   = datetime.datetime.now().isoformat(timespec="seconds")

    for ind_key, ind_datos in datos.items():
        ind_n     = int(ind_key[-2:])
        json_data = leer_indicador_anio(anio, ind_n) or {"INDICADOR": ind_key, "ANIO": anio, "MESES": {}}

        datos_mes = {
            unit: {
                "NUMERADOR":   vals.get("numerador"),
                "DENOMINADOR": vals.get("denominador"),
                "TASA":        vals.get("tasa"),
                "COLOR":       (vals.get("color") or "Bajo").upper(),
            }
            for unit, vals in ind_datos.items()
        }

        json_data["MESES"][mes_nombre] = {
            "GENERADO":              generado,
            "UNIDADES_PENDIENTES":   unidades_pendientes,
            "INDICADORES_PENDIENTES": indicadores_pendientes or {},
            "DATOS":                 datos_mes,
        }

        escribir_indicador_anio(anio, ind_n, json_data)


def _leer_sesion_mes(anio: str, mes_nombre: str) -> dict:
    datos = {}
    for ind_n in range(1, 7):
        ind_key = f"IAAS 0{ind_n}"
        d       = leer_indicador_anio(anio, ind_n)
        if not d:
            continue
        mes_data = d.get("MESES", {}).get(mes_nombre.upper(), {}).get("DATOS", {})
        datos[ind_key] = {
            unit: {
                "numerador":   v.get("NUMERADOR"),
                "denominador": v.get("DENOMINADOR"),
                "tasa":        v.get("TASA"),
                "color":       (v.get("COLOR") or "Bajo").capitalize(),
            }
            for unit, v in mes_data.items()
        }
    return datos


def _get_pendientes(anio: str, mes_nombre: str) -> list:
    pendientes, _ = _get_pendientes_info(anio, mes_nombre)
    return pendientes


def _get_pendientes_info(anio: str, mes_nombre: str) -> tuple[list, dict]:
    datos_por_ind: dict[str, dict] = {}
    for ind_n in range(1, 7):
        ind_key = f"IAAS 0{ind_n}"
        d       = leer_indicador_anio(anio, ind_n)
        datos_por_ind[ind_key] = d.get("MESES", {}).get(mes_nombre.upper(), {}).get("DATOS", {})

    if not any(datos_por_ind.values()):
        return [], {}

    pendientes_ind: dict[str, list] = {}
    for unidad in ORDEN_DEMAS_IAAS:
        inds_pend = []
        for ind_n in range(1, 7):
            ind_key    = f"IAAS 0{ind_n}"
            datos_unit = datos_por_ind.get(ind_key, {}).get(unidad)
            if datos_unit is None or datos_unit.get("DENOMINADOR") is None:
                inds_pend.append(ind_key)
        if inds_pend:
            pendientes_ind[unidad] = inds_pend

    return list(pendientes_ind.keys()), pendientes_ind


def _recalcular_delegacion(datos_ind: dict, ind: str) -> dict:
    from iaas.services.extraccion_service import _semaforo_IAAS01, _semaforo_general
    total_num = sum(
        (v.get("numerador") or 0)
        for u, v in datos_ind.items()
        if u != "DELEGACION" and isinstance(v, dict)
    )
    total_den = sum(
        (v.get("denominador") or 0)
        for u, v in datos_ind.items()
        if u != "DELEGACION" and isinstance(v, dict)
    )
    raw = {"DELEGACION": {"numerador": total_num, "denominador": total_den or None}}
    result = _semaforo_IAAS01(raw) if ind == "IAAS 01" else _semaforo_general(raw, ind)
    datos_ind["DELEGACION"] = result.get("DELEGACION", {})
    return datos_ind


def procesar_IAAS(anio: str, mes: str, numerador: dict, denominador: dict,
                    excel_denominador_IAAS_01: bytes | None) -> dict:
    datos = {
        "IAAS 01": calcular_IAAS("IAAS 01", numerador, excel_denominador_IAAS_01),
        "IAAS 02": calcular_IAAS("IAAS 02", numerador, denominador),
        "IAAS 03": calcular_IAAS("IAAS 03", numerador, denominador),
        "IAAS 04": calcular_IAAS("IAAS 04", numerador, denominador),
        "IAAS 05": calcular_IAAS("IAAS 05", numerador, denominador),
        "IAAS 06": calcular_IAAS("IAAS 06", numerador, denominador),
    }

    unidades_pendientes, indicadores_pendientes = _calcular_indicadores_pendientes(datos, numerador)
    _guardar_sesion_json(anio, mes, datos, unidades_pendientes, indicadores_pendientes)

    from iaas.services.generar_iaas import Excel_IAAS_Completo
    stream      = Excel_IAAS_Completo(anio, mes, datos)
    archivo_b64 = base64.b64encode(stream.read()).decode("utf-8")

    return {
        "mensaje":             "Reporte IAAS generado",
        "archivo_b64":         archivo_b64,
        "nombre_archivo":      f"IAAS_{anio}_{mes}.xlsx",
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

    from iaas.services.extraccion_service import calcular_unidad_tardia as _calc
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

    from iaas.services.generar_iaas import Excel_IAAS_Completo
    stream      = Excel_IAAS_Completo(anio, mes, datos_completos)
    archivo_b64 = base64.b64encode(stream.read()).decode("utf-8")

    return {
        "archivo_b64":         archivo_b64,
        "nombre_archivo":      f"IAAS_{anio}_{mes}.xlsx",
        "unidades_pendientes": pendientes,
    }
