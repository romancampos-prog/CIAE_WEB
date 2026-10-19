"""
Peticiones de los endpoints de indicadores. Los endpoints que suben archivos
reciben Form/File directo en el controller (FastAPI no mezcla bien un BaseModel con
UploadFile en el mismo cuerpo multipart).
Usado en: Controller/*, services/*
"""
from typing import Annotated

from pydantic import BaseModel, StringConstraints

TextoObligatorio = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


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


##--------------------------------------

class RecalcularPoblacionRequest(BaseModel):
    ano: TextoObligatorio


##--------------------------------------

class EstadoMesIAASRequest(BaseModel):
    anio: TextoObligatorio
    mes:  TextoObligatorio
