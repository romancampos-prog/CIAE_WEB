"""
Modelos del bloque "reporte" de un indicador FTP tal cual viene en el mapeo
unificado (indicadores/mapeo/{familia}.json) -- la forma CRUDA que consume la
extraccion, distinta de ficha_tecnica_Model.py (que es la forma de SALIDA
hacia el front).

El "detalle" de cada archivo se deja como dict porque su forma depende del
modoExtraccion y la valida shared/extraccion_service.py con su propio modelo
por modo -- aqui solo se tipa lo que siempre existe.
Usado en: ftp/services/ftp_extraer_unificado.py
"""
from typing import Annotated, Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from schemas.model.ficha_tecnica_Model import InformacionFicha, ModoExtraccion, Operacion


class FuenteArchivosFTP(BaseModel):
    fuente:  Literal["ftp"]
    archivo: dict[str, dict[str, Any]]


class FuentePoblacionInfoSalud(BaseModel):
    fuente: Literal["poblacionInfoSalud"]
    sexo:   dict[str, list[str]]


class ReporteFTPMapeo(BaseModel):
    numerador:   FuenteArchivosFTP
    denominador: Annotated[FuenteArchivosFTP | FuentePoblacionInfoSalud, Field(discriminator="fuente")]
    operacion:   Operacion


class FuenteExcelWeb(BaseModel):
    """
    Excel subido por el usuario (IAAS). Solo se tipa lo que necesita quien
    carga el archivo (hoja, encabezado, modo); el resto del detalle
    (filtroColumna, columnaUnidad, ...) se conserva tal cual (extra="allow") y
    lo valida shared/extraccion_service.py segun modoExtraccion.
    """
    model_config = ConfigDict(extra="allow")

    fuente:         Literal["xlsxWeb"]
    hoja:           str
    modoExtraccion: ModoExtraccion
    encabezado:     int = 1


class FuenteCapturaWeb(BaseModel):
    fuente: Literal["capturaWeb"]


class ReporteIAASMapeo(BaseModel):
    numerador:   FuenteExcelWeb
    denominador: Annotated[FuenteExcelWeb | FuenteCapturaWeb, Field(discriminator="fuente")]
    operacion:   Operacion


class ExcelIAAS(BaseModel):
    """Textos que IAAS pone en su Excel y en la captura de denominadores."""
    codigo:             str
    titulo:             str
    columnaNumerador:   str
    columnaDenominador: str


class IndicadorIAASMapeo(BaseModel):
    model_config = ConfigDict(extra="ignore")

    reporte:       ReporteIAASMapeo
    semaforo:      dict[str, Any]
    informacion:   InformacionFicha
    excel:         ExcelIAAS
    mostrarGenerar: bool = True
    mostrarGrafica: bool = True


class FichaFTPMapeo(BaseModel):
    """
    Lo que cualquier pantalla o Excel de FTP necesita de un indicador (titulo,
    semaforo, periodicidad, nombre del archivo) -- incluye tambien a los
    indicadores manuales que todavia no tienen "reporte" de extraccion.
    """
    model_config = ConfigDict(extra="ignore")

    modulo:             str
    fechaModificacion:  str
    periodicidad:       str
    nombreArchivoFinal: str
    informacion:        InformacionFicha
    semaforo:           dict[str, Any]


class IndicadorFTPMapeo(FichaFTPMapeo):
    """Indicador FTP automatizado: la ficha mas todo lo que la extraccion necesita."""
    reporte:             ReporteFTPMapeo
    MESES_CIP01:         dict[str, str] = {}
    unidadesSinServicio: list[str] = []
