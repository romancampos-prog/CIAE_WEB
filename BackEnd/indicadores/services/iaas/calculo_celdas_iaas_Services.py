"""
Calculo puro de las celdas del Excel de IAAS (exclusivo de IAAS): acumulados,
tasa y color por unidad, para los bloques MENSUAL, MENSUAL ACUMULADO y ANUAL de
los 6 indicadores. No sabe de xlsxwriter -- solo regresa los valores listos
para escribir; quien decide en que fila/columna va cada uno es
dibujante_excel_iaas_Services.py.
Usado en: services/iaas/dibujante_excel_iaas_Services.py
"""
from services.calculo_indicador_Services import calcular_resultado
from services.indicadorMapeo_Services import cargar_indicador_iaas
from services.bd_Ciae_Guardado_Services import leer_historico_indicador
from shared.semaforo_service import evaluar_color, umbrales_para
from shared.UNIDADES import ORDEN_DEMAS_IAAS, alias_hgsz, grupo_de_unidad_iaas01

# Mismo orden y mismas 11 unidades que usan IAAS 02-06 (ORDEN_DEMAS_IAAS) -- solo cambia que
# IAAS 01 le agrega el renglón de OOAD al final de su propia lista de unidades.
UNIDADES_IAAS = ORDEN_DEMAS_IAAS + ["TOTAL_OOAD"]
UNIDADES_UCI  = ORDEN_DEMAS_IAAS


from services.calculo_indicador_Services import calcular_resultado
from services.indicadorMapeo_Services import cargar_indicador_iaas
from services.bd_Ciae_Guardado_Services import leer_historico_indicador
from shared.semaforo_service import evaluar_color, umbrales_para
from shared.UNIDADES import MESES, ORDEN_DEMAS_IAAS, alias_hgsz, grupo_de_unidad_iaas01

# Mismo orden y mismas 11 unidades que usan IAAS 02-06 (ORDEN_DEMAS_IAAS) -- solo cambia que
# IAAS 01 le agrega el renglón de OOAD al final de su propia lista de unidades.
UNIDADES_IAAS = ORDEN_DEMAS_IAAS + ["TOTAL_OOAD"]
UNIDADES_UCI  = ORDEN_DEMAS_IAAS


def _dato_unidad(datos, unidad):
    """Busca los datos de una unidad por su nombre canónico, y si no aparece,
    prueba con el alias HGS(MF)/HGSZ(MF) antes de darla por sin datos."""
    v = datos.get(unidad)
    if isinstance(v, dict):
        return v
    alias = alias_hgsz(unidad)
    if alias:
        v = datos.get(alias)
        if isinstance(v, dict):
            return v
    return None


def _tasa(indicador: str, numerador, denominador):
    """Misma cuenta que calcular_resultado (compartida con FTP): aqui siempre se llama con
    numerador/denominador ya conocidos y completos -- las llamadoras ya filtraron el caso Gris."""
    formula = cargar_indicador_iaas(indicador).reporte.operacion.resultado
    return calcular_resultado(numerador, denominador, formula)


def _color_tasa_01(tasa, unidad):
    return _color_de_tasa(tasa, "IAAS 01", unidad)


def _color_tasa_uci(tasa, indicador):
    return _color_de_tasa(tasa, indicador)


def _color_de_tasa(tasa, indicador: str, unidad: str | None = None) -> str:
    """Color de una tasa ya calculada. Sin tasa -> "Bajo", como siempre lo hizo el Excel de IAAS."""
    if tasa is None:
        return "Bajo"
    semaforo = cargar_indicador_iaas(indicador).semaforo
    return evaluar_color(tasa, umbrales_para(semaforo, None, grupo_de_unidad_iaas01(unidad)))


