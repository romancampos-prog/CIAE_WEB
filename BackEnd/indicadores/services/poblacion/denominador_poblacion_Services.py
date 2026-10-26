"""
Denominador de los indicadores que dependen de la poblacion (fuente "poblacionInfoSalud" en el
mapeo): lo leido por unidad de POBLACION_{año}.json y la formula del mapeo sobre el.
Usado en: services/ftp/extraer_indicador_ftp_Services.py, services/poblacion/recalcular_poblacion_Services.py,
          services/extractor/corte_semestral_Services.py
"""
from datos.bd_ciae.poblacion_Datos import leer_poblacion, ruta_poblacion
from schemas.model.unidad_resultado_Model import DatosExtraidosUnidad
from services.compartido.calculo.formulas_Services import UMBRAL_SUBE_REDONDEO, evaluar_lado
from shared.UNIDADES import NOMBREUNIDADESARCHIVO


def extraer_poblacion(sexo: dict[str, list[str]], ano: str, extraidos: dict[str, DatosExtraidosUnidad]) -> list[tuple[str, str, str]]:
    """
    Llena extraidos[unidad].denominador[grupo] con los valores por columna de POBLACION_{año}.json.
    Regresa los errores como (unidad, grupo, mensaje) para quien los quiera registrar (FTP).
    """

    ruta = ruta_poblacion(ano)

    if not ruta.exists():
        for datos in extraidos.values():
            for grupo in sexo:
                datos.denominador[grupo] = None

        return [(unidad, "poblacion", f"No existe {ruta}") for unidad in extraidos]

    poblacion = leer_poblacion(ano).get("POBLACION", {})
    errores = []

    for unidad, datos in extraidos.items():
        for grupo, columnas in sexo.items():
            try:
                datos.denominador[grupo] = [float(poblacion[unidad][grupo][columna]) for columna in columnas]
            except KeyError as error:
                errores.append((unidad, grupo, f"No existe {error} en POBLACION"))
                datos.denominador[grupo] = None

    return errores


##--------------------------------------

def denominador_de_poblacion(sexo: dict[str, list[str]], formula_denominador: str, ano: str | int) -> dict[str, int | None]:
    """{unidad: denominador} de las 46 unidades, con la formula del mapeo sobre la poblacion del año."""
    extraidos = {unidad: DatosExtraidosUnidad() for unidad in NOMBREUNIDADESARCHIVO}
    extraer_poblacion(sexo, str(ano), extraidos)
    denominadores = {}

    for unidad, datos in extraidos.items():
        try:
            denominadores[unidad] = evaluar_lado(formula_denominador, datos.denominador, UMBRAL_SUBE_REDONDEO)
        except Exception as error:
            print(f"[Poblacion] Error evaluando el denominador de {unidad}: {error}")
            denominadores[unidad] = None

    return denominadores
