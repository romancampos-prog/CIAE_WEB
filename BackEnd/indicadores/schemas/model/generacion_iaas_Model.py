"""
Modelos de la generacion de IAAS (Excel subidos por unidad, denominadores capturados,
sesion del mes y resultados). Los valores por unidad son los mismos de FTP:
ResultadoUnidad / UnidadSemaforizada (resultado = la tasa).
Usado en: services/iaas/*, Controller/iaas_Controller.py
"""
from pydantic import BaseModel, Field

from schemas.model.generacion_ftp_Model import UnidadSemaforizada

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
