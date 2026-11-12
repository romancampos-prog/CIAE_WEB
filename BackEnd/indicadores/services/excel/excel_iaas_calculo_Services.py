"""
Excel de IAAS, la parte de los datos: lee lo guardado en BD_CIAE y arma cada bloque (mensual,
mensual acumulado y anual) por unidad y del OOAD, con la tasa y el color del mapeo.
Usado en: services/excel/excel_iaas_Services.py, services/excel/excel_iaas_dibujo_Services.py
"""
from datos.bd_ciae.historico_indicador_Datos import leer_historico_indicador
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_iaas
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL, calcular_resultado
from services.semaforo.color_semaforo_Services import color_de_resultado
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import ORDEN_DEMAS_IAAS, alias_hgsz

# Las mismas 11 unidades y orden en los 6 indicadores; el OOAD va en la fila de abajo.
UNIDADES = ORDEN_DEMAS_IAAS

MESES = [mes.upper() for mes in MESES_ESTANDAR]


def _dato_unidad(datos: dict, unidad: str) -> dict | None:
    """Los datos de una unidad por su nombre del catalogo o, si no aparece, por su alias HGS(MF)/HGSZ(MF)."""
    valores = datos.get(unidad)

    if isinstance(valores, dict):
        return valores

    alias = alias_hgsz(unidad)

    if alias and isinstance(datos.get(alias), dict):
        return datos[alias]

    return None


##--------------------------------------

def _celdas(indicador: str, unidad: str, numerador, denominador) -> dict:
    """NUM / DEN / tasa y color de una unidad con dato completo (o de la suma del OOAD)."""
    mapeo = cargar_indicador_iaas(indicador)
    tasa = calcular_resultado(numerador, denominador, mapeo.reporte.operacion.resultado) if denominador else 0
    return {"numerador": numerador, "denominador": denominador, "tasa": tasa,
            "color_tasa": color_de_resultado(tasa, mapeo.semaforo, None, unidad)}


##--------------------------------------

def _celdas_gris(numerador, denominador) -> dict:
    """Unidad incompleta: se muestra lo que si exista, sin tasa y fuera del total del OOAD."""
    return {"numerador": numerador if numerador is not None else "", "denominador": denominador if denominador is not None else "",
            "tasa": "", "color_tasa": "Gris"}


##--------------------------------------

def leer_meses_guardados(anio: str, indicador: str) -> dict[int, dict]:
    """{numero de mes: {unidad: {numerador, denominador, tasa, color}}} de lo guardado del año."""
    meses = {}

    for mes_nombre, mes_data in leer_historico_indicador(indicador, anio).get("MESES", {}).items():
        if mes_nombre.upper() not in MESES:
            continue

        datos_mes = {}

        for unidad, guardado in mes_data.get("Reporte", {}).items():
            datos_mes[unidad] = {"numerador": guardado.get("numerador"), "denominador": guardado.get("denominador"),
                                 "tasa": guardado.get("%"), "color": guardado.get("desempeno") or "Bajo"}

        if datos_mes:
            meses[MESES.index(mes_nombre.upper()) + 1] = datos_mes

    return meses


##--------------------------------------

def fila_mensual(datos: dict, indicador: str) -> dict:
    """
    Bloque MENSUAL de un mes: por unidad lo guardado (Gris si quedo incompleta) y el OOAD
    sumando solo las unidades completas. En IAAS 01 una unidad sin registro ese mes no se
    escribe (None) y el OOAD conserva el color guardado; en 02-06 toda unidad se escribe.
    """

    es_iaas01 = indicador == "IAAS 01"
    resultado = {}
    suma_numerador = suma_denominador = 0

    for unidad in UNIDADES:
        dato = _dato_unidad(datos, unidad)

        if dato is None and es_iaas01:
            resultado[unidad] = None
        elif dato is None:
            resultado[unidad] = _celdas_gris(None, None)
        elif dato["color"] == "Gris":
            resultado[unidad] = _celdas_gris(dato["numerador"], dato["denominador"])
        else:
            resultado[unidad] = {"numerador": dato["numerador"], "denominador": dato["denominador"], "tasa": dato["tasa"], "color_tasa": dato["color"]}
            suma_numerador += dato["numerador"] or 0
            suma_denominador += dato["denominador"] or 0

    resultado[CLAVE_TOTAL] = _celdas(indicador, CLAVE_TOTAL, suma_numerador, suma_denominador)

    if es_iaas01 and isinstance(datos.get(CLAVE_TOTAL), dict):
        resultado[CLAVE_TOTAL]["color_tasa"] = datos[CLAVE_TOTAL].get("color")

    return resultado


##--------------------------------------

def fila_acumulada(meses: dict[int, dict], indicador: str, hasta_mes: int) -> dict:
    """
    Enero -> hasta_mes por unidad y del OOAD (MENSUAL ACUMULADO y ANUAL). El denominador se
    acumula en todos los meses donde exista; si a la unidad le falta el numerador o el
    denominador en algun mes queda Gris (fuera del OOAD) con lo que si tenga. None si no tiene nada.
    """
    resultado = {}
    suma_numerador = suma_denominador = 0

    for unidad in UNIDADES:
        numerador = denominador = 0
        tiene_numerador = tiene_denominador = False
        completo = True

        for numero_mes in range(1, hasta_mes + 1):
            dato = _dato_unidad(meses.get(numero_mes, {}), unidad)

            if not dato:
                continue

            if dato["numerador"] is not None:
                numerador += dato["numerador"]
                tiene_numerador = True

            if dato["denominador"] is not None:
                denominador += dato["denominador"]
                tiene_denominador = True

            if dato["numerador"] is None or dato["denominador"] is None:
                completo = False

        if not tiene_numerador and not tiene_denominador:
            resultado[unidad] = None
        elif not completo:
            resultado[unidad] = _celdas_gris(numerador if tiene_numerador else None, denominador if tiene_denominador else None)
        else:
            resultado[unidad] = _celdas(indicador, unidad, numerador, denominador)
            suma_numerador += numerador
            suma_denominador += denominador

    resultado[CLAVE_TOTAL] = _celdas(indicador, CLAVE_TOTAL, suma_numerador, suma_denominador)
    return resultado
