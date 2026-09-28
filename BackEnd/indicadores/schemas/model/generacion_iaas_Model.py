"""
Modelos de IAAS: informacion de los 6 indicadores, la generacion (Excel subidos por
unidad, denominadores capturados, sesion del mes y resultados). Los valores por
unidad son los mismos de FTP: ResultadoUnidad / UnidadSemaforizada (resultado = la tasa).
Usado en: services/iaas/*, Controller/iaas_Controller.py
"""
from typing import Any

from pydantic import BaseModel, Field

from schemas.model.generacion_ftp_Model import UnidadSemaforizada


class InfoIndicadorIAAS(BaseModel):
    """Titulo, descripciones y semaforo de un indicador IAAS, para la grafica."""
    titulo:                   str
    descripcionNumerador:     str
    descripcionDenominador:   str
    descripcionPeriodicidad:  str | None = None
    semaforo:                 dict[str, Any]
    unidades_hgs:              list[str]       = Field(default_factory=list)
    unidad_tipo:                dict[str, str] = Field(default_factory=dict)


class IndicadorGenerarIAAS(BaseModel):
    """Un indicador IAAS en la pagina de Generar (rotulos de columnas del Excel subido)."""
    id:                 str
    titulo:              str
    columnaNumerador:    str
    columnaDenominador:  str


class MesesGuardadosIAAS(BaseModel):
    meses: list[str]  # "01".."12"

# {indicador: {unidad: valor capturado}} -- el frontend manda texto ("125") o vacio
DenominadoresCapturados = dict[str, dict[str, str | int | None]]

# {indicador: {unidad: resultado}} de un mes
UnidadesPorIndicador = dict[str, dict[str, UnidadSemaforizada]]


class ResultadoGeneracionIAAS(BaseModel):
    mensaje:             str
    unidades_pendientes: list[str] = Field(default_factory=list)


class ResultadoCompletarUnidad(BaseModel):
    unidades_pendientes: list[str] = Field(default_factory=list)


class SesionIAAS(BaseModel):
    """Lo que el frontend necesita para el modal de unidades tardias del mes."""
    anio:                    str
    mes:                     str
    mes_nombre:              str
    unidades_pendientes:     list[str]
    indicadores_pendientes:  dict[str, list[str]]
    denominadores_guardados: dict[str, dict[str, float | None]]
    numeradores_guardados:   dict[str, dict[str, float | None]]
