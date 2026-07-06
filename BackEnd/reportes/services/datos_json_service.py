"""
Módulo  : datos_json_service.py
Carpeta : reportes/services/
Qué hace: Gestiona lectura y escritura de históricos de indicadores FTP en JSON.
          Reemplaza el uso de Historial_xlsx como base de datos histórica.
Ruta    : Data/FTP/Data_FTP/{ano}/{categoria}/{indicador}.json
Usado en: reporte_final.py, reporte_categoria.py, generar_excel.py,
          reportes_controller.py, recalcular_poblacion_service.py
"""
import json
from pathlib import Path
from configs.settings import RUTA_DATA_FTP

MESES_NOMBRES = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
]


def _ruta_json(indicador: str, ano: str) -> Path:
    """Devuelve la ruta al archivo JSON de un indicador y año."""
    categoria = indicador.split()[0]
    nombre    = indicador.replace(" ", "_") + ".json"
    return RUTA_DATA_FTP / str(ano) / categoria / nombre


def _ruta_json_semanal(indicador: str, ano: str) -> Path:
    nombre = indicador.replace(" ", "_") + f"_{ano}_semana.json"
    return RUTA_DATA_FTP / "semanal" / nombre


def leer_semana_indicador(indicador: str, ano: str) -> dict:
    """Lee el JSON semanal de un indicador. Retorna dict vacío si no existe."""
    ruta = _ruta_json_semanal(indicador, ano)
    if not ruta.exists():
        return {}
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[DatosJSON/semanal] Error leyendo {ruta}: {e}")
        return {}


def guardar_semana_en_json(indicador: str, ano: str, mes: str, semana_num, datos: dict):
    """
    Guarda la semana de un mes en el JSON semanal del indicador.
    Sobreescribe la entrada del mes (solo se guarda la última semana generada).
    Estructura idéntica al JSON mensual, con clave extra 'semana'.
    """
    ruta       = _ruta_json_semanal(indicador, ano)
    mes_nombre = MESES_NOMBRES[int(mes) - 1]

    contenido = leer_semana_indicador(indicador, ano)
    if not contenido:
        contenido = {"ANIO": int(ano), "MESES": {}}

    datos_mes = {"semana": int(semana_num)}
    for unidad, vals in datos.items():
        datos_mes[unidad] = {
            "numerador":   vals.get("numerador"),
            "denominador": vals.get("denominador"),
            "%":           vals.get("resultado"),
            "color":       vals.get("color", "Gris"),
        }

    contenido["MESES"][mes_nombre] = datos_mes

    ruta.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(contenido, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"[DatosJSON/semanal] Error guardando {ruta}: {e}")


def leer_datos_indicador(indicador: str, ano: str) -> dict:
    """Lee el JSON completo de un indicador. Retorna dict vacío si no existe."""
    ruta = _ruta_json(indicador, ano)
    if not ruta.exists():
        return {}
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[DatosJSON] Error leyendo {ruta}: {e}")
        return {}


def guardar_datos_en_json(indicador: str, ano: str, mes: str, datos: dict):
    """
    Guarda los resultados calculados de un mes en el JSON del indicador.
    Cada unidad almacena: numerador, denominador, % y color.
    Crea el archivo si no existe; actualiza el mes si ya existe.
    """
    ruta       = _ruta_json(indicador, ano)
    mes_nombre = MESES_NOMBRES[int(mes) - 1]

    contenido = leer_datos_indicador(indicador, ano)
    if not contenido:
        contenido = {"ANIO": int(ano), "MESES": {}}

    datos_mes = {}
    for unidad, vals in datos.items():
        datos_mes[unidad] = {
            "numerador":   vals.get("numerador"),
            "denominador": vals.get("denominador"),
            "%":           vals.get("resultado"),
            "color":       vals.get("color", "Gris"),
        }

    contenido["MESES"][mes_nombre] = datos_mes

    ruta.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(contenido, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"[DatosJSON] Error guardando {ruta}: {e}")


