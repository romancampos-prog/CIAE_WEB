"""
La ficha de un indicador hacia el front (titulo, objetivo, semaforo, periodicidad), la lista
por familia y la ficha tecnica completa (ademas, como se calcula), que usa el panel
FichaTecnicaBoton de las paginas de Generar.
Usado en: services/informacion/*, Controller/informacion_Controller.py, schemas/model/mapeo_*_Model.py
"""
from typing import Any, Dict, Literal

from pydantic import BaseModel, model_validator

from shared.reglas_periodicidad import descripcion_periodicidad

# Los modoExtraccion que existen en indicadores/mapeo/*.json (numerador y denominador).
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


##--------------------------------------

class Semaforo(BaseModel):
    Esperado: str | None = None
    Medio: str | None = None
    Bajo: str | None = None


##--------------------------------------

class InfoIndicador(BaseModel):
    modulo: str
    mostrarGenerar: bool
    mostrarGrafica: bool
    previos: bool
    mensual: bool = False
    mensualAcumulado: bool = False
    peridocidadGenerada: Dict[str, bool] | None = None
    periodicidad: str
    descripcionPeriodicidad: str | None = None
    informacion: InformacionFicha
    semaforo: Dict[str,Semaforo] | Semaforo
    # Solo cuando el semaforo esta agrupado (IAAS 01, por tipo de hospital): {unidad: grupo}
    # para que el front sepa que bloque de umbrales le toca a cada unidad.
    grupoDeUnidad: Dict[str, str] | None = None


    ##--------------------------------------

    @model_validator(mode="before")
    @classmethod
    def _desde_peridocidadGenerada(cls, datos: Any) -> Any:
        """
        mensual/mensualAcumulado viven dentro de peridocidadGenerada en el mapeo; se
        replican sueltos para quien lee ficha.mensual / ficha.mensualAcumulado directo.
        """

        if isinstance(datos, dict):
            anidado = datos.get("peridocidadGenerada")

            if isinstance(anidado, dict):
                datos.setdefault("mensual", anidado.get("mensual", False))
                datos.setdefault("mensualAcumulado", anidado.get("mensualAcumulado", False))

            datos.setdefault("descripcionPeriodicidad", descripcion_periodicidad(datos.get("periodicidad")))

        return datos


##--------------------------------------

class IndicesIndicadores(BaseModel):
    """Una familia y sus indicadores, ej. CACU: [CACU 01, CACU 02, ...]."""
    categoriaIndicador: str
    indicadores: list[str]
    imagen: str
    color: str


##--------------------------------------

class FuenteCalculo(BaseModel):
    """
    Un lado (numerador o denominador) de reporte.{numerador,denominador} tal cual vive en el
    mapeo. "detalle" queda libre porque su forma cambia segun modoExtraccion/fuente; el front
    (operacionParser.js) decide como interpretarlo.
    """
    fuente: str
    modoExtraccion: ModoExtraccion | None = None
    detalle: Dict[str, Any]


##--------------------------------------

class Operacion(BaseModel):
    numerador: str
    denominador: str
    resultado: str


##--------------------------------------

class ReporteFicha(BaseModel):
    numerador: FuenteCalculo
    denominador: FuenteCalculo
    operacion: Operacion


##--------------------------------------

class FichaTecnicaCompleta(BaseModel):
    modulo: str
    fechaModificacion: str
    periodicidad: str
    automatizado: bool
    informacion: InformacionFicha
    reporte: ReporteFicha | None = None
    semaforo: Dict[str, Semaforo] | Semaforo
    # Columnas que cambian segun el mes (ej. CUPN 01: {"MESES_CIP01": {"1": "D", ...}}).
    columnasPorMes: Dict[str, Dict[str, str]] = {}
