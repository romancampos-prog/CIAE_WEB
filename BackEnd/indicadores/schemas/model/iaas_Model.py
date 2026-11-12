"""
IAAS: los denominadores capturados a mano y el estado del mes (unidades que quedaron pendientes).
Usado en: services/iaas/*
"""
from pydantic import BaseModel

# {indicador: {unidad: valor capturado}} -- el frontend manda texto ("125") o vacio
DenominadoresCapturados = dict[str, dict[str, str | int | None]]


class SesionIAAS(BaseModel):
    """Lo que el frontend necesita para el modal de unidades tardias del mes."""
    anio:                    str
    mes:                     str
    mes_nombre:              str
    unidades_pendientes:     list[str]
    indicadores_pendientes:  dict[str, list[str]]
    denominadores_guardados: dict[str, dict[str, float | None]]
    numeradores_guardados:   dict[str, dict[str, float | None]]
