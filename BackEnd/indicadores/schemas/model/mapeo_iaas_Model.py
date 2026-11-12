"""
Mapeo crudo de un indicador de IAAS (mapeo/iaas/): el Excel que sube cada unidad, la captura
manual del denominador y los textos del Excel de IAAS.
Usado en: datos/lectura_mapeo/mapeo_por_modulo_Datos.py, services/iaas/*
"""
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.model.ficha_indicador_Model import InformacionFicha, ModoExtraccion, Operacion


class FuenteExcelWeb(BaseModel):
    """
    Excel subido por el usuario (IAAS). Solo se tipa lo que necesita quien
    carga el archivo (encabezado, modo); el resto del detalle
    (filtroColumna, columnaUnidad, ...) se conserva tal cual (extra="allow") y
    lo valida el motor de extraccion (compartido/extraccion_excel/) segun modoExtraccion.
    Sin "hoja": se lee la primera hoja que trae los encabezados del mapeo en sus
    letras (datos/excel_subido/lector_excel_Datos.LectorExcel). nombreArchivo (extra) = etiqueta para la ficha.
    """
    model_config = ConfigDict(extra="allow")

    fuente:         Literal["xlsxWeb"]
    modoExtraccion: ModoExtraccion
    encabezado:     int = 1


##--------------------------------------

class FuenteCapturaWeb(BaseModel):
    fuente: Literal["capturaWeb"]


##--------------------------------------

class ReporteIAASMapeo(BaseModel):
    numerador:   FuenteExcelWeb
    denominador: Annotated[FuenteExcelWeb | FuenteCapturaWeb, Field(discriminator="fuente")]
    operacion:   Operacion


##--------------------------------------

class ExcelIAAS(BaseModel):
    """Textos que IAAS pone en su Excel y en la captura de denominadores."""
    codigo:             str
    titulo:             str
    columnaNumerador:   str
    columnaDenominador: str


##--------------------------------------

class IndicadorIAASMapeo(BaseModel):
    model_config = ConfigDict(extra="ignore")

    nombreArchivoFinal: str
    reporte:       ReporteIAASMapeo
    semaforo:      dict[str, Any]
    informacion:   InformacionFicha
    excel:         ExcelIAAS
    periodicidad:  str | None = None
    mostrarGenerar: bool = True
    mostrarGrafica: bool = True
