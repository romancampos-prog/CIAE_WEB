"""
El perfil del indicador para la grafica, sacado del mapeo: tipo de meta, niveles del semaforo,
meta y franjas del semaforo por mes (y por unidad en IAAS 01), unidad de medida y si es por corte, para que el
front no deduzca reglas por su cuenta.
Usado en: services/grafica/grafica_indicador_Services.py
"""
from services.calculo.formulas_Services import evaluar_formula
from services.grafica.franjas_semaforo_Services import franjas_del_semaforo
from services.grafica.metas_semaforo_Services import meta_numerica, tipo_de_meta
from services.semaforo.umbrales_semaforo_Services import es_agrupado, es_formato_explicito, umbrales_para
from shared.MESES import MESES_ESTANDAR
from shared.reglas_periodicidad import es_periodicidad_de_corte
from shared.UNIDADES import grupo_de_unidad_iaas01

# Lo que vale la formula con numerador = denominador = 1 dice en que se expresa el resultado.
_UNIDAD_POR_FACTOR = {1: "promedio", 100: "%", 1000: "por 1,000", 100000: "por 100,000"}


def _niveles_semaforo(semaforo: dict) -> list[str]:
    """
    Los niveles que de verdad puede tomar el indicador. Medio solo si algun bloque del mapeo lo
    define (CACU 03, EH 03 no lo tienen); en el formato legado (numeros) siempre hay Medio.
    """

    if not semaforo:
        return []

    bloques = list(semaforo.values()) if any(isinstance(v, dict) for v in semaforo.values()) else [semaforo]
    tiene_medio = any(b.get("Medio") or not es_formato_explicito(b) for b in bloques)
    return ["Esperado", "Medio", "Bajo"] if tiene_medio else ["Esperado", "Bajo"]


##--------------------------------------

def _unidad_de_medida(formula: str | None) -> str | None:
    """"%", "por 1,000", "por 100,000" o "promedio" segun la formula del mapeo; None sin formula."""

    if not formula:
        return None

    factor = evaluar_formula(formula, 1, 1)
    return _UNIDAD_POR_FACTOR.get(int(factor)) if factor == int(factor) else None


##--------------------------------------

def perfil_de_indicador(bloque: dict, unidades: list[str]) -> dict:
    """
    Lo que la grafica necesita saber del indicador, sacado del mapeo:
      tipoMeta (mas/menos/rango/None), niveles del semaforo, meta de cada mes (y de cada unidad
      cuando el semaforo va por grupo, IAAS 01), unidad de medida y si se publica por corte.
    """

    semaforo = bloque.get("semaforo") or {}
    formula = (bloque.get("reporte") or {}).get("operacion", {}).get("resultado")
    unidad_medida = _unidad_de_medida(formula)
    meta_por_mes = {mes: meta_numerica(umbrales_para(semaforo, mes, "OOAD")) for mes in MESES_ESTANDAR} if semaforo else {}
    # El semaforo por mes puede no traer todos los meses (trimestrales: solo marzo, junio...).
    tipos = [tipo_de_meta(umbrales_para(semaforo, mes, "OOAD")) for mes in MESES_ESTANDAR] if semaforo else []
    tipo_meta = next((tipo for tipo in tipos if tipo), None)

    # Las franjas (desde, hasta, nivel) de cada mes: la grafica se dibuja sobre ellas
    franjas_por_mes = {mes: franjas_del_semaforo(umbrales_para(semaforo, mes, "OOAD")) for mes in MESES_ESTANDAR} if semaforo else {}

    meta_de_unidad = None
    franjas_de_unidad = None

    if es_agrupado(semaforo):
        meta_de_unidad = {u: meta_numerica(umbrales_para(semaforo, None, grupo_de_unidad_iaas01(u))) for u in unidades}
        franjas_de_unidad = {u: franjas_del_semaforo(umbrales_para(semaforo, None, grupo_de_unidad_iaas01(u))) for u in unidades}

    return {
        "tipoMeta": tipo_meta,
        "niveles": _niveles_semaforo(semaforo),
        "metaPorMes": meta_por_mes,
        "metaDeUnidad": meta_de_unidad,
        "franjasPorMes": franjas_por_mes,
        "franjasDeUnidad": franjas_de_unidad,
        "unidadMedida": unidad_medida,
        # Palabras para leer numerador y denominador ("tamizadas" / "mujeres de 25 a 64"), del mapeo
        "etiquetaNumerador": (bloque.get("informacion") or {}).get("etiquetaNumerador"),
        "etiquetaDenominador": (bloque.get("informacion") or {}).get("etiquetaDenominador"),
        "esCorte": es_periodicidad_de_corte(bloque.get("periodicidad")),
        "serieCortes": None,
    }
