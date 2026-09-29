"""
Peticiones y respuestas de los endpoints de generacion de FTP.
Usado en: Controller/ftp_Controller.py
"""
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from schemas.model.generacion_ftp_Model import LogErrores

TextoObligatorio = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class GenerarIndicadorRequest(BaseModel):
    indicador: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio          # "01".."12"
    semana:    str | None = None         # con semana se genera un mes previo (semanal)


class RegenerarIndicadorRequest(BaseModel):
    indicador: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio
    password:  TextoObligatorio          # regenerar sobrescribe datos: exige la contrasena del usuario


class GenerarCategoriaRequest(BaseModel):
    categoria: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio
    semana:    str | None = None


class RegenerarCategoriaRequest(BaseModel):
    categoria: TextoObligatorio
    ano:       TextoObligatorio
    mes:       TextoObligatorio
    password:  TextoObligatorio


class RecalcularPoblacionRequest(BaseModel):
    ano: TextoObligatorio


class MesesGeneradosResponse(BaseModel):
    meses: list[str]                     # "01".."12"


class GeneracionIndicadorResponse(BaseModel):
    restricciones: LogErrores = Field(default_factory=dict)


class GeneracionCategoriaResponse(BaseModel):
    completados:   list[str]
    errores:       dict[str, str | LogErrores] = Field(default_factory=dict)
    restricciones: LogErrores = Field(default_factory=dict)