def _filas_umbrales_iaas01():
    """Una fila por conjunto de grupos con umbrales identicos (ej. IAAS 01: "HGS" y
    "HGR/HGZ/HGO/HGP/OOAD"). Dinamico: si dos grupos comparten umbrales quedan juntos."""
    semaforo = cargar_indicador_iaas("IAAS 01").semaforo
    grupos: dict[tuple, list[str]] = {}
    for nombre, metas in semaforo.items():
        grupos.setdefault((metas.get("Esperado", ""), metas.get("Medio", ""), metas.get("Bajo", "")), []).append(nombre)
    return [
        {"etiqueta": "/".join(nombres), "esperado": esperado, "medio": medio, "bajo": bajo}
        for (esperado, medio, bajo), nombres in grupos.items()
    ]


def _rango_umbral_uci(indicador: str) -> dict:
    """Textos de umbral de un indicador con semaforo unico (IAAS 02-06), tal cual vienen en el mapeo."""
    metas = cargar_indicador_iaas(indicador).semaforo
    return {"esperado": metas.get("Esperado", ""), "medio": metas.get("Medio", ""), "bajo": metas.get("Bajo", "")}


_NOMBRE_A_NUM = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4,
    "MAYO": 5, "JUNIO": 6, "JULIO": 7, "AGOSTO": 8,
    "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
}


def _leer_historicos_IAAS(anio: str, mes_num: int) -> dict:
    historicos = {}

    for ind_n in range(1, 7):
        ind_key = f"IAAS 0{ind_n}"
        data    = leer_historico_indicador(ind_key, anio)

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
    tasa_deleg = _tasa("IAAS 01", sum_num, sum_den) if sum_den else 0

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
            tasa  = _tasa("IAAS 01", acum_num, acum_den) if acum_den else 0
            color = _color_tasa_01(tasa, unidad)
            fila_mes[unidad] = {"numerador": acum_num, "denominador": acum_den, "tasa": tasa, "color_tasa": color}
            sum_del_n += acum_num
            sum_del_d += acum_den

        tasa_del = _tasa("IAAS 01", sum_del_n, sum_del_d) if sum_del_d else 0
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
        tasa  = _tasa("IAAS 01", num, den) if den else 0
        color = _color_tasa_01(tasa, unidad)
        resultado[unidad] = {"numerador": num, "denominador": den, "tasa": tasa, "color_tasa": color}
        sum_n += num
        sum_d += den

    tasa_del = _tasa("IAAS 01", sum_n, sum_d) if sum_d else 0
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

    tasa_ooad = _tasa(indicador, sum_n, sum_d) if sum_d else 0
    resultado["OOAD"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_ooad, "color_tasa": _color_tasa_uci(tasa_ooad, indicador),
    }
    return resultado


def calcular_acumulado_iaas_uci(all_months: dict, indicador: str) -> dict:
    """Bloque MENSUAL ACUMULADO de IAAS 02-06: por mes (feb-dic presentes) y
    unidad + 'OOAD', el acumulado Ene→ese mes. None si la unidad no tiene nada
    acumulado todavía ese mes."""
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
            tasa  = _tasa(indicador, acum_num, acum_den) if acum_den else 0
            color = _color_tasa_uci(tasa, indicador)
            fila_mes[unidad] = {"numerador": acum_num, "denominador": acum_den, "tasa": tasa, "color_tasa": color}
            sum_del_n += acum_num
            sum_del_d += acum_den

        tasa_del = _tasa(indicador, sum_del_n, sum_del_d) if sum_del_d else 0
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
        tasa  = _tasa(indicador, num, den) if den else 0
        color = _color_tasa_uci(tasa, indicador)
        resultado[unidad] = {"numerador": num, "denominador": den, "tasa": tasa, "color_tasa": color}
        sum_n += num
        sum_d += den

    tasa_del = _tasa(indicador, sum_n, sum_d) if sum_d else 0
    resultado["OOAD"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_del, "color_tasa": _color_tasa_uci(tasa_del, indicador),
    }
    return resultado
