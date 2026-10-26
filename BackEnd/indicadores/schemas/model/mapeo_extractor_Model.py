"""
Mapeo crudo de un indicador del Extractor (mapeo/extractor/): el Excel crudo mensual que lo
alimenta, como agrupa y de donde sale el denominador.
Usado en: datos/lectura_mapeo/mapeo_por_modulo_Datos.py, services/extractor/*
"""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.model.ficha_indicador_Model import ModoExtraccion, Operacion
from schemas.model.mapeo_comun_Model import FichaMapeo, FuentePoblacionInfoSalud


class FuenteExtractor(BaseModel):
    """
    Excel crudo mensual (SUI-13) del motor Extractor (EH 03, DM 04, MT 03).
    filtroColumna, filtroGrupoColumnas y cruce se conservan tal cual (extra="allow")
    -- los valida el motor de extraccion (services/compartido/extraccion/), no un modelo aqui.
    catalogoUnidades: con que catalogo se agrupa (ver shared/UNIDADES.CATALOGOS_UNIDADES);
    sin el, se agrupa por las UMF de FTP (lo de EH 03/DM 04).
    archivo: que archivo base alimenta al indicador (SUI_13, EGRESOS_TOCO...) -- la vista
    muestra un apartado por archivo y al subir uno solo se procesan sus indicadores. Si el
    denominador trae otro archivo (Neonatal 06: Defunciones / Nacimientos), cada uno se sube
    por separado y el mes se genera cuando ya estan los dos.
    ceroEsSinDato (extra, en el denominador): unidad con denominador 0 = no tuvo a quien
    medir (ej. hospital sin partos) -> sale Gris, no "0 = Esperado".
    columnasPeriodo: columnas del propio archivo con su mes/año, para validar que se suba
    el mes correcto sin depender del nombre del archivo.
    Sin "hoja": el usuario convierte los archivos a Excel y la hoja cambia de nombre segun
    la version; se lee la primera hoja que trae los encabezados del mapeo en sus letras.
    """
    model_config = ConfigDict(extra="allow")

    fuente:            Literal["extractor"]
    archivo:            str = "SUI_13"
    modoExtraccion:     ModoExtraccion
    encabezado:         int = 1
    agrupacion:         str
    columnaLlaveCruce:  str | None = None
    catalogoUnidades:   str | None = None
    columnasPeriodo:    dict[str, str] = {"mes": "mes", "anio": "anio"}


##--------------------------------------

class ReporteExtractorMapeo(BaseModel):
    numerador:   FuenteExtractor
    # Poblacion (EH 03/DM 04, al cerrar el corte) o el mismo SUI-13 (MT 03, cada mes).
    denominador: Annotated[FuentePoblacionInfoSalud | FuenteExtractor, Field(discriminator="fuente")]
    operacion:   Operacion


##--------------------------------------

class IndicadorExtractorMapeo(FichaMapeo):
    """Indicador del motor Extractor (EH 03, DM 04): la ficha mas lo que la extraccion necesita."""
    reporte: ReporteExtractorMapeo
