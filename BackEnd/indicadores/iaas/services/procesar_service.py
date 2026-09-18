"""
Orquesta el procesamiento de todos los IAAS y genera el Excel final.
Persiste los datos en JSON por indicador (sesion/{anio}/IAAS_0N.json).
Usado en: iass/controllers/iaas_controller.py, iass/controllers/reportes_controller.py
"""
import base64
from pathlib import Path

from iaas.config import RUTA_DATA_IAAS
from iaas.config import ORDEN_DEMAS_IAAS
from iaas.services.extraccion_service import calcular_IAAS
from iaas.services.datos_json_service import leer_indicador_anio, escribir_indicador_anio, _anio_valido

MESES_NOMBRE = {
    "01": "Enero",  "02": "Febrero",   "03": "Marzo",    "04": "Abril",
    "05": "Mayo",   "06": "Junio",     "07": "Julio",    "08": "Agosto",
    "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
}


def _ruta_sesion(anio: str) -> Path:
    if not _anio_valido(anio):
        raise ValueError(f"Año inválido: {anio!r}")
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
            if unidad == "TOTAL_OOAD":
                continue
            if vals.get("denominador") is None:
                if unidad not in pendientes_ind:
                    pendientes_ind[unidad] = []
                if ind_key not in pendientes_ind[unidad]:
                    pendientes_ind[unidad].append(ind_key)

    return list(pendientes_ind.keys()), pendientes_ind


def _guardar_sesion_json(anio: str, mes: str, datos: dict) -> None:
    mes_nombre = MESES_NOMBRE.get(mes, mes)

    for ind_key, ind_datos in datos.items():
        ind_n     = int(ind_key[-2:])
        json_data = leer_indicador_anio(anio, ind_n) or {"INDICADOR": ind_key, "ANIO": anio, "MESES": {}}

        json_data["MESES"][mes_nombre] = {
            unit: {
                "numerador":   vals.get("numerador"),
                "denominador": vals.get("denominador"),
                "%":           vals.get("tasa"),
                "desempeno":   vals.get("color") or "Bajo",
            }
            for unit, vals in ind_datos.items()
        }

        escribir_indicador_anio(anio, ind_n, json_data)


def _leer_sesion_mes(anio: str, mes_nombre: str) -> dict:
    datos = {}
    for ind_n in range(1, 7):
        ind_key = f"IAAS 0{ind_n}"
        d       = leer_indicador_anio(anio, ind_n)
        if not d:
            continue
        mes_data = d.get("MESES", {}).get(mes_nombre, {})
        datos[ind_key] = {
            unit: {
                "numerador":   v.get("numerador"),
                "denominador": v.get("denominador"),
                "tasa":        v.get("%"),
                "color":       v.get("desempeno") or "Bajo",
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
        datos_por_ind[ind_key] = d.get("MESES", {}).get(mes_nombre, {})

    if not any(datos_por_ind.values()):
        return [], {}

    pendientes_ind: dict[str, list] = {}
    for unidad in ORDEN_DEMAS_IAAS:
        inds_pend = []
        for ind_n in range(1, 7):
            ind_key    = f"IAAS 0{ind_n}"
            datos_unit = datos_por_ind.get(ind_key, {}).get(unidad)
            if datos_unit is None or datos_unit.get("denominador") is None:
                inds_pend.append(ind_key)
        if inds_pend:
            pendientes_ind[unidad] = inds_pend

    return list(pendientes_ind.keys()), pendientes_ind


def _recalcular_total_ooad(datos_ind: dict, ind: str) -> dict:
    """
    Suma numerador/denominador de todas las unidades para el total OOAD, con 3 reglas:
    - Unidad incompleta (numerador o denominador None) -- Gris, no se cuenta.
    - Unidad con denominador 0 y numerador > 0 -- inconsistencia (no se puede tener
      casos sin el universo que los mida), se notifica y no se suma al total.
    - Unidad con numerador y denominador ambos 0 -- cero real, se cuenta normal
      (no afecta el total, aporta 0/0).
    """
    from iaas.services.semaforo_iaas import semaforizar_iaas

    total_num  = 0
    total_den  = 0
    hay_alguna = False
    for u, v in datos_ind.items():
        if u == "TOTAL_OOAD" or not isinstance(v, dict):
            continue
        num = v.get("numerador")
        den = v.get("denominador")
        if num is None or den is None:
            continue
        if den == 0 and num > 0:
            print(f"[IAAS] Inconsistencia en {ind}, unidad {u}: numerador={num} con denominador=0 -- no se incluye en el total OOAD.")
            continue
        total_num += num
        total_den += den
        hay_alguna = True

    # total_den puede ser legítimamente 0 (todas las unidades contadas dieron 0/0,
    # un cero real) -- eso es distinto de no haber contado ninguna unidad (Gris de
    # verdad). "total_den or None" convertiría un 0 real en None por error.
    raw = {"TOTAL_OOAD": {"numerador": total_num, "denominador": total_den if hay_alguna else None}}
    result = semaforizar_iaas(raw, ind)
    datos_ind["TOTAL_OOAD"] = result.get("TOTAL_OOAD", {})
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

    # El total (TOTAL_OOAD) se calcula siempre aquí, en la generación normal --
    # antes solo se calculaba si alguien completaba una unidad tardía después (ver
    # completar_unidad_tardia más abajo), dejando el total sin existir hasta entonces.
    for ind_key, ind_datos in datos.items():
        if ind_datos:
            datos[ind_key] = _recalcular_total_ooad(ind_datos, ind_key)

    unidades_pendientes, _ = _calcular_indicadores_pendientes(datos, numerador)
    _guardar_sesion_json(anio, mes, datos)

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
                             excel_bytes: bytes,
                             excel_denominador_iaas01: bytes | None = None) -> dict:
    mes_nombre = MESES_NOMBRE.get(mes, mes)
    datos_completos = _leer_sesion_mes(anio, mes_nombre)

    if not datos_completos:
        raise ValueError(
            f"No hay sesión guardada para {mes_nombre} {anio}. "
            "Genera el reporte completo primero."
        )

    from iaas.services.extraccion_service import calcular_unidad_tardia as _calc
    nuevos = _calc(unidad, excel_bytes, indicadores_seleccionados,
                   denominadores_02_06, datos_completos, excel_denominador_iaas01)

    for ind, result in nuevos.items():
        datos_completos.setdefault(ind, {}).update(result)
        datos_completos[ind] = _recalcular_total_ooad(datos_completos[ind], ind)

    pendientes, ind_pend = _get_pendientes_info(anio, mes_nombre)

    if unidad in ind_pend:
        restantes = [i for i in ind_pend[unidad] if i not in indicadores_seleccionados]
        if restantes:
            ind_pend[unidad] = restantes
        else:
            del ind_pend[unidad]

    pendientes = [u for u in ind_pend.keys()]

    _guardar_sesion_json(anio, mes, datos_completos)

    from iaas.services.generar_iaas import Excel_IAAS_Completo
    stream      = Excel_IAAS_Completo(anio, mes, datos_completos)
    archivo_b64 = base64.b64encode(stream.read()).decode("utf-8")

    return {
        "archivo_b64":         archivo_b64,
        "nombre_archivo":      f"IAAS_{anio}_{mes}.xlsx",
        "unidades_pendientes": pendientes,
    }
