"""
Censo de pacientes con DM: el que ya esta subido por año y lo que resulta de subir uno nuevo.
Usado en: services/censo_dm/*
"""
from pydantic import BaseModel, Field


class CensoDMSubido(BaseModel):
    anio:        int
    archivo:     str
    fecha_carga: str


##--------------------------------------

class ResultadoCargaCensoDM(BaseModel):
    anio:           int
    archivo:        str
    unidades:       int
    no_encontradas: list[str] = Field(default_factory=list)
    extras:         list[str] = Field(default_factory=list)
    # Meses de los indicadores con el censo de denominador que se generaron o recalcularon con el (ej. "DM 05 Enero 2026").
    recalculados:   list[str] = Field(default_factory=list)
