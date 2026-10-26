"""
Peticiones de los endpoints de /Indicadores/iaas.
Usado en: Controller/iaas_Controller.py
"""
from pydantic import BaseModel

from schemas.DTO.comun_ViewModel import TextoObligatorio


class EstadoMesIAASRequest(BaseModel):
    anio: TextoObligatorio
    mes:  TextoObligatorio
