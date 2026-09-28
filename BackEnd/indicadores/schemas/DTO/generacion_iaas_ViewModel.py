"""
Peticiones de los endpoints IAAS que reciben JSON puro (los que suben archivos
usan Form/File directo en el controller -- FastAPI no mezcla bien un BaseModel con
UploadFile en el mismo cuerpo multipart).
Usado en: Controller/iaas_Controller.py
"""
from typing import Annotated

from pydantic import BaseModel, StringConstraints

TextoObligatorio = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class SesionIAASRequest(BaseModel):
    anio: TextoObligatorio
    mes:  TextoObligatorio
