"""
Lo que las paginas de Generar reciben de cada indicador: lo comun sale del mapeo
(services/informacion/lista_indicadores_Services.indicadores_del_modulo) y cada modulo le
agrega lo suyo.
Usado en: services/informacion/*, services/{ftp,iaas,extractor}/pagina_generar_*
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
    imagen:                  str               # icono de la familia, ej. "icono_mt.png"
    color:                   str               # color de la familia


##--------------------------------------

class IndicadorGenerarFTP(IndicadorGenerar):
    reportes: list[str]                        # codigos SIAIS que lee, ej. ["CP02", "CP03"]


##--------------------------------------

class IndicadorGenerarIAAS(IndicadorGenerar):
    columnaNumerador:   str                    # rotulos de columnas del Excel que se sube
    columnaDenominador: str


##--------------------------------------

class ArchivoIndicadorExtractor(BaseModel):
    archivo:   str                             # nombre legible ("SUI-13")
    requerido: bool
    uso:       str


##--------------------------------------

class IndicadorGenerarExtractor(IndicadorGenerar):
    tipo:        Literal["corte", "mensual"]
    agrupacion:  str
    denominador: str
    archivos:    list[ArchivoIndicadorExtractor]
