"""
Modelos del bloque "reporte" de un indicador FTP tal cual viene en el mapeo
unificado (indicadores/mapeo/{familia}.json) -- la forma CRUDA que consume la
extraccion, distinta de ficha_tecnica_Model.py (que es la forma de SALIDA
hacia el front).

El "detalle" de cada archivo se deja como dict porque su forma depende del
modoExtraccion y la valida services/metodos_extraccion_excel.py con su propio modelo
por modo -- aqui solo se tipa lo que siempre existe.
Usado en: services/ftp/extraccion_indicador_ftp_Services.py
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
    lo valida services/metodos_extraccion_excel.py segun modoExtraccion.
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

    nombreArchivoFinal: str
    reporte:       ReporteIAASMapeo
    semaforo:      dict[str, Any]
    informacion:   InformacionFicha
    excel:         ExcelIAAS
    periodicidad:  str | None = None
    mostrarGenerar: bool = True
    mostrarGrafica: bool = True


class FuenteExtractor(BaseModel):
    """
    Excel crudo mensual (SUI-13) del motor Extractor (EH 03, DM 04, MT 03).
    filtroColumna, filtroGrupoColumnas y cruce se conservan tal cual (extra="allow")
    -- los valida services/metodos_extraccion_excel.py, no un modelo aqui.
    catalogoUnidades: con que catalogo se agrupa (ver shared/unidades_ftp.CATALOGOS_UNIDADES);
    sin el, se agrupa por las UMF de FTP (lo de EH 03/DM 04).
    archivo: que archivo base alimenta al indicador (SUI_13, EGRESOS_TOCO...) -- la vista
    muestra un apartado por archivo y al subir uno solo se procesan sus indicadores.
    columnasPeriodo: columnas del propio archivo con su mes/año, para validar que se suba
    el mes correcto sin depender del nombre del archivo.
    """
    model_config = ConfigDict(extra="allow")

    fuente:            Literal["extractor"]
    archivo:            str = "SUI_13"
    hoja:               str
    modoExtraccion:     ModoExtraccion
    encabezado:         int = 1
    agrupacion:         str
    columnaLlaveCruce:  str | None = None
    catalogoUnidades:   str | None = None
    columnasPeriodo:    dict[str, str] = {"mes": "mes", "anio": "anio"}


class ReporteExtractorMapeo(BaseModel):
    numerador:   FuenteExtractor
    # Poblacion (EH 03/DM 04, al cerrar el corte) o el mismo SUI-13 (MT 03, cada mes).
    denominador: Annotated[FuentePoblacionInfoSalud | FuenteExtractor, Field(discriminator="fuente")]
    operacion:   Operacion


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


class IndicadorExtractorMapeo(FichaFTPMapeo):
    """Indicador del motor Extractor (EH 03, DM 04): la ficha mas lo que la extraccion necesita."""
    reporte: ReporteExtractorMapeo
