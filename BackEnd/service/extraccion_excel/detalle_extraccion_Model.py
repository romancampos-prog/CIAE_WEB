"""
El bloque "detalle" de reporte.numerador/denominador del mapeo, un modelo por modoExtraccion
(solo con lo que cada modo de verdad usa, ver indicadores/mapeo/README.md). El motor de
extraccion lo valida antes de extraer: si el mapeo trae un dato mal formado se sabe de
inmediato en vez de tronar a medio pandas.
Usado en: el motor y los modos de extraccion; en indicadores, el Extractor
"""
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class CondicionFiltro(BaseModel):
    """
    Una entrada de filtroColumna/columnaUnidad. Puede venir en formato
    explicito (tipo="LISTA"/"RANGO"/"PREFIJO", ver EH 03/DM 04/MT 03) o en
    formato simple (solo "filtro" como texto -- match exacto, o "^prefijo" --
    el que ya usaban IAAS 01/02-06).
    """
    model_config = ConfigDict(extra='ignore')
    filtro: Any
    tipo:          Literal['LISTA', 'RANGO', 'PREFIJO', 'SUFIJO'] | None = None
    nombreColumna: str | None = None


##--------------------------------------

class GrupoColumnas(BaseModel):
    """
    Una misma condicion revisada en varias columnas a la vez (ej. un codigo CIE
    en diagnostico principal o en cualquiera de los secundarios):
      - CUALQUIERA: la fila pasa si AL MENOS una de las columnas cumple.
      - NINGUNA:    la fila pasa si NINGUNA de las columnas cumple (exclusion).
    'columnas' es {letra: nombre del encabezado}, igual que nombreColumna.
    """
    coincidencia: Literal['CUALQUIERA', 'NINGUNA']
    tipo:         Literal['LISTA', 'RANGO', 'PREFIJO', 'SUFIJO']
    filtro:       Any
    columnas:     dict[str, str]

    def condicion(self) -> 'CondicionFiltro':
        return CondicionFiltro(filtro=self.filtro, tipo=self.tipo)


##--------------------------------------

class DetalleInterseccionColumna(BaseModel):
    columna:      str
    buscar:       str
    columna_dato: list[str]


##--------------------------------------

class DetalleInterseccionFila(BaseModel):
    columna_dato: list[str]
    fila:         list[int]


##--------------------------------------

class DetalleUltimaFila(BaseModel):
    columna_dato: list[str]
    encabezado:   int = 0


##--------------------------------------

class DetalleFiltroConteo(BaseModel):
    """
    Una fila cuenta si cumple TODO filtroColumna, TODOS los grupos de
    filtroGrupoColumnas y, si hay filtroAlternativas, AL MENOS UNA de ellas
    (cada alternativa es un filtroColumna completo: ahi va el "o", ej. MT 04:
    parto con metodo de parto, o aborto con metodo de aborto).
    """
    filtroColumna:       dict[str, CondicionFiltro]
    filtroGrupoColumnas: list[GrupoColumnas] = []
    filtroAlternativas:  list[dict[str, CondicionFiltro]] = []
    encabezado:          int | None = None


##--------------------------------------

class DetalleFiltroUnidadValor(BaseModel):
    columnaUnidad: dict[str, CondicionFiltro]
    tomarValor:    dict[str, str]
    filtroColumna: dict[str, CondicionFiltro] = {}
    encabezado:    int | None = None
