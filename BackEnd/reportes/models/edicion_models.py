"""
Módulo  : edicion_models.py
Carpeta : reportes/models/
Qué hace: Modelos Pydantic para los endpoints de edición de indicadores FTP.
Usado en: reportes/controllers/edicion_controller.py
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class InfoGeneralUpdate(BaseModel):
    id_indicador:           str
    titulo:                 str
    descripcionNumerador:   Optional[str] = None
    descripcionDenominador: Optional[str] = None
    nombreArchivoFinal:     Optional[str] = None


class SemaforoUpdate(BaseModel):
    id_indicador: str
    semaforo:     Dict[str, Any]
