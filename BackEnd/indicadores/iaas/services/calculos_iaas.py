"""
Cálculo puro de IAAS: alias de unidades, semáforo, acumulados y los valores
(numerador/denominador/tasa/color) listos para escribir en cada bloque del
Excel. Nada de este archivo depende de xlsxwriter — quien escribe el Excel
(generar_iaas.py) solo pide estos valores y decide en qué celda van.
Usado en: iaas/services/generar_iaas.py, extraccion_service.py, grafica_service.py
"""
import json
from iaas.config import RUTA_IAAS_JSON, ORDEN_DEMAS_IAAS, UNIDADES_HGS_IAAS01
from iaas.services.datos_json_service import leer_indicador_anio

with open(RUTA_IAAS_JSON, encoding="utf-8") as _f:
    _CFG = json.load(_f)

# Mismo orden y mismas 11 unidades que usan IAAS 02-06 (ORDEN_DEMAS_IAAS) — solo cambia que
# IAAS 01 le agrega el renglón de OOAD al final de su propia lista de unidades.
UNIDADES_IAAS     = ORDEN_DEMAS_IAAS + ["DELEGACION"]
UNIDADES_UCI      = ORDEN_DEMAS_IAAS
_UNIDADES_HGS_SET = set(UNIDADES_HGS_IAAS01)


def _alias_hgsz(nombre):
    """
    En el dato crudo, algunas unidades HGS/HGSMF vienen guardadas como HGSZ/HGSZMF —
    es la misma unidad, solo cambia el prefijo. Devuelve el nombre alterno a probar,
    o None si el nombre no tiene ese prefijo.
    """
    if nombre.startswith("HGSMF "):
        return "HGSZMF " + nombre[len("HGSMF "):]
    if nombre.startswith("HGS "):
        return "HGSZ " + nombre[len("HGS "):]
    return None


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
    sem      = _CFG["IAAS 01"]["Semaforo"]
    umbrales = sem.get("HGS") if unidad in _UNIDADES_HGS_SET else sem.get("HGZ", sem.get("OOAD"))
    if not umbrales or tasa is None:
        return "Bajo"
    esp = umbrales.get("Esperado", {})
    med = umbrales.get("Medio", {})
    if esp.get("Mayor", 0) <= tasa <= esp.get("Menor", 0):
        return "Esperado"
    elif med.get("Mayor", 0) <= tasa < med.get("Menor", 0):
        return "Medio"
    return "Bajo"


def _color_tasa_uci(tasa, indicador):
    sem = _CFG[indicador].get("Semaforo", {})
    if tasa is None:
        return "Bajo"
    esp = sem.get("Esperado", {})
    med = sem.get("Medio", {})
    if tasa > esp.get("Menor", 0):
        return "Bajo"
    elif tasa >= esp.get("Mayor", 0):
        return "Esperado"
    elif tasa >= med.get("Mayor", 0):
        return "Medio"
    return "Bajo"


def _filas_umbrales_iaas01():
    """
    Agrupa los tipos de unidad de IAAS 01 (HGS/HGZ/HGR/HGO/HGP/OOAD) por umbral idéntico.
    Dinámico: si dos tipos comparten los mismos valores de Esperado/Medio quedan en una sola
    fila; si algún tipo cambia sus valores en el JSON, se separa solo automáticamente.
    """
    sem    = _CFG["IAAS 01"]["Semaforo"]
    grupos = {}
    for nombre in ("HGS", "HGZ", "HGR", "HGO", "HGP", "OOAD"):
        umbral = sem.get(nombre)
        if not umbral:
            continue
        esp   = umbral.get("Esperado", {})
        med   = umbral.get("Medio", {})
        clave = (esp.get("Mayor"), esp.get("Menor"), med.get("Mayor"), med.get("Menor"))
        grupos.setdefault(clave, []).append(nombre)

    filas = []
    for (esp_mayor, esp_menor, med_mayor, med_menor), nombres in grupos.items():
        filas.append({
            "etiqueta": "/".join(nombres),
            "esperado": f"{esp_mayor} – {esp_menor}",
            "medio":    f"> {med_mayor} – < {esp_mayor}",
            "bajo":     f"< {med_mayor}  ó  > {esp_menor}",
        })
    return filas


