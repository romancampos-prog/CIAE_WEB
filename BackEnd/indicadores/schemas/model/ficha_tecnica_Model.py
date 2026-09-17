"""
Modelos de la "ficha técnica" completa de un indicador (título, objetivo,
semáforo, y cómo se calcula), leída directamente del mapeo unificado
(indicadores/mapeo/{familia}.json). Reemplaza al dict suelto que regresaba
ftp_service.obtenerInformacionIndicador() -- usado por el componente
compartido FichaTecnicaBoton (FTP / IAAS / Extractor).
Usado en: indicadores/services/ficha_tecnica_Services.py,
          indicadores/Controller/informacion_Controller.py
"""
from pydantic import BaseModel
from typing import Dict, Any, Literal

# Los 6 modoExtraccion que de verdad existen hoy en indicadores/mapeo/*.json,
# contando numerador Y denominador (FILTRO_UNIDAD_VALOR solo aparece del lado
# denominador, en IAAS 01 -- por eso se escapa si solo se cuenta numerador).
ModoExtraccion = Literal[
    "INTERSECCION_COLUMNA",
    "INTERSECCION_FILA",
    "ULTIMA_FILA",
    "FILTRO_CONTEO",
    "FILTRO_CONTEO_ACUMULADO",
    "FILTRO_UNIDAD_VALOR",
]


class InformacionFicha(BaseModel):
    titulo: str
    objetivo: str
    descNum: str
    descDen: str


class Semaforo(BaseModel):
    Esperado: str | None = None
    Medio: str | None = None
    Bajo: str | None = None


class FuenteCalculo(BaseModel):
    """
    Un lado (numerador o denominador) de reporte.{numerador,denominador} tal
    cual vive en el mapeo. "detalle" se deja libre (Dict) porque su forma
    real cambia segun modoExtraccion/fuente (archivo.{...} / sexo.{...} /
    filtroColumna+cruce / etc.) -- el front (operacionParser.js) decide como
    interpretarlo. Tipar aqui solo lo que SIEMPRE existe (fuente, modoExtraccion
    cuando aplica) ya es suficiente para atrapar mapeos mal formados.
    """
    fuente: str
    modoExtraccion: ModoExtraccion | None = None
    detalle: Dict[str, Any]


class Operacion(BaseModel):
    numerador: str
    denominador: str
    resultado: str


class ReporteFicha(BaseModel):
    numerador: FuenteCalculo
    denominador: FuenteCalculo
    operacion: Operacion


class FichaTecnicaCompleta(BaseModel):
    modulo: str
    fechaModificacion: str
    periodicidad: str
    automatizado: bool
    informacion: InformacionFicha
    reporte: ReporteFicha | None = None
    semaforo: Dict[str, Semaforo] | Semaforo
