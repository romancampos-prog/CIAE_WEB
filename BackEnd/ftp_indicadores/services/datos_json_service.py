"""
Gestiona lectura y escritura de históricos de indicadores FTP en JSON.
Ruta: Data/FTP/Data_FTP/{ano}/{categoria}/{indicador}.json
Usado en: ftp_indicadores/services/reporte_final.py, reporte_categoria.py,
          generar_excel.py, controllers/reportes_controller.py, recalcular_poblacion_service.py
"""
import json
from pathlib import Path
from ftp_indicadores.config import RUTA_DATA_FTP

MESES_NOMBRES = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
]


def _ruta_json(indicador: str, ano: str) -> Path:
    partes    = indicador.split()
    categoria = partes[0] if partes else indicador
    nombre    = indicador.replace(" ", "_") + ".json"
    return RUTA_DATA_FTP / ano / categoria / nombre


def _ruta_semana_json(indicador: str, ano: str) -> Path:
    nombre = indicador.replace(" ", "_") + f"_{ano}_semana.json"
    return RUTA_DATA_FTP / "semanal" / nombre


def meses_con_datos(indicador: str, ano: str) -> list:
    ruta = _ruta_json(indicador, ano)
    if not ruta.exists():
        return []
    try:
        with open(ruta, encoding="utf-8") as f:
            data = json.load(f)
        meses = list(data.get("MESES", {}).keys())
        return [str(MESES_NOMBRES.index(m) + 1).zfill(2) for m in meses if m in MESES_NOMBRES]
    except Exception:
        return []


def leer_datos_indicador(indicador: str, ano: str) -> dict:
    ruta = _ruta_json(indicador, ano)
    if not ruta.exists():
        return {}
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def leer_semana_indicador(indicador: str, ano: str) -> dict:
    ruta = _ruta_semana_json(indicador, ano)
    if not ruta.exists():
        return {}
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _normalizar_para_guardar(datos: dict) -> dict:
    # Convierte "resultado" → "%" para mantener formato uniforme en disco
    out = {}
    for unidad, vals in datos.items():
        if not isinstance(vals, dict):
            out[unidad] = vals
            continue
        v = dict(vals)
        if "resultado" in v:
            v["%"] = v.pop("resultado")
        out[unidad] = v
    return out


def leer_historicos_para_excel(indicador: str, ano: str, idx_mes_activo: int, claves_diccionario: list) -> tuple:
    datos_json = leer_datos_indicador(indicador, ano)
    historicos = {}  # {unidad: {idx_mes: data}}
    for mes_nombre, unidades_mes in datos_json.get("MESES", {}).items():
        if mes_nombre not in MESES_NOMBRES:
            continue
        idx = MESES_NOMBRES.index(mes_nombre)
        if idx == idx_mes_activo:
            continue
        for unidad, vals in unidades_mes.items():
            if not isinstance(vals, dict):
                continue
            # Normaliza "%" → "resultado" para que Excel_final lo lea correctamente
            v = dict(vals)
            if "%" in v and "resultado" not in v:
                v["resultado"] = v.pop("%")
            historicos.setdefault(unidad, {})[idx] = v
    return historicos, {}


def guardar_datos_en_json(indicador: str, ano: str, mes: str, datos: dict) -> None:
    ruta = _ruta_json(indicador, ano)
    ruta.parent.mkdir(parents=True, exist_ok=True)

    if ruta.exists():
        with open(ruta, encoding="utf-8") as f:
            json_data = json.load(f)
    else:
        json_data = {"INDICADOR": indicador, "ANO": ano, "MESES": {}}

    idx = int(mes) - 1
    if 0 <= idx < len(MESES_NOMBRES):
        mes_nombre = MESES_NOMBRES[idx]
        json_data["MESES"][mes_nombre] = _normalizar_para_guardar(datos)

    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)


def guardar_semana_en_json(indicador: str, ano: str, mes: str, semana: str, datos: dict) -> None:
    ruta = _ruta_semana_json(indicador, ano)
    ruta.parent.mkdir(parents=True, exist_ok=True)

    if ruta.exists():
        with open(ruta, encoding="utf-8") as f:
            json_data = json.load(f)
    else:
        json_data = {"INDICADOR": indicador, "ANO": ano, "MESES": {}}

    idx = int(mes) - 1
    if 0 <= idx < len(MESES_NOMBRES):
        mes_nombre = MESES_NOMBRES[idx]
        json_data["MESES"][mes_nombre] = {"semana": int(semana), **_normalizar_para_guardar(datos)}

    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)


def leer_numeradores_todos_meses(indicador: str, ano: str) -> dict:
    datos_json = leer_datos_indicador(indicador, ano)
    resultado  = {}
    for mes_nombre, unidades in datos_json.get("MESES", {}).items():
        if mes_nombre not in MESES_NOMBRES:
            continue
        idx = MESES_NOMBRES.index(mes_nombre)
        mes_str = str(idx + 1).zfill(2)
        resultado[mes_str] = {
            unidad: vals.get("numerador")
            for unidad, vals in unidades.items()
            if isinstance(vals, dict)
        }
    return resultado


def actualizar_denominadores_en_json(indicador: str, ano: str, nuevos_datos: dict) -> None:
    ruta = _ruta_json(indicador, ano)
    if not ruta.exists():
        return
    with open(ruta, encoding="utf-8") as f:
        json_data = json.load(f)

    for mes_str, unidades in nuevos_datos.items():
        idx = int(mes_str) - 1
        if not (0 <= idx < len(MESES_NOMBRES)):
            continue
        mes_nombre = MESES_NOMBRES[idx]
        mes_data   = json_data.get("MESES", {}).get(mes_nombre)
        if not mes_data:
            continue
        for unidad, vals in unidades.items():
            if unidad in mes_data and isinstance(mes_data[unidad], dict):
                mes_data[unidad].update(vals)

    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