def meses_con_datos(indicador: str, ano: str) -> list:
    """Retorna lista ordenada de meses con datos: ['01', '03', '05', ...]"""
    datos  = leer_datos_indicador(indicador, ano)
    meses  = []
    for mes_nombre in datos.get("MESES", {}):
        if mes_nombre in MESES_NOMBRES and datos["MESES"][mes_nombre]:
            meses.append(str(MESES_NOMBRES.index(mes_nombre) + 1).zfill(2))
    return sorted(meses)


def leer_historicos_para_excel(indicador: str, ano: str,
                                idx_mes_activo: int, claves: list) -> tuple:
    """
    Genera (historicos, leyendas) en el formato que espera Excel_final().
    historicos: { unidad: { idx_mes: {numerador, denominador, resultado} } }
    leyendas  : {} vacío (no se almacenan en JSON; el Excel activo los calcula)
    """
    historicos = {k: {} for k in claves}
    datos      = leer_datos_indicador(indicador, ano)

    for mes_nombre, unidades_mes in datos.get("MESES", {}).items():
        if mes_nombre not in MESES_NOMBRES:
            continue
        idx_mes = MESES_NOMBRES.index(mes_nombre)
        if idx_mes == idx_mes_activo:
            continue

        for unidad_id in claves:
            if unidad_id not in unidades_mes:
                continue
            vals = unidades_mes[unidad_id]
            num  = vals.get("numerador")
            den  = vals.get("denominador")
            pct  = vals.get("%")
            if num is None and den is None and pct is None:
                continue
            historicos[unidad_id][idx_mes] = {
                "numerador":   num if num is not None else "",
                "denominador": den if den is not None else "",
                "resultado":   pct if pct is not None else "",
            }

    return historicos, {}


def leer_numeradores_todos_meses(indicador: str, ano: str) -> dict:
    """
    Devuelve { idx_mes: { unidad: numerador } } con los meses que tienen datos.
    Usado por recalcular_poblacion_service para obtener numeradores del JSON.
    """
    datos    = leer_datos_indicador(indicador, ano)
    resultado = {}

    for mes_nombre, unidades_mes in datos.get("MESES", {}).items():
        if mes_nombre not in MESES_NOMBRES:
            continue
        idx_mes   = MESES_NOMBRES.index(mes_nombre)
        nums_mes  = {}
        tiene_num = False
        for unidad, vals in unidades_mes.items():
            num = vals.get("numerador")
            nums_mes[unidad] = num
            if num is not None:
                tiene_num = True
        if tiene_num:
            resultado[idx_mes] = nums_mes

    return resultado


def actualizar_denominadores_en_json(indicador: str, ano: str,
                                      datos_por_mes: dict):
    """
    Actualiza denominador y % en cada mes del JSON.
    datos_por_mes: { idx_mes: { unidad: {denominador, resultado} } }
    """
    ruta      = _ruta_json(indicador, ano)
    contenido = leer_datos_indicador(indicador, ano)
    if not contenido:
        return False

    meses_json = contenido.get("MESES", {})

    for idx_mes, unidades in datos_por_mes.items():
        if idx_mes >= len(MESES_NOMBRES):
            continue
        mes_nombre = MESES_NOMBRES[idx_mes]
        if mes_nombre not in meses_json:
            continue
        for unidad, vals in unidades.items():
            if unidad not in meses_json[mes_nombre]:
                continue
            meses_json[mes_nombre][unidad]["denominador"] = vals.get("denominador")
            meses_json[mes_nombre][unidad]["%"]           = vals.get("resultado")

    contenido["MESES"] = meses_json
    try:
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(contenido, f, ensure_ascii=False, indent=4)
        return True
    except Exception as e:
        print(f"[DatosJSON] Error actualizando denominadores en {ruta}: {e}")
        return False
