"""
Tipos que comparten las peticiones de los endpoints de indicadores. Los endpoints que suben
archivos reciben Form/File directo en el controller (FastAPI no mezcla bien un BaseModel con
UploadFile en el mismo cuerpo multipart).
Usado en: schemas/DTO/*_ViewModel.py
"""
from typing import Annotated

from pydantic import StringConstraints

TextoObligatorio = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
