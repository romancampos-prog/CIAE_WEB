"""
Cálculo puro de IAAS: alias de unidades, semáforo, acumulados y los valores
(numerador/denominador/tasa/color) listos para escribir en cada bloque del
Excel. Nada de este archivo depende de xlsxwriter — quien escribe el Excel
(generar_iaas.py) solo pide estos valores y decide en qué celda van.
Usado en: iaas/services/generar_iaas.py, extraccion_service.py, grafica_service.py
"""
from iaas.config import ORDEN_DEMAS_IAAS, UNIDADES_HGS_IAAS01
from iaas.services.datos_json_service import leer_indicador_anio
from iaas.services.semaforo_iaas import calcular_tasa, color_de_tasa, leyenda_agrupada, leyenda_fija
from shared.UNIDADES import alias_hgsz

# Mismo orden y mismas 11 unidades que usan IAAS 02-06 (ORDEN_DEMAS_IAAS) — solo cambia que
# IAAS 01 le agrega el renglón de OOAD al final de su propia lista de unidades.
UNIDADES_IAAS     = ORDEN_DEMAS_IAAS + ["TOTAL_OOAD"]
UNIDADES_UCI      = ORDEN_DEMAS_IAAS
_UNIDADES_HGS_SET = set(UNIDADES_HGS_IAAS01)


_alias_hgsz = alias_hgsz


def _dato_unidad(datos, unidad):
    """Busca los datos de una unidad por su nombre canónico, y si no aparece,
    prueba con el alias HGS(MF)/HGSZ(MF) antes de darla por sin datos."""
    v = datos.get(unidad)
    if isinstance(v, dict):
        return v
    alias = _alias_hgsz(unidad)
    if alias:
        v = datos.get(alias)
        if isinstance(v, dict):
            return v
    return None


def _color_tasa_01(tasa, unidad):
    return color_de_tasa(tasa, "IAAS 01", unidad)


def _color_tasa_uci(tasa, indicador):
    return color_de_tasa(tasa, indicador)


def _filas_umbrales_iaas01():
    return leyenda_agrupada("IAAS 01")


def _rango_umbral_uci(indicador):
    return leyenda_fija(indicador)


_NOMBRE_A_NUM = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4,
    "MAYO": 5, "JUNIO": 6, "JULIO": 7, "AGOSTO": 8,
    "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
}


def _leer_historicos_IAAS(anio: str, mes_num: int) -> dict:
    historicos = {}

    for ind_n in range(1, 7):
        ind_key = f"IAAS 0{ind_n}"
        data    = leer_indicador_anio(anio, ind_n)

        h_ind = {}
        for mes_nombre, mes_data in data.get("MESES", {}).items():
            m = _NOMBRE_A_NUM.get(mes_nombre.upper())
            if m is None or m == mes_num:
                continue
            datos_mes = {
                unit: {
                    "numerador":   v.get("numerador"),
                    "denominador": v.get("denominador"),
                    "tasa":        v.get("%"),
                    "color":       v.get("desempeno") or "Bajo",
                }
                for unit, v in mes_data.items()
            }
            if datos_mes:
                h_ind[m] = datos_mes
        historicos[ind_key] = h_ind

    total = sum(len(v) for v in historicos.values())
    print(f"[IAAS JSON] {total} meses de datos cargados")
    return historicos




def _acumular_unidad(all_months, unidad, hasta_mes):
    """Suma numerador/denominador de una unidad desde enero hasta hasta_mes (inclusive).
    Reutilizado por el acumulado mensual y por el bloque Anual (que es lo mismo, solo que
    siempre hasta el último mes que haya).
    El denominador (días/casos expuestos) se acumula en TODOS los meses donde exista,
    aunque a ese mismo mes le falte el numerador -- es un dato real que sí ocurrió. El
    numerador solo suma los meses donde de verdad existe.
    "completo" indica si CADA mes con algún dato trajo numerador Y denominador a la vez;
    si a la unidad le falta el numerador en cualquier mes del rango, queda incompleta:
    el llamador debe reportarla Gris (sin tasa real, fuera del total OOAD) mostrando
    nada más los acumulados que sí existan (numerador y/o denominador)."""
    num, den = 0, 0
    tiene_num, tiene_den = False, False
    completo = True
    for m in range(1, hasta_mes + 1):
        v = _dato_unidad(all_months.get(m, {}), unidad)
        if not v:
            continue
        n, d = v.get("numerador"), v.get("denominador")
        if n is not None:
            num += n
            tiene_num = True
        if d is not None:
            den += d
            tiene_den = True
        if n is None or d is None:
            completo = False
    return num, den, tiene_num, tiene_den, completo




