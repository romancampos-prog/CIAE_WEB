from typing import Dict
import json

#mis archivos
from schemas.model.indicador_Model import MesReporte, UnidadDatos
from services.indicadorMapeo_Services import RutaMapeoExiste
from shared.MESES import MESES_ESTANDAR
from shared.color_service import es_inconsistente
from shared.semaforizado_service import SemaforizarReporte

#funciones permitidas dentro del eval de la formula de resultado -- mismo criterio que services/calculo_indicador_Services.py
_CONTEXTO_PERMITIDO = {"round": round, "sum": sum, "abs": abs}


def _bloque_mapeo(indicador: str) -> dict:
    rutaMapeo = RutaMapeoExiste(indicador)
    if not rutaMapeo:
        return {}
    with open(rutaMapeo, "r", encoding="utf-8") as archivo:
        return json.load(archivo).get(indicador, {})


def _operacionResultado(indicador: str) -> str | None:
    """Busca en el mapeo del indicador la formula de texto de 'operacion.resultado'."""
    return _bloque_mapeo(indicador).get("reporte", {}).get("operacion", {}).get("resultado")


def AcumulaSumandoMeses(indicador: str) -> bool:
    """
    True si el mapeo pide mensual Y mensual acumulado (peridocidadGenerada): se guarda
    el dato de cada mes y el acumulado se arma sumando meses (IAAS, MT 03-05 del
    Extractor). Con solo mensualAcumulado el archivo ya viene acumulado (CACU 01,
    CAMA...) y NO se vuelve a sumar. Lo decide el mapeo, no el front.
    """
    generada = _bloque_mapeo(indicador).get("peridocidadGenerada") or {}
    return bool(generada.get("mensual") and generada.get("mensualAcumulado"))


def MensualAcumulado(meses: Dict[str, MesReporte], indicador: str) -> Dict[str, MesReporte] | None:
    """
    Acumula numerador/denominador mes a mes -- Enero queda igual, Febrero es
    Enero+Febrero, Marzo es Enero+Febrero+Marzo, y asi sucesivo -- y recalcula
    'resultado' con la misma formula de 'operacion.resultado' del mapeo (nunca
    un multiplicador fijo, porque no todos los indicadores usan el mismo).

    Mismas reglas que el Excel y la generacion (ver shared/color_service.py):
      - Si a una unidad le falta numerador o denominador en algun mes del rango,
        queda "Gris" ese corte sin resultado, pero se muestran los acumulados que
        si existan (numerador y/o denominador) -- no se inventa el dato faltante.
      - Un mes en el que la unidad no existe simplemente no suma.
      - Denominador 0 con numerador > 0 es inconsistente: Gris, sin resultado.
    El 'desempeno' de las unidades que si tienen resultado se clasifica al
    final con SemaforizarReporte(), contra el semaforo del mismo mapeo.
    """
    operacionResultado = _operacionResultado(indicador)
    if not operacionResultado:
        return None

    # Se acumula solo mientras los meses vayan seguidos: si faltara Marzo, "Enero-Abril"
    # no puede ser Ene+Feb+Abr, asi que el acumulado se detiene en el primer hueco.
    mesesPresentes = []
    for mes in MESES_ESTANDAR:
        if mes in meses:
            mesesPresentes.append(mes)
        elif mesesPresentes:
            break

    # Lista (no set) para conservar el orden de las unidades, con el TOTAL al final.
    todasLasUnidades = list(dict.fromkeys(u for mes in mesesPresentes for u in meses[mes].Reporte))
    if "TOTAL_OOAD" in todasLasUnidades:
        todasLasUnidades.remove("TOTAL_OOAD")
        todasLasUnidades.append("TOTAL_OOAD")

    acumulado: Dict[str, Dict[str, UnidadDatos]] = {}

    for indiceMes, mesActual in enumerate(mesesPresentes):
        mesesHastaAqui = mesesPresentes[:indiceMes + 1]
        filaMes: Dict[str, UnidadDatos] = {}

        for unidad in todasLasUnidades:
            numeradorAcumulado, denominadorAcumulado = 0, 0
            hayNumerador = hayDenominador = False
            completo = True

            for mes in mesesHastaAqui:
                datoUnidad = meses[mes].Reporte.get(unidad)
                if datoUnidad is None:
                    continue
                if datoUnidad.numerador is not None:
                    numeradorAcumulado += datoUnidad.numerador
                    hayNumerador = True
                if datoUnidad.denominador is not None:
                    denominadorAcumulado += datoUnidad.denominador
                    hayDenominador = True
                if datoUnidad.numerador is None or datoUnidad.denominador is None:
                    completo = False

            if not hayNumerador and not hayDenominador:
                filaMes[unidad] = UnidadDatos(desempeno="Gris")
                continue

            numerador   = numeradorAcumulado   if hayNumerador   else None
            denominador = denominadorAcumulado if hayDenominador else None

            if not completo or es_inconsistente(numerador, denominador):
                filaMes[unidad] = UnidadDatos(numerador=numerador, denominador=denominador, desempeno="Gris")
                continue

            contexto  = {**_CONTEXTO_PERMITIDO, "numerador": numerador, "denominador": denominador}
            resultado = round(eval(operacionResultado, {"__builtins__": None}, contexto), 2) if denominador else 0

            filaMes[unidad] = UnidadDatos(**{
                "numerador":   numerador,
                "denominador": denominador,
                "desempeno":   "Gris",  # se clasifica de verdad abajo, con SemaforizarReporte
                "%":           resultado,
            })

        acumulado[mesActual] = filaMes

    # SemaforizarReporte espera y regresa la forma plana {mes: {unidad: UnidadDatos}}
    # (ver shared/semaforizado_service.py) -- se envuelve en MesReporte recien aqui.
    # Poblacion siempre None: es un acumulado calculado sobre varios meses, no un
    # guardado real, asi que no hay una sola poblacion que le corresponda.
    acumulado_semaforizado = SemaforizarReporte(acumulado, indicador)
    return {
        mes: MesReporte(Poblacion=None, Reporte=unidades)
        for mes, unidades in acumulado_semaforizado.items()
    }
