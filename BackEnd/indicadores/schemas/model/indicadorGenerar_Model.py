"""
Lo que las paginas de Generar (FTP, IAAS, Extractor) reciben de cada indicador.
IndicadorGenerar es lo comun, sacado del mapeo por indicadorMapeo_Services.indicadores_del_modulo;
cada modulo lo extiende con lo suyo en su propio servicio.
Usado en: services/indicadorMapeo_Services.py, services/ftp/info_ftp_Services.py,
          services/iaas/info_iaas_Services.py, services/extractor/info_extractor_Services.py
"""
from typing import Literal

from pydantic import BaseModel


class IndicadorGenerar(BaseModel):
    indicador:               str               # "MT 04"
    categoria:               str               # "MT" (familia)
    nombreCategoria:         str               # "Atención materna" (catalogos/familias.json)
    titulo:                  str
    periodicidad:            str
    descripcionPeriodicidad: str | None = None
    peridocidadGenerada:     dict[str, bool] = {}
    previos:                 bool = False      # FTP: tiene reportes semanales
    imagen:                  str               # icono de la familia, ej. "icono_mt.png"
    color:                   str               # color de la familia


class IndicadorGenerarFTP(IndicadorGenerar):
    reportes: list[str]                        # codigos SIAIS que lee, ej. ["CP02", "CP03"]


class IndicadorGenerarIAAS(IndicadorGenerar):
    columnaNumerador:   str                    # rotulos de columnas del Excel que se sube
    columnaDenominador: str


class ArchivoIndicadorExtractor(BaseModel):
    archivo:   str                             # nombre legible ("SUI-13")
    requerido: bool
    uso:       str


class IndicadorGenerarExtractor(IndicadorGenerar):
    tipo:        Literal["corte", "mensual"]
    agrupacion:  str
    denominador: str
    archivos:    list[ArchivoIndicadorExtractor]
