"""
Resultados de los endpoints de poblacion de FTP (carga del Excel nacional y
recalculo de los indicadores que dependen de ella).
Usado en: Controller/ftp_Controller.py
"""
from pydantic import BaseModel, Field


class ErrorCeldaPoblacion(BaseModel):
    unidad:  str
    grupo:   str
    columna: str


class ResultadoCargaPoblacion(BaseModel):
    nombre:          str
    nombre_sin_ext:  str
    unidades:        int
    no_encontradas:  list[str] = Field(default_factory=list)
    extras:          list[str] = Field(default_factory=list)
    celdas_vacias:   int = 0
    errores_datos:   list[ErrorCeldaPoblacion] = Field(default_factory=list)
    alias_sugeridos: dict[str, str] = Field(default_factory=dict)


class IndicadorRecalculado(BaseModel):
    indicador: str
    meses:     int
    detalle:   str


class ResultadoRecalculoPoblacion(BaseModel):
    total:        int
    recalculados: list[IndicadorRecalculado] = Field(default_factory=list)
    errores:      list[str] = Field(default_factory=list)
