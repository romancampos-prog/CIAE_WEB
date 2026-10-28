"""
Estadisticas de las filas extraidas: cuantos registros hay, por cada columna del filtro del mapeo
(ej. Clave de la Accion) y por unidad. El front solo las pinta.
Usado en: services/ftp/consulta_extraccion_Services.py
"""
from collections import Counter


def _conteo_ordenado(conteo: Counter) -> list[dict]:
    """[{valor, cantidad}] de mayor a menor."""

    return [{"valor": valor, "cantidad": cantidad} for valor, cantidad in conteo.most_common()]


##--------------------------------------

def estadisticas_de_filas(filas: list[dict], columnas_conteo: list[str]) -> dict:
    """
    @param filas           - las filas guardadas (ya recortadas a la unidad del usuario si aplica)
    @param columnas_conteo - las columnas a contar (las del filtroColumna del mapeo)
    @returns totalRegistros, unidadesConRegistros, porColumna [{columna, conteos}] y porUnidad
    """

    por_unidad = Counter(fila.get("Unidad") for fila in filas)

    return {
        "totalRegistros": len(filas),
        "unidadesConRegistros": len(por_unidad),
        "porColumna": [
            {"columna": columna, "conteos": _conteo_ordenado(Counter(fila.get(columna) for fila in filas))}
            for columna in columnas_conteo
        ],
        "porUnidad": _conteo_ordenado(por_unidad),
    }
