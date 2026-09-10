from typing import Dict
import json

#mis archivos
from schemas.model.indicador_Model import UnidadDatos
from services.indicadorMapeo_Services import RutaMapeoExiste
from shared.MESES import MESES_ESTANDAR
from shared.semaforizado_service import SemaforizarReporte

#funciones permitidas dentro del eval de la formula de resultado -- mismo criterio que ftp/services/numerador_denominador.py
_CONTEXTO_PERMITIDO = {"round": round, "sum": sum, "abs": abs}


def _operacionResultado(indicador: str) -> str | None:
    """Busca en el mapeo del indicador la formula de texto de 'operacion.resultado'."""
    rutaMapeo = RutaMapeoExiste(indicador)
    if not rutaMapeo:
        return None

    with open(rutaMapeo, "r", encoding="utf-8") as archivo:
        data = json.load(archivo)

    return data.get(indicador, {}).get("reporte", {}).get("operacion", {}).get("resultado")


def MensualAcumulado(meses: Dict[str, Dict[str, UnidadDatos]], indicador: str) -> Dict[str, Dict[str, UnidadDatos]] | None:
    """
    Acumula numerador/denominador mes a mes -- Enero queda igual, Febrero es
    Enero+Febrero, Marzo es Enero+Febrero+Marzo, y asi sucesivo -- y recalcula
    'resultado' con la misma formula de 'operacion.resultado' del mapeo (nunca
    un multiplicador fijo, porque no todos los indicadores usan el mismo).

    Si a una unidad le falta numerador o denominador en algun mes del rango
    acumulado, esa unidad queda "Gris" ese corte -- no se inventa el dato.

    El 'desempeno' de las unidades que si tienen resultado se clasifica al
    final con SemaforizarReporte(), contra el semaforo del mismo mapeo.
    """
    operacionResultado = _operacionResultado(indicador)
    if not operacionResultado:
        return None

    mesesPresentes   = [mes for mes in MESES_ESTANDAR if mes in meses]
    todasLasUnidades = {unidad for datosMes in meses.values() for unidad in datosMes}

    acumulado: Dict[str, Dict[str, UnidadDatos]] = {}

    for indiceMes, mesActual in enumerate(mesesPresentes):
        mesesHastaAqui = mesesPresentes[:indiceMes + 1]
        filaMes: Dict[str, UnidadDatos] = {}

        for unidad in todasLasUnidades:
            numeradorAcumulado, denominadorAcumulado = 0, 0
            completo = True

            for mes in mesesHastaAqui:
                datoUnidad = meses[mes].get(unidad)
                if datoUnidad is None or datoUnidad.numerador is None or datoUnidad.denominador is None:
                    completo = False
                    break
                numeradorAcumulado   += datoUnidad.numerador
                denominadorAcumulado += datoUnidad.denominador

            if not completo:
                filaMes[unidad] = UnidadDatos(desempeno="Gris")
                continue

            contexto  = {**_CONTEXTO_PERMITIDO, "numerador": numeradorAcumulado, "denominador": denominadorAcumulado}
            resultado = round(eval(operacionResultado, {"__builtins__": None}, contexto), 2) if denominadorAcumulado else 0

            filaMes[unidad] = UnidadDatos(**{
                "numerador":   numeradorAcumulado,
                "denominador": denominadorAcumulado,
                "desempeno":   "Gris",  # se clasifica de verdad abajo, con SemaforizarReporte
                "%":           resultado,
            })

        acumulado[mesActual] = filaMes

    return SemaforizarReporte(acumulado, indicador)
