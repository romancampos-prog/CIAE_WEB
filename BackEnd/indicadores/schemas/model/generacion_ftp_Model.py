"""
FTP: errores de extraccion (por tipo, con las unidades y rutas afectadas) y lo que regresa
generar un indicador o una categoria.
Usado en: services/ftp/*
"""
from pydantic import BaseModel, Field

from schemas.model.unidad_resultado_Model import UnidadSemaforizada


class RutaAfectada(BaseModel):
    reportes: list[str]
    ruta:     str


##--------------------------------------

class ErrorExtraccion(BaseModel):
    """Un tipo de error (ej. RUTA_INVALIDA) con las unidades y rutas que lo tuvieron."""
    nombreError:      str
    descripcionError: str
    unidades:         dict[str, list[RutaAfectada]] = Field(default_factory=dict)


LogErrores = dict[str, ErrorExtraccion]


##--------------------------------------

class ResultadoGeneracion(BaseModel):
    """Lo que devuelve generar un indicador: ya calculado, semaforizado y guardado."""
    indicador:   str
    ano:         str
    mes:         str
    semana:      int | None = None
    unidades:    dict[str, UnidadSemaforizada]
    errores:     LogErrores = Field(default_factory=dict)


##--------------------------------------

class ResultadoCategoria(BaseModel):
    """Generar todos los indicadores de una categoria: cuales salieron, cuales no y las restricciones juntas."""
    completados:   list[str]
    errores:       dict[str, str | LogErrores] = Field(default_factory=dict)
    restricciones: LogErrores = Field(default_factory=dict)
