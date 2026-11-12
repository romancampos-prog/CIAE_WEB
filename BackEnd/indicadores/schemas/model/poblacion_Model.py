"""
Poblacion: resultado de cargar el Excel nacional y del recalculo de lo que depende de ella.
Usado en: services/poblacion/*
"""
from pydantic import BaseModel, Field


class ErrorCeldaPoblacion(BaseModel):
    unidad:  str
    grupo:   str
    columna: str


##--------------------------------------

class ResultadoCargaPoblacion(BaseModel):
    nombre:              str
    nombre_sin_ext:      str
    unidades:            int
    no_encontradas:      list[str] = Field(default_factory=list)
    extras:              list[str] = Field(default_factory=list)
    celdas_vacias:       int = 0
    errores_datos:       list[ErrorCeldaPoblacion] = Field(default_factory=list)
    alias_sugeridos:     dict[str, str] = Field(default_factory=dict)
    # Mes/año leidos del titulo del reporte (ej. fila 7: "..., Julio 2026.") -- None si no
    # se pudo detectar (el reporte cambio de formato/fila), ver advertencia_titulo.
    mes_detectado:       str | None = None
    anio_detectado:      int | None = None
    advertencia_titulo:  str | None = None


##--------------------------------------

class IndicadorRecalculado(BaseModel):
    indicador: str
    meses:     int
    detalle:   str


##--------------------------------------

class CorteExtractorRecalculado(BaseModel):
    indicador: str
    corte:     str  # ej. "Diciembre 2026"


##--------------------------------------

class ResultadoRecalculoPoblacion(BaseModel):
    total:            int
    recalculados:     list[IndicadorRecalculado] = Field(default_factory=list)
    errores:          list[str] = Field(default_factory=list)
    # Cortes de Extractor (EH 03/DM 04) ya generados que se refrescaron con la poblacion nueva.
    cortes_extractor: list[CorteExtractorRecalculado] = Field(default_factory=list)
