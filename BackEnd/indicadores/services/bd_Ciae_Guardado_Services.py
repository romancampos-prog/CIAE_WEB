"""
Guardado y lectura de los indicadores en BD_CIAE (el unico lugar que arma sus rutas).
  Definitivo: {DATA_INDICADORES}/{año}/{familia}/{familia}_{n}.json            -> "MESES"
  Semanal:    {DATA_INDICADORES}/{año}/SEMANAL/{familia}_{n}_{año}_semana.json -> "MES"
  Extractor:  el mismo definitivo, con el numerador crudo de cada mes en "MESES" y el corte
              en "CORTES"; ademas {año}/EXTRACTOR_CRUCE y {año}/EXTRACTOR_PARTES.
La consulta tipada para graficas y Excel esta en bd_Ciae_Indicadores_Services.py.
Usado en: services/{ftp,iaas,extractor}/*, services/bd_Ciae_Indicadores_Services.py, services/excel_Services.py
"""
import json
import re
from collections.abc import Mapping
from pathlib import Path

from configs.settings import DATA_INDICADORES
from schemas.model.generacion_Model import ResultadoUnidad
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import NOMBREUNIDADESARCHIVO


def validar_ano(ano: str | int) -> str:
    """El año llega del usuario y arma rutas de archivo: solo se aceptan 4 digitos."""
    if not re.fullmatch(r"\d{4}", str(ano)):
        raise ValueError(f"Año inválido: {ano!r}")
    return str(ano)


##--------------------------------------

def ruta_definitivo(indicador: str, ano: str | int) -> Path:
    familia = indicador.split()[0] if indicador.split() else indicador
    return DATA_INDICADORES / validar_ano(ano) / familia / (indicador.replace(" ", "_") + ".json")


##--------------------------------------

def ruta_semanal(indicador: str, ano: str | int) -> Path:
    ano = validar_ano(ano)
    return DATA_INDICADORES / ano / "SEMANAL" / (indicador.replace(" ", "_") + f"_{ano}_semana.json")


##--------------------------------------

def _ruta_extractor(carpeta: str, indicador: str, anio: int) -> Path:
    """EXTRACTOR_CRUCE (afiliaciones cifradas, aparte del reporte) o EXTRACTOR_PARTES (conteo de cada archivo)."""
    return DATA_INDICADORES / validar_ano(anio) / carpeta / (indicador.replace(" ", "_") + ".json")


##--------------------------------------

def nombre_del_mes(mes: str) -> str | None:
    """Nombre del mes ("Enero"..) a partir de "01".."12"; None si esta fuera de rango."""
    indice = int(mes) - 1
    return MESES_ESTANDAR[indice] if 0 <= indice < len(MESES_ESTANDAR) else None


##--------------------------------------

def _leer_json(ruta: Path) -> dict:
    if not ruta.exists():
        return {}
    try:
        with open(ruta, encoding="utf-8") as archivo:
            return json.load(archivo)
    except Exception:
        return {}


##--------------------------------------

def _leer_json_para_actualizar(ruta: Path, vacio: dict) -> dict:
    """Al guardar NO se tolera un JSON corrupto: falla en vez de sobrescribir el historico."""
    if not ruta.exists():
        return vacio
    with open(ruta, encoding="utf-8") as archivo:
        return json.load(archivo)


##--------------------------------------

def _escribir_json(ruta: Path, contenido: dict) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as archivo:
        json.dump(contenido, archivo, ensure_ascii=False, indent=2)


##--------------------------------------

def _a_formato_de_disco(unidades: Mapping[str, ResultadoUnidad]) -> dict[str, dict]:
    """En disco el resultado se llama "%" y el semaforo "desempeno"."""
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


##--------------------------------------

def meses_con_datos(indicador: str, ano: str) -> list[str]:
    """Meses definitivos guardados, como "01".."12"."""
    meses = _leer_json(ruta_definitivo(indicador, ano)).get("MESES", {})
    return [str(MESES_ESTANDAR.index(mes) + 1).zfill(2) for mes in meses if mes in MESES_ESTANDAR]


##--------------------------------------

def leer_historico_indicador(indicador: str, ano: str) -> dict:
    return _leer_json(ruta_definitivo(indicador, ano))


##--------------------------------------

def leer_semanal_indicador(indicador: str, ano: str) -> dict:
    return _leer_json(ruta_semanal(indicador, ano))


##--------------------------------------

def leer_numeradores_todos_meses(indicador: str, ano: str) -> dict[str, dict[str, float | None]]:
    """{"01": {unidad: numerador}, ...} de todos los meses definitivos guardados."""
    numeradores: dict[str, dict[str, float | None]] = {}
    for mes, mes_reporte in leer_historico_indicador(indicador, ano).get("MESES", {}).items():
        if mes not in MESES_ESTANDAR:
            continue
        reporte = mes_reporte.get("Reporte", {}) if isinstance(mes_reporte, dict) else {}
        numeradores[str(MESES_ESTANDAR.index(mes) + 1).zfill(2)] = {
            unidad: datos.get("numerador") for unidad, datos in reporte.items() if isinstance(datos, dict)
        }
    return numeradores


##--------------------------------------

def guardar_mes_definitivo(
    indicador: str, ano: str, mes: str, unidades: Mapping[str, ResultadoUnidad], poblacion_usada: str | None = None,
) -> None:
    ruta = ruta_definitivo(indicador, ano)
    contenido = _leer_json_para_actualizar(ruta, {"INDICADOR": indicador, "ANIO": ano, "MESES": {}})

    mes_nombre = nombre_del_mes(mes)
    if mes_nombre:
        contenido["MESES"][mes_nombre] = {"Poblacion": poblacion_usada, "Reporte": _a_formato_de_disco(unidades)}
    _escribir_json(ruta, contenido)