def calcular_fila_iaas01(datos: dict) -> dict:
    """
    Bloque MENSUAL de IAAS 01: por unidad (+ 'TOTAL_OOAD'), los valores listos
    para escribir (numerador/denominador con "" en vez de None cuando el dato
    es Gris, tasa vacía si es Gris) y el color para el estilo de la celda de
    tasa. None si la unidad no tiene registro ese mes (no se escribe la fila).
    """
    sum_num = 0
    sum_den = 0
    for unidad in UNIDADES_IAAS:
        if unidad == "TOTAL_OOAD":
            continue
        v = _dato_unidad(datos, unidad)
        if v and (v.get("color") or "Gris") != "Gris":
            sum_num += v.get("numerador") or 0
            sum_den += v.get("denominador") or 0
    tasa_deleg = calcular_tasa("IAAS 01")(sum_num, sum_den) if sum_den else 0

    resultado = {}
    for unidad in UNIDADES_IAAS:
        if unidad == "TOTAL_OOAD":
            color_deleg = (
                datos.get("TOTAL_OOAD", {}).get("color")
                if isinstance(datos.get("TOTAL_OOAD"), dict)
                else _color_tasa_01(tasa_deleg, "TOTAL_OOAD")
            )
            resultado["TOTAL_OOAD"] = {
                "numerador": sum_num, "denominador": sum_den,
                "tasa": tasa_deleg, "color_tasa": color_deleg,
            }
            continue

        v = _dato_unidad(datos, unidad)
        if not v:
            resultado[unidad] = None
            continue
        color = v.get("color") or "Gris"
        if color == "Gris":
            num = v.get("numerador")
            den = v.get("denominador")
            resultado[unidad] = {
                "numerador":   num if num is not None else "",
                "denominador": den if den is not None else "",
                "tasa": "", "color_tasa": "Gris",
            }
            continue

        resultado[unidad] = {
            "numerador":   v.get("numerador"),
            "denominador": v.get("denominador"),
            "tasa":        v.get("tasa"),
            "color_tasa":  color,
        }
    return resultado


def calcular_acumulado_iaas01(all_months: dict) -> dict:
    """
    Bloque MENSUAL ACUMULADO de IAAS 01: por mes (feb-dic, solo los presentes
    en all_months) y por unidad, el acumulado Ene→ese mes. None si la unidad
    no tiene nada acumulado todavía ese mes (no se escribe esa celda).
    """
    resultado = {}
    for mes_target in range(2, 13):
        if mes_target not in all_months:
            continue
        fila_mes  = {}
        sum_del_n = 0
        sum_del_d = 0
        for unidad in UNIDADES_IAAS:
            if unidad == "TOTAL_OOAD":
                continue
            acum_num, acum_den, tiene_num, tiene_den, completo = _acumular_unidad(all_months, unidad, mes_target)
            if not tiene_num and not tiene_den:
                fila_mes[unidad] = None
                continue
            if not completo:
                fila_mes[unidad] = {
                    "numerador":   acum_num if tiene_num else "",
                    "denominador": acum_den if tiene_den else "",
                    "tasa": "", "color_tasa": "Gris",
                }
                continue
            tasa  = calcular_tasa("IAAS 01")(acum_num, acum_den) if acum_den else 0
            color = _color_tasa_01(tasa, unidad)
            fila_mes[unidad] = {"numerador": acum_num, "denominador": acum_den, "tasa": tasa, "color_tasa": color}
            sum_del_n += acum_num
            sum_del_d += acum_den

        tasa_del = calcular_tasa("IAAS 01")(sum_del_n, sum_del_d) if sum_del_d else 0
        fila_mes["TOTAL_OOAD"] = {
            "numerador": sum_del_n, "denominador": sum_del_d,
            "tasa": tasa_del, "color_tasa": _color_tasa_01(tasa_del, "TOTAL_OOAD"),
        }
        resultado[mes_target] = fila_mes
    return resultado


def calcular_anual_iaas01(all_months: dict):
    """Bloque ANUAL de IAAS 01: acumulado Ene→último mes registrado. None si no hay ningún mes."""
    if not all_months:
        return None
    hasta_mes = max(all_months.keys())
    resultado = {}
    sum_n, sum_d = 0, 0
    for unidad in UNIDADES_IAAS:
        if unidad == "TOTAL_OOAD":
            continue
        num, den, tiene_num, tiene_den, completo = _acumular_unidad(all_months, unidad, hasta_mes)
        if not tiene_num and not tiene_den:
            resultado[unidad] = None
            continue
        if not completo:
            resultado[unidad] = {
                "numerador":   num if tiene_num else "",
                "denominador": den if tiene_den else "",
                "tasa": "", "color_tasa": "Gris",
            }
            continue
        tasa  = calcular_tasa("IAAS 01")(num, den) if den else 0
        color = _color_tasa_01(tasa, unidad)
        resultado[unidad] = {"numerador": num, "denominador": den, "tasa": tasa, "color_tasa": color}
        sum_n += num
        sum_d += den

    tasa_del = calcular_tasa("IAAS 01")(sum_n, sum_d) if sum_d else 0
    resultado["TOTAL_OOAD"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_del, "color_tasa": _color_tasa_01(tasa_del, "TOTAL_OOAD"),
    }
    return resultado


