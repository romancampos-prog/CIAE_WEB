"""
Request para cambiar el estatus de un registro de Acciones (POST /epidemiologia/ftp/estatus/OC30).
Usado en: Controller/epiFTP.py
"""
from pydantic import BaseModel, Field


class CambioEstatus(BaseModel):
    # El "_id" de la fila que manda la consulta (modulos/ftp/id_registro.py)
    id: str = Field(min_length=1, max_length=64)
    # Clave del catalogo mapeo/ftp/catalogos/estatus_acciones.json
    estatus: str = Field(min_length=1, max_length=40)
