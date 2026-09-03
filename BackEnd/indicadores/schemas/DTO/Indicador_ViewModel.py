from pydantic import BaseModel, Field
from typing import Dict, List
    
class IndicadorRequest(BaseModel):
    """
    Modelo para la solicitud de información de un indicador.
    indicador: Nombre del indicador a consultar.
    ano: Año para el cual se desea obtener información del indicador.
    modulo: Módulo opcional para mostrar de donde viene extraido.
    previos: Indicador para obtener información previa si es que tiene.
    """
    
    indicador: str
    ano: str
    modulo: str | None = None
    previos: bool
    