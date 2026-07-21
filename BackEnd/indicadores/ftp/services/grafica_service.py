"""
Arma el dataset que consume la gráfica FTP del front: por unidad, la serie
mensual con su tasa/color, incluyendo la semana parcial cuando el mes no
está cerrado todavía.
Usado en: ftp/controllers/reportes_controller.py
"""
from ftp.services.ftp_service import obtenerInformacionIndicador
from ftp.services.generar_excel import _calcular_color
from ftp.services.datos_json_service import (
    leer_datos_indicador, leer_semana_indicador, MESES_NOMBRES as FTP_MESES_NOMBRES,
    _ruta_json, _ruta_semana_json,
)
from ftp.config import NOMBREUNIDADESARCHIVO
from shared.cache_service import obtener_o_calcular

_CACHE_FTP: dict = {}


def calcular_datos_grafica_ftp(indicador: str, anio: str) -> dict:
    """Devuelve {"unidades": [...], "meses_con_datos": [...], "datos": {...}} (cacheado)."""
    archivos = [_ruta_json(indicador, anio), _ruta_semana_json(indicador, anio)]
    return obtener_o_calcular(
        _CACHE_FTP, (indicador, anio), archivos,
        lambda: _calcular_datos_grafica_ftp(indicador, anio),
    )


def _calcular_datos_grafica_ftp(indicador: str, anio: str) -> dict:
    """El cálculo real, sin caché — lo envuelve calcular_datos_grafica_ftp."""
    info       = obtenerInformacionIndicador(indicador)
    semaforo   = info.get("semaforo", {})
    datos_json = leer_datos_indicador(indicador, anio)

    if not datos_json:
        return {"unidades": [], "meses_con_datos": [], "datos": {}}

    datos     = {}
    meses_set = set()
    # Lista fija del catalogo, igual que IAAS -- asi las unidades sin ningun dato
    # real (todo en null) tambien aparecen en el panel y la grafica, en gris.
    unidades_set = list(NOMBREUNIDADESARCHIVO) + ["TOTAL"]

    for mes_nombre, unidades_mes in datos_json.get("MESES", {}).items():
        if mes_nombre not in FTP_MESES_NOMBRES:
            continue
        idx_mes = FTP_MESES_NOMBRES.index(mes_nombre)
        mes_str = str(idx_mes + 1).zfill(2)

        for unidad, vals in unidades_mes.items():
            num = vals.get("numerador")
            den = vals.get("denominador")
            pct = vals.get("%")
            if num is None and pct is None and den is None:
                continue
            meses_set.add(mes_str)
            color_guardado = vals.get("color")
            color = (
                _calcular_color(pct, idx_mes, semaforo)
                if not color_guardado or color_guardado == "Gris"
                else color_guardado
            )
            datos.setdefault(unidad, []).append({
                "mes":         mes_str,
                "tasa":        float(pct) if pct is not None else None,
                "numerador":   float(num) if num is not None else None,
                "denominador": float(den) if den is not None else None,
                "color":       color,
            })
            if unidad not in unidades_set:
                unidades_set.append(unidad)

    for unidad in datos:
        datos[unidad].sort(key=lambda x: x["mes"])

    meses_definitivos = set(meses_set)
    semanal_json      = leer_semana_indicador(indicador, anio)
    for mes_nombre, mes_data in semanal_json.get("MESES", {}).items():
        if mes_nombre not in FTP_MESES_NOMBRES:
            continue
        idx_mes = FTP_MESES_NOMBRES.index(mes_nombre)
        mes_str = str(idx_mes + 1).zfill(2)
        if mes_str in meses_definitivos:
            continue
        semana_num = mes_data.get("semana", 1)
        meses_set.add(mes_str)
        for unidad, vals in mes_data.items():
            if unidad == "semana" or not isinstance(vals, dict):
                continue
            pct = vals.get("%")
            num = vals.get("numerador")
            den = vals.get("denominador")
            col = vals.get("color", "Gris")
            if unidad not in unidades_set:
                unidades_set.append(unidad)
            datos.setdefault(unidad, []).append({
                "mes":         mes_str,
                "tasa":        float(pct) if pct is not None else None,
                "numerador":   float(num) if num is not None else None,
                "denominador": float(den) if den is not None else None,
                "color":       col,
                "semana":      semana_num,
            })
    for unidad in datos:
        datos[unidad].sort(key=lambda x: x["mes"])

    return {
        "unidades":        unidades_set,
        "meses_con_datos": sorted(meses_set),
        "datos":           datos,
    }