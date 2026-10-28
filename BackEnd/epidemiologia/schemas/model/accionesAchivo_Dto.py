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
    archivo: Dict[str, Archivo]