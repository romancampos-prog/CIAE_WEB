"""
Módulo  : procesar_service.py
Carpeta : indicadores_IN_ASS/services/
Qué hace: Orquesta el procesamiento de todos los IN_ASS y genera el Excel final.
          Persiste los datos en JSON por indicador (sesion/{anio}/IN_ASS_0N.json)
          para permitir completar unidades tardías sin regenerar todo.
Usado en: in_ass_controller.py
"""
import json
import base64
import datetime
from pathlib import Path

from configs.settings import RUTA_DATA_IN_ASS
from configs.unidades import ORDEN_DEMAS_IN_ASS
from indicadores_IN_ASS.services.extraccion_service import calcular_in_ass

MESES_NOMBRE = {
    "01": "ENERO",  "02": "FEBRERO",   "03": "MARZO",    "04": "ABRIL",
    "05": "MAYO",   "06": "JUNIO",     "07": "JULIO",    "08": "AGOSTO",
    "09": "SEPTIEMBRE", "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE",
}


# ── Helpers de lectura/escritura JSON ────────────────────────────────────────

def _ruta_sesion(anio: str) -> Path:
    return RUTA_DATA_IN_ASS / anio


def _calcular_indicadores_pendientes(datos: dict, numerador: dict) -> tuple[list, dict]:
    """
    Determina qué unidades e indicadores específicos están pendientes:
    - Sin Excel → todos los indicadores (01-06) pendientes
    - Con Excel pero sin denominador en algún 02-06 → solo esos indicadores pendientes
    Devuelve: (lista_unidades, {unidad: [ind_keys_pendientes]})
    """
    pendientes_ind: dict[str, list] = {}

    # Unidades sin Excel → todos los 6 indicadores pendientes
    for u in ORDEN_DEMAS_IN_ASS:
        if u not in numerador:
            pendientes_ind[u] = [
                "IN_ASS 01", "IN_ASS 02", "IN_ASS 03",
                "IN_ASS 04", "IN_ASS 05", "IN_ASS 06",
            ]

    # Unidades CON Excel pero sin denominador en algún 02-06
    for ind_key in ["IN_ASS 02", "IN_ASS 03", "IN_ASS 04", "IN_ASS 05", "IN_ASS 06"]:
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
    """
    Guarda / actualiza los datos del mes en los JSON por indicador.
    datos: formato interno {ind: {unit: {numerador, denominador, tasa, color}}}
    """
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
    """
    Lee todos los indicadores de un mes desde los JSON.
    Devuelve: {ind_key: {unit: {numerador, denominador, tasa, color}}} — formato interno
    """
    ruta  = _ruta_sesion(anio)
    datos = {}
    for ind_n in range(1, 7):
        ind_key   = f"IN_ASS 0{ind_n}"
        ruta_json = ruta / f"IN_ASS_0{ind_n}.json"
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
    """Lee la lista de unidades pendientes (retrocompat)."""
    pendientes, _ = _get_pendientes_info(anio, mes_nombre)
    return pendientes


def _get_pendientes_info(anio: str, mes_nombre: str) -> tuple[list, dict]:
    """Lee unidades pendientes e indicadores pendientes por unidad."""
    ruta_json = _ruta_sesion(anio) / "IN_ASS_02.json"
    if not ruta_json.exists():
        return [], {}
    with open(ruta_json, encoding="utf-8") as f:
        d = json.load(f)
    mes_data = d.get("MESES", {}).get(mes_nombre.upper(), {})
    return (
        mes_data.get("UNIDADES_PENDIENTES", []),
        mes_data.get("INDICADORES_PENDIENTES", {}),
    )


def _recalcular_delegacion(datos_ind: dict, ind: str) -> dict:
    """Recalcula DELEGACION para un indicador después de actualizar una unidad."""
    from indicadores_IN_ASS.services.extraccion_service import _semaforo_in_ass01, _semaforo_general
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
    result = _semaforo_in_ass01(raw) if ind == "IN_ASS 01" else _semaforo_general(raw, ind)
    datos_ind["DELEGACION"] = result.get("DELEGACION", {})
    return datos_ind


# ── Flujos principales ────────────────────────────────────────────────────────

def procesar_in_ass(anio: str, mes: str, numerador: dict, denominador: dict,
                    excel_denominador_inass_01: bytes | None) -> dict:
    datos = {
        "IN_ASS 01": calcular_in_ass("IN_ASS 01", numerador, excel_denominador_inass_01),
        "IN_ASS 02": calcular_in_ass("IN_ASS 02", numerador, denominador),
        "IN_ASS 03": calcular_in_ass("IN_ASS 03", numerador, denominador),
        "IN_ASS 04": calcular_in_ass("IN_ASS 04", numerador, denominador),
        "IN_ASS 05": calcular_in_ass("IN_ASS 05", numerador, denominador),
        "IN_ASS 06": calcular_in_ass("IN_ASS 06", numerador, denominador),
    }

    unidades_pendientes, indicadores_pendientes = _calcular_indicadores_pendientes(datos, numerador)
    _guardar_sesion_json(anio, mes, datos, unidades_pendientes, indicadores_pendientes)

    from reportes.services.generar_in_ass import Excel_InAss_Completo
    stream      = Excel_InAss_Completo(anio, mes, datos)
    archivo_b64 = base64.b64encode(stream.read()).decode("utf-8")

    return {
        "mensaje":             "Reporte IN_ASS generado",
        "archivo_b64":         archivo_b64,
        "nombre_archivo":      f"IN_ASS_{anio}_{mes}.xlsx",
        "unidades_pendientes": unidades_pendientes,
    }


def completar_unidad_tardia(anio: str, mes: str, unidad: str,
                             indicadores_seleccionados: list,
                             denominadores_02_06: dict,
                             excel_bytes: bytes) -> dict:
    """
    Actualiza una unidad tardía: recalcula los indicadores elegidos, fusiona con
    los datos del mes, guarda los JSON actualizados y regenera el Excel completo.
    """
    mes_nombre = MESES_NOMBRE.get(mes, mes)
    datos_completos = _leer_sesion_mes(anio, mes_nombre)

    if not datos_completos:
        raise ValueError(
            f"No hay sesión guardada para {mes_nombre} {anio}. "
            "Genera el reporte completo primero."
        )

    from indicadores_IN_ASS.services.extraccion_service import calcular_unidad_tardia as _calc
    nuevos = _calc(unidad, excel_bytes, indicadores_seleccionados,
                   denominadores_02_06, datos_completos)

    for ind, result in nuevos.items():
        datos_completos.setdefault(ind, {}).update(result)
        datos_completos[ind] = _recalcular_delegacion(datos_completos[ind], ind)

    pendientes, ind_pend = _get_pendientes_info(anio, mes_nombre)

    # Quitar los indicadores ya completados para esta unidad
    if unidad in ind_pend:
        restantes = [i for i in ind_pend[unidad] if i not in indicadores_seleccionados]
        if restantes:
            ind_pend[unidad] = restantes
        else:
            del ind_pend[unidad]

    pendientes = [u for u in ind_pend.keys()]

    _guardar_sesion_json(anio, mes, datos_completos, pendientes, ind_pend)

    from reportes.services.generar_in_ass import Excel_InAss_Completo
    stream      = Excel_InAss_Completo(anio, mes, datos_completos)
    archivo_b64 = base64.b64encode(stream.read()).decode("utf-8")

    return {
        "archivo_b64":         archivo_b64,
        "nombre_archivo":      f"IN_ASS_{anio}_{mes}.xlsx",
        "unidades_pendientes": pendientes,
    }
