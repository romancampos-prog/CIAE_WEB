"""
Peticiones de los endpoints de /Indicadores/ftp/poblacion.
Usado en: Controller/poblacion_Controller.py
"""
from pydantic import BaseModel

from schemas.DTO.comun_ViewModel import TextoObligatorio


class RecalcularPoblacionRequest(BaseModel):
    ano: TextoObligatorio
