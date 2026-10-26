"""
Lo del mapeo crudo que comparten los modulos: la ficha (titulo, semaforo, periodicidad...) y
la fuente de poblacion (FTP y los cortes del Extractor). El "detalle" de cada archivo lo valida
el motor de extraccion con su propio modelo por modo; aqui solo se tipa lo que siempre existe.
Usado en: schemas/model/mapeo_{ftp,extractor}_Model.py, services/{ftp,poblacion}/*
"""
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from schemas.model.ficha_indicador_Model import InformacionFicha


class FuentePoblacionInfoSalud(BaseModel):
    fuente: Literal["poblacionInfoSalud"]
    sexo:   dict[str, list[str]]


##--------------------------------------

class FichaMapeo(BaseModel):
    """
    Lo que cualquier pantalla o Excel necesita de un indicador (titulo, semaforo,
    periodicidad, nombre del archivo), sea de FTP o del Extractor -- incluye tambien a
    los indicadores manuales que todavia no tienen "reporte" de extraccion.
    """
    model_config = ConfigDict(extra="ignore")

    modulo:             str
    fechaModificacion:  str
    periodicidad:       str
    nombreArchivoFinal: str
    informacion:        InformacionFicha
    semaforo:           dict[str, Any]