def calcular_fila_iaas_uci(datos: dict, indicador: str) -> dict:
    """
    Bloque MENSUAL de IAAS 02-06: por unidad + 'OOAD', los valores listos para
    escribir. A diferencia de IAAS 01, aquí toda unidad se escribe siempre
    (Gris si no hay dato), nunca se omite una fila.
    """
    tasa_de   = calcular_tasa(indicador)
    resultado = {}
    sum_n, sum_d = 0, 0

    for unidad in UNIDADES_UCI:
        v     = _dato_unidad(datos, unidad)
        color = (v.get("color") if v else None) or "Gris"

        if color == "Gris":
            num = v.get("numerador") if v else None
            den = v.get("denominador") if v else None
            resultado[unidad] = {
                "numerador":   num if num is not None else "",
                "denominador": den if den is not None else "",
                "tasa": "", "color_tasa": "Gris",
            }
            continue

        num, den, tasa = v.get("numerador"), v.get("denominador"), v.get("tasa")
        resultado[unidad] = {"numerador": num, "denominador": den, "tasa": tasa, "color_tasa": color}
        sum_n += num or 0
        sum_d += den or 0

    tasa_ooad = tasa_de(sum_n, sum_d) if sum_d else 0
    resultado["OOAD"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_ooad, "color_tasa": _color_tasa_uci(tasa_ooad, indicador),
    }
    return resultado


def calcular_acumulado_iaas_uci(all_months: dict, indicador: str) -> dict:
    """Bloque MENSUAL ACUMULADO de IAAS 02-06: por mes (feb-dic presentes) y
    unidad + 'OOAD', el acumulado Ene→ese mes. None si la unidad no tiene nada
    acumulado todavía ese mes."""
    tasa_de   = calcular_tasa(indicador)
    resultado = {}

    for mes_target in range(2, 13):
        if mes_target not in all_months:
            continue
        fila_mes  = {}
        sum_del_n = 0
        sum_del_d = 0
        for unidad in UNIDADES_UCI:
            acum_num, acum_den, tiene_num, tiene_den, completo = _acumular_unidad(all_months, unidad, mes_target)
            if not tiene_num and not tiene_den:
                fila_mes[unidad] = None
                continue
            if not completo:
                fila_mes[unidad] = {
                    "numerador":   acum_num if tiene_num else "",
                    "denominador": acum_den if tiene_den else "",
                    "tasa": "", "color_tasa": "Gris",
                }
                continue
            tasa  = tasa_de(acum_num, acum_den) if acum_den else 0
            color = _color_tasa_uci(tasa, indicador)
            fila_mes[unidad] = {"numerador": acum_num, "denominador": acum_den, "tasa": tasa, "color_tasa": color}
            sum_del_n += acum_num
            sum_del_d += acum_den

        tasa_del = tasa_de(sum_del_n, sum_del_d) if sum_del_d else 0
        fila_mes["OOAD"] = {
            "numerador": sum_del_n, "denominador": sum_del_d,
            "tasa": tasa_del, "color_tasa": _color_tasa_uci(tasa_del, indicador),
        }
        resultado[mes_target] = fila_mes
    return resultado


def calcular_anual_iaas_uci(all_months: dict, indicador: str):
    """Bloque ANUAL de IAAS 02-06: acumulado Ene→último mes registrado. None si no hay ningún mes."""
    if not all_months:
        return None
    hasta_mes = max(all_months.keys())
    tasa_de   = calcular_tasa(indicador)
    resultado = {}
    sum_n, sum_d = 0, 0

    for unidad in UNIDADES_UCI:
        num, den, tiene_num, tiene_den, completo = _acumular_unidad(all_months, unidad, hasta_mes)
        if not tiene_num and not tiene_den:
            resultado[unidad] = None
            continue
        if not completo:
            resultado[unidad] = {
                "numerador":   num if tiene_num else "",
                "denominador": den if tiene_den else "",
                "tasa": "", "color_tasa": "Gris",
            }
            continue
        tasa  = tasa_de(num, den) if den else 0
        color = _color_tasa_uci(tasa, indicador)
        resultado[unidad] = {"numerador": num, "denominador": den, "tasa": tasa, "color_tasa": color}
        sum_n += num
        sum_d += den

    tasa_del = tasa_de(sum_n, sum_d) if sum_d else 0
    resultado["OOAD"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_del, "color_tasa": _color_tasa_uci(tasa_del, indicador),
    }
    return resultado