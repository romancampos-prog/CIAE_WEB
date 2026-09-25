"""
Modelos tipados de la generacion de indicadores (extraccion, calculo, semaforo y
errores). Sustituyen a los diccionarios sueltos que viajaban entre servicios.
Usado en: services/calculo_indicador_Services.py, services/bd_Ciae_Guardado_Services.py,
          services/ftp/*
"""
from typing import Literal

from pydantic import BaseModel, Field

ColorSemaforo = Literal["Esperado", "Medio", "Bajo", "Gris"]

# {nombre del reporte o grupo: valores leidos (uno por columna), o None si no se pudo leer}
ValoresPorFuente = dict[str, list[float] | None]


class DatosExtraidosUnidad(BaseModel):
    """Lo leido de los reportes (o de la poblacion) para una unidad, antes de calcular."""
    numerador:   ValoresPorFuente = Field(default_factory=dict)
    denominador: ValoresPorFuente = Field(default_factory=dict)


class ResultadoUnidad(BaseModel):
    numerador:   int | None = None
    denominador: int | None = None
    resultado:   int | float | None = None


class UnidadSemaforizada(ResultadoUnidad):
    color: ColorSemaforo = "Gris"


class RutaAfectada(BaseModel):
    reportes: list[str]
    ruta:     str


class ErrorExtraccion(BaseModel):
    """Un tipo de error (ej. RUTA_INVALIDA) con las unidades y rutas que lo tuvieron."""
    nombreError:      str
    descripcionError: str
    unidades:         dict[str, list[RutaAfectada]] = Field(default_factory=dict)


LogErrores = dict[str, ErrorExtraccion]


class ResultadoGeneracion(BaseModel):
    """Lo que devuelve generar un indicador: ya calculado, semaforizado y guardado."""
    indicador:   str
    ano:         str
    mes:         str
    semana:      int | None = None
    unidades:    dict[str, UnidadSemaforizada]
    errores:     LogErrores = Field(default_factory=dict)


class ResultadoCategoria(BaseModel):
    """Generar todos los indicadores de una categoria: cuales salieron, cuales no y las restricciones juntas."""
    completados:   list[str]
    errores:       dict[str, str | LogErrores] = Field(default_factory=dict)
    restricciones: LogErrores = Field(default_factory=dict)
