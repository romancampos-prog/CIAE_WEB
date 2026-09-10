from typing import Dict
import json

#mis archivos
from schemas.model.indicador_Model import UnidadDatos
from services.indicadorMapeo_Services import RutaMapeoExiste
from shared.semaforo_service import evaluar_color
from shared.UNIDADES import UNIDAD_TIPO_IAAS01


def _obtenerSemaforo(indicador: str) -> dict | None:
    """Busca en el mapeo del indicador el bloque 'semaforo'."""
    rutaMapeo = RutaMapeoExiste(indicador)
    if not rutaMapeo:
        return None

    with open(rutaMapeo, "r", encoding="utf-8") as archivo:
        data = json.load(archivo)

    return data.get(indicador, {}).get("semaforo")


def SemaforizarReporte(
    datos: Dict[str, Dict[str, UnidadDatos]] | Dict[str, UnidadDatos],
    indicador: str,
    mes: str | None = None,
) -> Dict[str, Dict[str, UnidadDatos]] | Dict[str, UnidadDatos]:
    """
    Clasifica el 'desempeno' de cada UnidadDatos contra el semaforo del indicador.
    Se recicla en dos contextos:
      - {mes: {unidad: UnidadDatos}}  -- varios meses, ej. el resultado de MensualAcumulado
      - {unidad: UnidadDatos}          -- un solo mes (pasa 'mes' aparte, en formato
                                          "Enero".."Diciembre", para el semaforo por mes)

    No clasifica unidades que ya vienen sin resultado (Gris por falta de dato) --
    no tiene sentido semaforizar algo que no se pudo calcular.
    """
    semaforo = _obtenerSemaforo(indicador)
    if not semaforo:
        return datos

    primerValor = next(iter(datos.values()), None)
    esMultiMes  = isinstance(primerValor, dict)

    if esMultiMes:
        return {m: _semaforizarUnidades(indicador, semaforo, m, unidades) for m, unidades in datos.items()}

    return _semaforizarUnidades(indicador, semaforo, mes, datos)


def _semaforizarUnidades(
    indicador: str, semaforo: dict, mes: str | None, unidades: Dict[str, UnidadDatos]
) -> Dict[str, UnidadDatos]:
    resultado: Dict[str, UnidadDatos] = {}

    for unidad, dato in unidades.items():
        if dato.resultado is None:
            resultado[unidad] = dato
            continue

        if indicador == "IAAS 01":
            tipo     = UNIDAD_TIPO_IAAS01.get(unidad, "OOAD")
            umbrales = semaforo.get(tipo, semaforo.get("OOAD"))
        elif mes and mes in semaforo:
            umbrales = semaforo[mes]
        else:
            umbrales = semaforo

        dato.desempeno = evaluar_color(dato.resultado, umbrales)
        resultado[unidad] = dato

    return resultado