def _rango_umbral_uci(indicador):
    """Umbral fijo de un indicador IAAS 02-06 (uno solo, no varía por unidad ni por mes) —
    mismo criterio de comparación que usa _color_tasa_uci, en formato de texto."""
    sem = _CFG[indicador].get("Semaforo", {})
    esp = sem.get("Esperado", {})
    med = sem.get("Medio", {})
    return {
        "esperado": f"{esp.get('Mayor', '?')} – {esp.get('Menor', '?')}",
        "medio":    f"≥ {med.get('Mayor', '?')} – < {esp.get('Mayor', '?')}",
        "bajo":     f"< {med.get('Mayor', '?')}  ó  > {esp.get('Menor', '?')}",
    }


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
                    "numerador":   v.get("NUMERADOR"),
                    "denominador": v.get("DENOMINADOR"),
                    "tasa":        v.get("TASA"),
                    "color":       (v.get("COLOR") or "Bajo").capitalize(),
                }
                for unit, v in mes_data.get("DATOS", {}).items()
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
    siempre hasta el último mes que haya)."""
    num, den, tiene = 0, 0, False
    for m in range(1, hasta_mes + 1):
        v = _dato_unidad(all_months.get(m, {}), unidad)
        if v:
            num  += v.get("numerador") or 0
            den  += v.get("denominador") or 0
            tiene = True
    return num, den, tiene


def calcular_fila_iaas01(datos: dict) -> dict:
    """
    Bloque MENSUAL de IAAS 01: por unidad (+ 'DELEGACION'), los valores listos
    para escribir (numerador/denominador con "" en vez de None cuando el dato
    es Gris, tasa vacía si es Gris) y el color para el estilo de la celda de
    tasa. None si la unidad no tiene registro ese mes (no se escribe la fila).
    """
    sum_num = 0
    sum_den = 0
    for unidad in UNIDADES_IAAS:
        if unidad == "DELEGACION":
            continue
        v = _dato_unidad(datos, unidad)
        if v and (v.get("color") or "Gris") != "Gris":
            sum_num += v.get("numerador") or 0
            sum_den += v.get("denominador") or 0
    tasa_deleg = round((sum_num / sum_den) * 1000, 2) if sum_den else 0

    resultado = {}
    for unidad in UNIDADES_IAAS:
        if unidad == "DELEGACION":
            color_deleg = (
                datos.get("DELEGACION", {}).get("color")
                if isinstance(datos.get("DELEGACION"), dict)
                else _color_tasa_01(tasa_deleg, "DELEGACION")
            )
            resultado["DELEGACION"] = {
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
            if unidad == "DELEGACION":
                continue
            acum_num, acum_den, tiene = _acumular_unidad(all_months, unidad, mes_target)
            if not tiene:
                fila_mes[unidad] = None
                continue
            tasa  = round((acum_num / acum_den) * 1000, 2) if acum_den else 0
            color = _color_tasa_01(tasa, unidad)
            fila_mes[unidad] = {"numerador": acum_num, "denominador": acum_den, "tasa": tasa, "color_tasa": color}
            sum_del_n += acum_num
            sum_del_d += acum_den

        tasa_del = round((sum_del_n / sum_del_d) * 1000, 2) if sum_del_d else 0
        fila_mes["DELEGACION"] = {
            "numerador": sum_del_n, "denominador": sum_del_d,
            "tasa": tasa_del, "color_tasa": _color_tasa_01(tasa_del, "DELEGACION"),
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
        if unidad == "DELEGACION":
            continue
        num, den, tiene = _acumular_unidad(all_months, unidad, hasta_mes)
        if not tiene:
            resultado[unidad] = None
            continue
        tasa  = round((num / den) * 1000, 2) if den else 0
        color = _color_tasa_01(tasa, unidad)
        resultado[unidad] = {"numerador": num, "denominador": den, "tasa": tasa, "color_tasa": color}
        sum_n += num
        sum_d += den

    tasa_del = round((sum_n / sum_d) * 1000, 2) if sum_d else 0
    resultado["DELEGACION"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_del, "color_tasa": _color_tasa_01(tasa_del, "DELEGACION"),
    }
    return resultado


def calcular_fila_iaas_uci(datos: dict, indicador: str) -> dict:
    """
    Bloque MENSUAL de IAAS 02-06: por unidad + 'OOAD', los valores listos para
    escribir. A diferencia de IAAS 01, aquí toda unidad se escribe siempre
    (Gris si no hay dato), nunca se omite una fila.
    """
    sem       = _CFG[indicador].get("Semaforo", {})
    tasa_mult = sem.get("Tasa", 1000)
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

    tasa_ooad = round((sum_n / sum_d) * tasa_mult, 2) if sum_d else 0
    resultado["OOAD"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_ooad, "color_tasa": _color_tasa_uci(tasa_ooad, indicador),
    }
    return resultado


def calcular_acumulado_iaas_uci(all_months: dict, indicador: str) -> dict:
    """Bloque MENSUAL ACUMULADO de IAAS 02-06: por mes (feb-dic presentes) y
    unidad + 'OOAD', el acumulado Ene→ese mes. None si la unidad no tiene nada
    acumulado todavía ese mes."""
    sem       = _CFG[indicador].get("Semaforo", {})
    tasa_mult = sem.get("Tasa", 1000)
    resultado = {}

    for mes_target in range(2, 13):
        if mes_target not in all_months:
            continue
        fila_mes  = {}
        sum_del_n = 0
        sum_del_d = 0
        for unidad in UNIDADES_UCI:
            acum_num, acum_den, tiene = _acumular_unidad(all_months, unidad, mes_target)
            if not tiene:
                fila_mes[unidad] = None
                continue
            tasa  = round((acum_num / acum_den) * tasa_mult, 2) if acum_den else 0
            color = _color_tasa_uci(tasa, indicador)
            fila_mes[unidad] = {"numerador": acum_num, "denominador": acum_den, "tasa": tasa, "color_tasa": color}
            sum_del_n += acum_num
            sum_del_d += acum_den

        tasa_del = round((sum_del_n / sum_del_d) * tasa_mult, 2) if sum_del_d else 0
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
    sem       = _CFG[indicador].get("Semaforo", {})
    tasa_mult = sem.get("Tasa", 1000)
    resultado = {}
    sum_n, sum_d = 0, 0

    for unidad in UNIDADES_UCI:
        num, den, tiene = _acumular_unidad(all_months, unidad, hasta_mes)
        if not tiene:
            resultado[unidad] = None
            continue
        tasa  = round((num / den) * tasa_mult, 2) if den else 0
        color = _color_tasa_uci(tasa, indicador)
        resultado[unidad] = {"numerador": num, "denominador": den, "tasa": tasa, "color_tasa": color}
        sum_n += num
        sum_d += den

    tasa_del = round((sum_n / sum_d) * tasa_mult, 2) if sum_d else 0
    resultado["OOAD"] = {
        "numerador": sum_n, "denominador": sum_d,
        "tasa": tasa_del, "color_tasa": _color_tasa_uci(tasa_del, indicador),
    }
    return resultado