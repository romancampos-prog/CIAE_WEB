"""
El perfil del indicador para la grafica, sacado del mapeo: tipo de meta, niveles del semaforo,
meta por mes (y por unidad en IAAS 01), unidad de medida, si es por corte y el umbral de
denominador chico, para que el front no deduzca reglas por su cuenta.
Usado en: services/grafica/grafica_indicador_Services.py
"""
from services.compartido.calculo.formulas_Services import evaluar_formula
from services.compartido.semaforo.umbrales_semaforo_Services import es_agrupado, es_formato_explicito, umbrales_para
from services.grafica.metas_semaforo_Services import meta_numerica, tipo_de_meta
from shared.MESES import MESES_ESTANDAR
from shared.reglas_periodicidad import es_periodicidad_de_corte
from shared.UNIDADES import grupo_de_unidad_iaas01

# Con menos casos que esto en el denominador, un solo caso mueve mucho el resultado: la grafica lo avisa.
UMBRAL_DENOMINADOR_CHICO = 20

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
      cuando el semaforo va por grupo, IAAS 01), unidad de medida, si se publica por corte y el
      umbral de denominador chico (solo en porcentajes y tasas: en un promedio el denominador no
      son casos, ej. dias laborados).
    """

    semaforo = bloque.get("semaforo") or {}
    formula = (bloque.get("reporte") or {}).get("operacion", {}).get("resultado")
    unidad_medida = _unidad_de_medida(formula)
    meta_por_mes = {mes: meta_numerica(umbrales_para(semaforo, mes, "OOAD")) for mes in MESES_ESTANDAR} if semaforo else {}
    # El semaforo por mes puede no traer todos los meses (trimestrales: solo marzo, junio...).
    tipos = [tipo_de_meta(umbrales_para(semaforo, mes, "OOAD")) for mes in MESES_ESTANDAR] if semaforo else []
    tipo_meta = next((tipo for tipo in tipos if tipo), None)

    meta_de_unidad = None

    if es_agrupado(semaforo):
        meta_de_unidad = {u: meta_numerica(umbrales_para(semaforo, None, grupo_de_unidad_iaas01(u))) for u in unidades}

    return {
        "tipoMeta": tipo_meta,
        "niveles": _niveles_semaforo(semaforo),
        "metaPorMes": meta_por_mes,
        "metaDeUnidad": meta_de_unidad,
        "unidadMedida": unidad_medida,
        "esCorte": es_periodicidad_de_corte(bloque.get("periodicidad")),
        "umbralDenominadorChico": UMBRAL_DENOMINADOR_CHICO if unidad_medida in ("%", "por 1,000", "por 100,000") else None,
        "serieCortes": None,
    }
