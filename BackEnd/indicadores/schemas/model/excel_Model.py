"""
Modelos del Excel generico (uno o varios indicadores, de cualquier modulo).
Usado en: services/excel_Services.py, Controller/excel_Controller.py
"""
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from indicadores.schemas.model.indicador_Model import UnidadDatos
from shared.MESES import MESES_ESTANDAR

Modulo = Literal["FTP", "IAAS", "Extractor"]

_MODULO_CANONICO = {"ftp": "FTP", "iaas": "IAAS", "extractor": "Extractor"}


class SolicitudExcel(BaseModel):
    """
    mes vacio = el ultimo reporte generado de cada indicador (igual que la
    grafica). Con valor, acepta "06" o "Junio" y se guarda siempre como nombre.
    """
    indicadores: list[str] = Field(min_length=1)
    ano:         int
    mes:         str | None = None

    @field_validator("mes")
    @classmethod
    def _mes_a_nombre(cls, valor: str | None) -> str | None:
        if valor is None or valor.strip() == "":
            return None
        valor = valor.strip()
        if valor.isdigit() and 1 <= int(valor) <= 12:
            return MESES_ESTANDAR[int(valor) - 1]
        if valor in MESES_ESTANDAR:
            return valor
        raise ValueError(f"Mes invalido: '{valor}' -- usa 1-12 o el nombre ({MESES_ESTANDAR[0]}..{MESES_ESTANDAR[-1]})")


class MetadataHoja(BaseModel):
    titulo:                 str
    descripcionNumerador:   str
    descripcionDenominador: str
    nombreArchivo:          str
    semaforo:               dict[str, Any]
    periodicidad:           str | None = None


class HojaIndicador(BaseModel):
    """
    Una pestana del Excel. meses trae TODOS los meses que el lector encontro
    (para el historico y para los acumulados de IAAS); mesActivo es el mes que
    la hoja muestra como principal. semana solo viene en un mes semanal de FTP.
    """
    indicador:  str
    modulo:     Modulo
    ano:        int
    metadata:   MetadataHoja
    meses:      dict[str, dict[str, UnidadDatos]]
    mesActivo:  str
    semana:     int | None = None

    @field_validator("modulo", mode="before")
    @classmethod
    def _modulo_canonico(cls, valor: Any) -> Any:
        return _MODULO_CANONICO.get(str(valor).lower(), valor)


class ExcelGenerado(BaseModel):
    archivo_b64:    str
    nombre_archivo: str
    completados:    list[str]
    errores:        dict[str, str]
