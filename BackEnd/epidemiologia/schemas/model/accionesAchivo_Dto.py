"""
DTOS para la extraccion de mapeos de EPIDEMEOLOGIA "Acciones"
"""

from pydantic import BaseModel
from typing import Any, Dict, Literal


    

class FiltroColumna(BaseModel):
    tipo: str | None
    filtro: list[str] | None
    nombreColumna: str | None


class Archivo(BaseModel):
    hoja: list[str] | None
    modoExtraccion: str | None
    encabezado: int
    filtroColumna: Dict[str, FiltroColumna]
    seleccionar: Dict[str, str]

#------------------------------------------------------------------------------#
#---- Modelo Principal para mapeo tipo "ACCIONES"

class Acciones(BaseModel):
    fuente: str | None
    # La columna de "seleccionar" con la fecha de cada registro (dd/mm/aaaa): con ella se filtra el rango del Excel
    columnaFecha: str
    # Columnas de "seleccionar" con que se nombra el estudio (Excel) que se sube a un registro, en orden
    columnasExcelIzquierda: list[str] = []
    nombreEstudio: list[str] = []
    # Como se muestra una columna en la tabla ("NSS"); el nombre real no cambia: es la llave de los datos y del id
    etiquetasColumna: Dict[str, str] = {}
    # Que icono lleva cada columna en la tarjeta del registro (unidad, calendario, credencial, etiqueta, persona, clave)
    iconosColumna: Dict[str, str] = {}
    archivo: Dict[str, Archivo]