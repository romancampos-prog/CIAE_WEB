"""
Peticiones de los endpoints de /Indicadores/ftp (generar y regenerar indicador o categoria).
Usado en: Controller/ftp_Controller.py
"""
from pydantic import BaseModel

from schemas.DTO.comun_ViewModel import TextoObligatorio


class GenerarIndicadorRequest(BaseModel):
    indicador: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio          # "01".."12"
    semana:    str | None = None         # con semana se genera un mes previo (semanal)


##--------------------------------------

class RegenerarIndicadorRequest(BaseModel):
    indicador: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio
    password:  TextoObligatorio          # regenerar sobrescribe datos: exige la contrasena del usuario


##--------------------------------------

class GenerarCategoriaRequest(BaseModel):
    categoria: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio
    semana:    str | None = None


##--------------------------------------

class RegenerarCategoriaRequest(BaseModel):
    categoria: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio
    password:  TextoObligatorio
