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

def _conteo_con_faltantes(conteo: Counter, valores_esperados: list[str]) -> list[dict]:
    """El conteo de mayor a menor y, al final, los valores del mapeo que no trajeron ninguna fila (cantidad 0)."""

    return _conteo_ordenado(conteo) + [{"valor": valor, "cantidad": 0} for valor in valores_esperados if valor not in conteo]


##--------------------------------------

def estadisticas_de_filas(filas: list[dict], columnas_conteo: dict[str, list[str]], unidades_sin_resultados: list[str]) -> dict:
    """
    @param filas                   - las filas guardadas (ya recortadas a la unidad del usuario si aplica)
    @param columnas_conteo         - {columna: valores del filtro del mapeo}; los valores sin filas van al final con cantidad 0
    @param unidades_sin_resultados - leidas sin filas: van al final de porUnidad con cantidad 0 para que no desaparezcan
    @returns totalRegistros, unidadesConRegistros, porColumna [{columna, conteos}] y porUnidad
    """

    por_unidad = Counter(fila.get("Unidad") for fila in filas)

    return {
        "totalRegistros": len(filas),
        "unidadesConRegistros": len(por_unidad),
        "porColumna": [
            {"columna": columna, "conteos": _conteo_con_faltantes(Counter(fila.get(columna) for fila in filas), valores)}
            for columna, valores in columnas_conteo.items()
        ],
        "porUnidad": _conteo_ordenado(por_unidad) + [{"valor": unidad, "cantidad": 0} for unidad in sorted(unidades_sin_resultados)],
    }
