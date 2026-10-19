"""
Modelos de la generacion de indicadores (FTP, IAAS y Extractor): lo que las paginas de
Generar reciben de cada indicador, los valores por unidad (extraccion, calculo y semaforo),
los errores de extraccion de FTP, la sesion del mes de IAAS y la poblacion.
Usado en: services/*, Controller/*
"""
from typing import Literal

from pydantic import BaseModel, Field

ColorSemaforo = Literal["Esperado", "Medio", "Bajo", "Gris"]

# {nombre del reporte o grupo: valores leidos (uno por columna), o None si no se pudo leer}
ValoresPorFuente = dict[str, list[float] | None]

# {indicador: {unidad: valor capturado}} -- el frontend manda texto ("125") o vacio
DenominadoresCapturados = dict[str, dict[str, str | int | None]]


# Paginas de Generar: lo comun sale del mapeo (indicadorMapeo_Services.indicadores_del_modulo) y cada modulo le agrega lo suyo.
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


##--------------------------------------

# Valores por unidad: extraido -> calculado -> semaforizado
class DatosExtraidosUnidad(BaseModel):
    """Lo leido de los reportes (o de la poblacion) para una unidad, antes de calcular."""
    numerador:   ValoresPorFuente = Field(default_factory=dict)
    denominador: ValoresPorFuente = Field(default_factory=dict)


##--------------------------------------

class ResultadoUnidad(BaseModel):
    numerador:   int | None = None
    denominador: int | None = None
    resultado:   int | float | None = None


##--------------------------------------

class UnidadSemaforizada(ResultadoUnidad):
    color: ColorSemaforo = "Gris"


##--------------------------------------

# FTP: errores de extraccion y resultados de generar
class RutaAfectada(BaseModel):
    reportes: list[str]
    ruta:     str


##--------------------------------------

class ErrorExtraccion(BaseModel):
    """Un tipo de error (ej. RUTA_INVALIDA) con las unidades y rutas que lo tuvieron."""
    nombreError:      str
    descripcionError: str
    unidades:         dict[str, list[RutaAfectada]] = Field(default_factory=dict)


LogErrores = dict[str, ErrorExtraccion]


##--------------------------------------

class ResultadoGeneracion(BaseModel):
    """Lo que devuelve generar un indicador: ya calculado, semaforizado y guardado."""
    indicador:   str
    ano:         str
    mes:         str
    semana:      int | None = None
    unidades:    dict[str, UnidadSemaforizada]
    errores:     LogErrores = Field(default_factory=dict)


##--------------------------------------

class ResultadoCategoria(BaseModel):
    """Generar todos los indicadores de una categoria: cuales salieron, cuales no y las restricciones juntas."""
    completados:   list[str]
    errores:       dict[str, str | LogErrores] = Field(default_factory=dict)
    restricciones: LogErrores = Field(default_factory=dict)


##--------------------------------------

# IAAS: estado del mes (unidades que quedaron pendientes)
class SesionIAAS(BaseModel):
    """Lo que el frontend necesita para el modal de unidades tardias del mes."""
    anio:                    str
    mes:                     str
    mes_nombre:              str
    unidades_pendientes:     list[str]
    indicadores_pendientes:  dict[str, list[str]]
    denominadores_guardados: dict[str, dict[str, float | None]]
    numeradores_guardados:   dict[str, dict[str, float | None]]


##--------------------------------------

# Poblacion: carga del Excel nacional y recalculo de lo que depende de ella
class ErrorCeldaPoblacion(BaseModel):
    unidad:  str
    grupo:   str
    columna: str


##--------------------------------------

class ResultadoCargaPoblacion(BaseModel):
    nombre:              str
    nombre_sin_ext:      str
    unidades:            int
    no_encontradas:      list[str] = Field(default_factory=list)
    extras:              list[str] = Field(default_factory=list)
    celdas_vacias:       int = 0
    errores_datos:       list[ErrorCeldaPoblacion] = Field(default_factory=list)
    alias_sugeridos:     dict[str, str] = Field(default_factory=dict)
    # Mes/año leidos del titulo del reporte (ej. fila 7: "..., Julio 2026.") -- None si no
    # se pudo detectar (el reporte cambio de formato/fila), ver advertencia_titulo.
    mes_detectado:       str | None = None
    anio_detectado:      int | None = None
    advertencia_titulo:  str | None = None


##--------------------------------------

class IndicadorRecalculado(BaseModel):
    indicador: str
    meses:     int
    detalle:   str


##--------------------------------------

class CorteExtractorRecalculado(BaseModel):
    indicador: str
    corte:     str  # ej. "Diciembre 2026"


##--------------------------------------

class ResultadoRecalculoPoblacion(BaseModel):
    total:            int
    recalculados:     list[IndicadorRecalculado] = Field(default_factory=list)
    errores:          list[str] = Field(default_factory=list)
    # Cortes de Extractor (EH 03/DM 04) ya generados que se refrescaron con la poblacion nueva.
    cortes_extractor: list[CorteExtractorRecalculado] = Field(default_factory=list)