##--------------------------------------

def guardar_mes_semanal(
    indicador: str, ano: str, mes: str, semana: int | str, unidades: Mapping[str, ResultadoUnidad], poblacion_usada: str | None = None,
) -> None:
    ruta = ruta_semanal(indicador, ano)
    contenido = _leer_json_para_actualizar(ruta, {"INDICADOR": indicador, "ANIO": ano, "SEMANA": int(semana), "MES": {}})
    contenido["SEMANA"] = int(semana)

    mes_nombre = nombre_del_mes(mes)
    if mes_nombre:
        contenido["MES"][mes_nombre] = {"Poblacion": poblacion_usada, "Reporte": _a_formato_de_disco(unidades)}
    _escribir_json(ruta, contenido)


##--------------------------------------

def borrar_mes_semanal(indicador: str, ano: str, mes: str) -> None:
    """
    Quita del semanal el mes que ya tiene reporte definitivo: el semanal solo se lee para
    meses que aun no estan en el definitivo, asi que ya no sirve y el archivo no crece sin
    fin. Si no queda ningun mes semanal pendiente, se borra el archivo.
    """
    ruta = ruta_semanal(indicador, ano)
    contenido = _leer_json(ruta)
    mes_nombre = nombre_del_mes(mes)
    if not contenido or mes_nombre not in contenido.get("MES", {}):
        return

    del contenido["MES"][mes_nombre]
    if contenido["MES"]:
        _escribir_json(ruta, contenido)
    else:
        ruta.unlink()


##--------------------------------------

def leer_reporte_extractor(indicador: str, anio: int) -> dict:
    """El JSON del indicador del Extractor; si no existe, uno vacio para empezar a llenarlo."""
    return _leer_json_para_actualizar(ruta_definitivo(indicador, anio), {"INDICADOR": indicador, "ANIO": anio, "MESES": {}})


##--------------------------------------

def guardar_reporte_extractor(indicador: str, anio: int, reporte: dict) -> None:
    _escribir_json(ruta_definitivo(indicador, anio), reporte)


##--------------------------------------

def guardar_numerador_mes(indicador: str, anio: int, mes_nombre: str, conteo_por_unidad: dict, cruce_aplicado: bool | None = None) -> None:
    """
    Guarda (o reemplaza) el numerador crudo de un mes del Extractor de corte, siempre con las
    46 unidades (en 0 las que no tuvieron casos). "MESES" es SIEMPRE el dato crudo, incluso en
    Junio/Diciembre: el corte calculado va aparte en "CORTES.MESES", asi un mes de corte sigue
    sirviendo para la ventana del siguiente corte.
    cruce_aplicado (solo si el mapeo pide cruce): True si el mes ya se valido contra Egresos,
    False si falta la via 2. Va en "CRUCE", aparte de las unidades.
    """
    reporte = leer_reporte_extractor(indicador, anio)
    reporte["MESES"][mes_nombre] = {
        unidad: {"numerador": conteo_por_unidad.get(unidad, 0), "desempeno": "Gris"}
        for unidad in NOMBREUNIDADESARCHIVO
    }
    if cruce_aplicado is not None:
        reporte.setdefault("CRUCE", {})[mes_nombre] = cruce_aplicado
    guardar_reporte_extractor(indicador, anio, reporte)


##--------------------------------------

def guardar_pendiente_cruce(indicador: str, anio: int, mes_nombre: str, via1: dict, candidatos: list[dict]) -> None:
    """
    Lo que el SUI-13 del mes dejo listo para el cruce (conteo de la via 1 y candidatos de la
    via 2 con su llave cifrada): asi el Egresos se puede subir despues, sin volver a subir el SUI-13.
    """
    ruta = _ruta_extractor("EXTRACTOR_CRUCE", indicador, anio)
    contenido = _leer_json_para_actualizar(ruta, {})
    contenido[mes_nombre] = {
        "via1": via1,
        "candidatos": [{"unidad": c["unidad"], "llave": None if c["llave"] is None else str(c["llave"])} for c in candidatos],
    }
    _escribir_json(ruta, contenido)


##--------------------------------------

def leer_pendiente_cruce(indicador: str, anio: int, mes_nombre: str) -> dict | None:
    return _leer_json_para_actualizar(_ruta_extractor("EXTRACTOR_CRUCE", indicador, anio), {}).get(mes_nombre)


##--------------------------------------

def leer_partes(indicador: str, anio: int) -> dict:
    """{mes: {"numerador": {unidad: n}, "denominador": {unidad: n}}} -- cada lado solo si ya se subio su archivo."""
    return _leer_json_para_actualizar(_ruta_extractor("EXTRACTOR_PARTES", indicador, anio), {})


##--------------------------------------

def guardar_parte_mes(indicador: str, anio: int, mes_nombre: str, lado: str, conteo_por_unidad: dict) -> dict:
    """
    Guarda (o reemplaza) el conteo de un lado del mes y regresa las partes de ese mes. Se
    conserva aunque el mes ya se haya generado: si despues se corrige solo uno de los dos
    archivos, el otro lado sigue aqui y el mes se recalcula sin volver a subirlo.
    """
    partes = leer_partes(indicador, anio)
    partes.setdefault(mes_nombre, {})[lado] = conteo_por_unidad
    _escribir_json(_ruta_extractor("EXTRACTOR_PARTES", indicador, anio), partes)
    return partes[mes_nombre]
