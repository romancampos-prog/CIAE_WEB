"""
Color del semaforo (Esperado/Medio/Bajo/Gris) de un resultado contra los umbrales del mapeo, y
semaforizado de las unidades de un reporte. Un solo lugar para esta regla: la usan FTP, IAAS,
Extractor, las graficas y el Excel.
Usado en: services/*
"""
from schemas.model.reporte_guardado_Model import UnidadDatos
from schemas.model.unidad_resultado_Model import ResultadoUnidad, UnidadSemaforizada
from services.compartido.semaforo.umbrales_semaforo_Services import condicion_de_umbral, es_formato_explicito, umbrales_para
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import grupo_de_unidad_iaas01


def evaluar_color(resultado: float, metas: dict) -> str:
    """"Esperado" / "Medio" / "Bajo" segun el resultado y las metas (formato legado o explicito)."""
    if es_formato_explicito(metas):
        return _evaluar_explicito(resultado, metas)
    return _evaluar_legado(resultado, metas)


##--------------------------------------

def _evaluar_explicito(resultado: float, metas: dict) -> str:
    if "Esperado" in metas:
        if condicion_de_umbral(metas["Esperado"])(resultado):
            return "Esperado"

    for clave in ("Bajo", "Alto"):
        if clave in metas:
            if condicion_de_umbral(metas[clave])(resultado):
                return "Bajo"

    return "Medio"


##--------------------------------------

def _evaluar_legado(resultado: float, metas: dict) -> str:
    if "Bajo" in metas and "Esperado" in metas:
        if resultado >= metas["Esperado"]:
            return "Esperado"
        elif resultado <= metas["Bajo"]:
            return "Bajo"

        return "Medio"
    elif "Alto" in metas and "Esperado" in metas:
        if resultado <= metas["Esperado"]:
            return "Esperado"
        elif resultado >= metas["Alto"]:
            return "Bajo"

        return "Medio"

    return "Gris"


##--------------------------------------

def color_de_resultado(resultado: float | None, semaforo: dict, mes: str | None = None, unidad: str | None = None) -> str:
    """
    Color de una unidad: Gris si no tiene resultado; si no, el de los umbrales de ese mes
    ("Enero".."Diciembre") o del grupo de la unidad (solo IAAS 01 tiene semaforo agrupado).
    """
    if resultado is None:
        return "Gris"
    return evaluar_color(resultado, umbrales_para(semaforo, mes, grupo_de_unidad_iaas01(unidad)))


##--------------------------------------

def semaforizar_unidades(
    unidades: dict[str, ResultadoUnidad], semaforo: dict, mes: str | int | None = None,
) -> dict[str, UnidadSemaforizada]:
    """{unidad: ResultadoUnidad} -> {unidad: UnidadSemaforizada}; mes como numero (1-12 o "01"-"12")."""
    nombre_mes = MESES_ESTANDAR[int(mes) - 1] if mes else None
    return {
        nombre: UnidadSemaforizada(**unidad.model_dump(), color=color_de_resultado(unidad.resultado, semaforo, nombre_mes, nombre))
        for nombre, unidad in unidades.items()
    }


##--------------------------------------

def semaforizar_reporte(
    datos: dict[str, dict[str, UnidadDatos]] | dict[str, UnidadDatos], semaforo: dict | None, mes: str | None = None,
) -> dict[str, dict[str, UnidadDatos]] | dict[str, UnidadDatos]:
    """
    Pone el 'desempeno' de cada UnidadDatos (formato guardado en BD_CIAE). Sirve para varios
    meses ({mes: {unidad: UnidadDatos}}, ej. el mensual acumulado) o para uno solo
    ({unidad: UnidadDatos}, con 'mes' aparte como "Enero".."Diciembre"). Las unidades sin
    resultado se dejan como vienen: no se semaforiza lo que no se pudo calcular.
    """

    if not semaforo:
        return datos
    if isinstance(next(iter(datos.values()), None), dict):
        return {m: semaforizar_reporte(unidades, semaforo, m) for m, unidades in datos.items()}

    for unidad, dato in datos.items():
        if dato.resultado is not None:
            dato.desempeno = color_de_resultado(dato.resultado, semaforo, mes, unidad)

    return datos
