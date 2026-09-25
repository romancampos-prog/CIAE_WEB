"""
Guardado y lectura del historico mensual y semanal de los indicadores en BD_CIAE.
  Definitivo: {DATA_INDICADORES}/{año}/{familia}/{familia}_{n}.json        -> "MESES"
  Semanal:    {DATA_INDICADORES}/{año}/SEMANAL/{familia}_{n}_{año}_semana.json -> "MES"
La consulta tipada para graficas y Excel esta en bd_Ciae_Indicadores_Services.py.
Usado en: services/ftp/generacion_indicador_ftp_Services.py, services/excel_Services.py,
          ftp/services/recalcular_poblacion_service.py, ftp/controllers/reportes_controller.py
"""
import json
from collections.abc import Mapping
from pathlib import Path

from configs.settings import DATA_INDICADORES
from schemas.model.generacion_ftp_Model import ResultadoUnidad
from shared.MESES import MESES_ESTANDAR


def _ruta_definitivo(indicador: str, ano: str) -> Path:
    familia = indicador.split()[0] if indicador.split() else indicador
    return DATA_INDICADORES / ano / familia / (indicador.replace(" ", "_") + ".json")


def _ruta_semanal(indicador: str, ano: str) -> Path:
    return DATA_INDICADORES / ano / "SEMANAL" / (indicador.replace(" ", "_") + f"_{ano}_semana.json")


def _nombre_del_mes(mes: str) -> str | None:
    """Nombre del mes ("Enero"..) a partir de "01".."12"; None si esta fuera de rango."""
    indice = int(mes) - 1
    return MESES_ESTANDAR[indice] if 0 <= indice < len(MESES_ESTANDAR) else None


def _leer_json(ruta: Path) -> dict:
    if not ruta.exists():
        return {}
    try:
        with open(ruta, encoding="utf-8") as archivo:
            return json.load(archivo)
    except Exception:
        return {}


def _leer_json_para_actualizar(ruta: Path, vacio: dict) -> dict:
    """Al guardar NO se tolera un JSON corrupto: falla en vez de sobrescribir el historico."""
    if not ruta.exists():
        return vacio
    with open(ruta, encoding="utf-8") as archivo:
        return json.load(archivo)


def _escribir_json(ruta: Path, contenido: dict) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as archivo:
        json.dump(contenido, archivo, ensure_ascii=False, indent=2)


def _a_formato_de_disco(unidades: Mapping[str, ResultadoUnidad]) -> dict[str, dict]:
    """En disco el resultado se llama "%" y el semaforo "desempeno" (mismo formato que IAAS y Extractor)."""
    guardado: dict[str, dict] = {}
    for nombre, unidad in unidades.items():
        datos = unidad.model_dump()
        guardado[nombre] = {
            "numerador":   datos["numerador"],
            "denominador": datos["denominador"],
            "%":           datos["resultado"],
            **({"desempeno": datos["color"]} if "color" in datos else {}),
        }
    return guardado


# --------------------------------------------------------------------------- #
# Lectura
# --------------------------------------------------------------------------- #

def meses_con_datos(indicador: str, ano: str) -> list[str]:
    """Meses definitivos guardados, como "01".."12"."""
    meses = _leer_json(_ruta_definitivo(indicador, ano)).get("MESES", {})
    return [str(MESES_ESTANDAR.index(mes) + 1).zfill(2) for mes in meses if mes in MESES_ESTANDAR]


def leer_historico_indicador(indicador: str, ano: str) -> dict:
    return _leer_json(_ruta_definitivo(indicador, ano))


def leer_semanal_indicador(indicador: str, ano: str) -> dict:
    return _leer_json(_ruta_semanal(indicador, ano))


def leer_numeradores_todos_meses(indicador: str, ano: str) -> dict[str, dict[str, float | None]]:
    """{"01": {unidad: numerador}, ...} de todos los meses definitivos guardados."""
    numeradores: dict[str, dict[str, float | None]] = {}
    for mes, unidades in leer_historico_indicador(indicador, ano).get("MESES", {}).items():
        if mes not in MESES_ESTANDAR:
            continue
        numeradores[str(MESES_ESTANDAR.index(mes) + 1).zfill(2)] = {
            unidad: datos.get("numerador") for unidad, datos in unidades.items() if isinstance(datos, dict)
        }
    return numeradores


# --------------------------------------------------------------------------- #
# Escritura
# --------------------------------------------------------------------------- #

def guardar_mes_definitivo(indicador: str, ano: str, mes: str, unidades: Mapping[str, ResultadoUnidad]) -> None:
    ruta = _ruta_definitivo(indicador, ano)
    contenido = _leer_json_para_actualizar(ruta, {"INDICADOR": indicador, "ANO": ano, "MESES": {}})

    nombre_mes = _nombre_del_mes(mes)
    if nombre_mes:
        contenido["MESES"][nombre_mes] = _a_formato_de_disco(unidades)
    _escribir_json(ruta, contenido)


def guardar_mes_semanal(indicador: str, ano: str, mes: str, semana: int | str, unidades: Mapping[str, ResultadoUnidad]) -> None:
    ruta = _ruta_semanal(indicador, ano)
    contenido = _leer_json_para_actualizar(ruta, {"INDICADOR": indicador, "ANIO": ano, "SEMANA": int(semana), "MES": {}})
    contenido["SEMANA"] = int(semana)

    nombre_mes = _nombre_del_mes(mes)
    if nombre_mes:
        contenido["MES"][nombre_mes] = _a_formato_de_disco(unidades)
    _escribir_json(ruta, contenido)


def borrar_mes_semanal(indicador: str, ano: str, mes: str) -> None:
    """
    Quita del semanal el mes que ya tiene reporte definitivo: el semanal solo se lee
    para meses que aun no estan en el definitivo, asi que ya no sirve y el archivo
    no crece sin fin. Si no queda ningun mes semanal pendiente, se borra el archivo.
    """
    ruta = _ruta_semanal(indicador, ano)
    contenido = _leer_json(ruta)
    nombre_mes = _nombre_del_mes(mes)
    if not contenido or nombre_mes not in contenido.get("MES", {}):
        return

    del contenido["MES"][nombre_mes]
    if contenido["MES"]:
        _escribir_json(ruta, contenido)
    else:
        ruta.unlink()
