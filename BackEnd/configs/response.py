"""
Modulo: Repsuestas
Que hace? : plantilla generica para en todos los controladores 
            que es lo que van a responder

Usado: Todos los controladores
"""

from  pydantic import BaseModel
from typing import Any, Optional



class ApiResponse(BaseModel):
    """
    Respuesta estándar para todos los endpoints.

    Atributos:
        success : True si la operación fue exitosa, False si hubo error.
        message : Mensaje descriptivo del resultado.
        data    : Datos de respuesta. Puede ser cualquier dato asi como tmabien diccionario, lista o None.
    """
    success: bool
    message: str
    data: Optional[Any]
