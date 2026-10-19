"""
Calculo de los indicadores con las formulas del mapeo, sin importar de donde salieron los
datos (FTP, poblacion, Excel subidos): numerador/denominador/resultado por unidad, el
TOTAL_OOAD y el mensual acumulado. Lo comparten FTP, IAAS, Extractor, las graficas y el Excel.

Regla comun de dato incompleto:
  - numerador o denominador faltante (None)        -> Gris, sin resultado
  - denominador 0 con numerador > 0                 -> Gris (inconsistencia: no se puede dividir,
                                                       no es que el desempeño sea malo)
  - numerador 0 con denominador valido (0 o no)     -> cero real, se evalua normal
Usado en: services/{ftp,iaas,extractor}/*, services/bd_Ciae_Indicadores_Services.py,
          services/excel_Services.py, services/estadisticas_grafica_Services.py
"""
import math
import re

from schemas.model.generacion_Model import DatosExtraidosUnidad, ResultadoUnidad, ValoresPorFuente
from schemas.model.indicador_Model import MesReporte, Operacion, UnidadDatos
from services.indicadorMapeo_Services import bloque_mapeo
from shared.MESES import MESES_ESTANDAR
from shared.semaforo_service import semaforizar_reporte

UMBRAL_SUBE_REDONDEO = 0.60
CLAVE_TOTAL = "TOTAL_OOAD"

# Lo unico que puede usar una formula del mapeo.
_CONTEXTO_BASE_EVAL = {'sum': sum, 'round': round, 'abs': abs, 'math': math}
_NOMBRES_RESERVADOS = {'sum', 'round', 'abs', 'math', 'numerador', 'denominador', 'None', 'True', 'False'}


def redondeo_personalizado(valor: float | None, umbral_sube: float = UMBRAL_SUBE_REDONDEO) -> int | None:
    """Redondea al entero de arriba solo si la parte decimal llega al umbral (no al .5 de siempre)."""
    if valor is None:
        return None
    parte_decimal, parte_entera = math.modf(valor)
    if abs(parte_decimal) >= umbral_sube:
        return int(parte_entera + (1 if valor >= 0 else -1))
    return int(parte_entera)


##--------------------------------------

def _nombres_usados(expresion: str) -> set[str]:
    return {t for t in re.findall(r'[A-Za-z_][A-Za-z0-9_]*', expresion) if t not in _NOMBRES_RESERVADOS}


##--------------------------------------

def evaluar_lado(expresion: str, datos_lado: ValoresPorFuente, umbral_sube: float = UMBRAL_SUBE_REDONDEO) -> int | None:
    """Evalua la expresion de un lado (ej. "CP02[0] + CP03[1]"); None si ninguno de los nombres que usa trae dato."""
    usados = _nombres_usados(expresion) & datos_lado.keys()
    if not usados or all(datos_lado[nombre] is None for nombre in usados):
        return None

    contexto = _CONTEXTO_BASE_EVAL.copy()
    for nombre, valores in datos_lado.items():
        contexto[nombre] = [v if v is not None else 0 for v in valores] if valores is not None else [0] * 20
    return redondeo_personalizado(eval(expresion, {"__builtins__": None}, contexto), umbral_sube)


##--------------------------------------

def evaluar_formula(formula: str, numerador: float, denominador: float) -> float:
    """La formula de resultado del mapeo (ej. "numerador / denominador * 100"), sin redondear."""
    return eval(formula, {"__builtins__": None}, {**_CONTEXTO_BASE_EVAL, "numerador": numerador, "denominador": denominador})


##--------------------------------------

def es_gris(numerador, denominador) -> bool:
    return numerador is None or denominador is None


##--------------------------------------

def es_inconsistente(numerador, denominador) -> bool:
    """Numerador positivo con denominador 0: no se puede dividir, dato invalido."""
    return (
        numerador is not None and denominador is not None and
        denominador == 0 and numerador > 0
    )


##--------------------------------------

def calcular_resultado(numerador: int | None, denominador: int | None, formula: str) -> int | float | None:
    """Resultado de una unidad segun la formula del mapeo; None si el dato esta incompleto o es inconsistente."""
    if es_gris(numerador, denominador) or es_inconsistente(numerador, denominador):
        return None
    if denominador == 0:
        return 0  # ambos 0: cero real, se evalua normal
    return round(evaluar_formula(formula, numerador, denominador), 2)


##--------------------------------------

def agregar_total_ooad(unidades: dict[str, ResultadoUnidad], formula_resultado: str) -> ResultadoUnidad:
    """
    TOTAL_OOAD: suma numerador/denominador de las unidades y evalua la misma formula del
    mapeo (nunca un x100 fijo). Unidad incompleta (Gris) no cuenta; numerador>0 con
    denominador=0 es inconsistencia (no se suma); ambos 0 es un cero real y si cuenta.
    """
    total_num  = 0
    total_den  = 0
    hay_alguna = False

    for nombre, unidad in unidades.items():
        if nombre == CLAVE_TOTAL:
            continue
        num, den = unidad.numerador, unidad.denominador
        if num is None or den is None:
            continue
        if den == 0 and num > 0:
            print(f"[Total OOAD] Inconsistencia en {nombre}: numerador={num} con denominador=0 -- no se incluye en el TOTAL_OOAD.")
            continue
        total_num += num
        total_den += den
        hay_alguna = True

    if not hay_alguna:
        return ResultadoUnidad(numerador=total_num, denominador=None, resultado=None)

    if total_den == 0:
        return ResultadoUnidad(numerador=total_num, denominador=total_den, resultado=0)

    try:
        resultado_total = round(evaluar_formula(formula_resultado, total_num, total_den), 2)
    except Exception as error:
        print(f"[Total OOAD] Error evaluando el resultado: {error}")
        resultado_total = None
    return ResultadoUnidad(numerador=total_num, denominador=total_den, resultado=resultado_total)


##--------------------------------------

def calcular_unidades(
    numerador: dict, denominador: dict, formula: str, unidades: list[str] | None = None,
    excluidas_del_total: list[str] = (), cero_es_sin_dato: bool = False,
) -> dict[str, ResultadoUnidad]:
    """
    {unidad: numerador} + {unidad: denominador} ya contados -> {unidad: resultado} + TOTAL_OOAD.
    Es el paso comun de IAAS, Extractor y el recalculo de poblacion de FTP.
      unidades:            cuales y en que orden (por omision las que traigan dato)
      excluidas_del_total: se calculan y muestran, pero no suman al TOTAL_OOAD
      cero_es_sin_dato:    denominador 0 = no tuvo a quien medir (Gris), no "0 = Esperado"
    """
    if unidades is None:
        unidades = list(dict.fromkeys([*numerador, *denominador]))   # sin repetir, en el orden en que llegaron
    resultados: dict[str, ResultadoUnidad] = {}
    for unidad in unidades:
        if unidad == CLAVE_TOTAL:
            continue
        num, den = numerador.get(unidad), denominador.get(unidad)
        sin_a_quien_medir = cero_es_sin_dato and den == 0
        resultados[unidad] = ResultadoUnidad(
            numerador=num, denominador=den,
            resultado=None if sin_a_quien_medir else calcular_resultado(num, den, formula),
        )
    para_el_total = {unidad: resultado for unidad, resultado in resultados.items() if unidad not in excluidas_del_total}
    resultados[CLAVE_TOTAL] = agregar_total_ooad(para_el_total, formula)
    return resultados


##--------------------------------------

def calcular_indicador(
    extraidos: dict[str, DatosExtraidosUnidad], operacion: Operacion,
    umbral_sube: float = UMBRAL_SUBE_REDONDEO,
) -> tuple[dict[str, ResultadoUnidad], dict[str, str]]:
    """
    FTP: lo leido de los reportes por unidad -> (resultado por unidad + TOTAL_OOAD,
    {unidad: mensaje} de las formulas que fallaron).
    """
    resultados:      dict[str, ResultadoUnidad] = {}
    errores_calculo: dict[str, str] = {}

    for unidad, datos in extraidos.items():
        try:
            numerador   = evaluar_lado(operacion.numerador,   datos.numerador,   umbral_sube)
            denominador = evaluar_lado(operacion.denominador, datos.denominador, umbral_sube)
            resultados[unidad] = ResultadoUnidad(
                numerador=numerador, denominador=denominador,
                resultado=calcular_resultado(numerador, denominador, operacion.resultado),
            )
        except Exception as error:
            print(f"Error calculando indicadores para {unidad}: {error}")
            resultados[unidad] = ResultadoUnidad()
            errores_calculo[unidad] = str(error)

    resultados[CLAVE_TOTAL] = agregar_total_ooad(resultados, operacion.resultado)
    return resultados, errores_calculo


##--------------------------------------

def acumula_sumando_meses(indicador: str) -> bool:
    """
    True si el mapeo pide mensual Y mensual acumulado (peridocidadGenerada): se guarda el
    dato de cada mes y el acumulado se arma sumando meses (IAAS, MT 03-05, CUPN 05/07...).
    Con solo mensualAcumulado el archivo ya viene acumulado (CACU 01, CAMA...) y NO se suma.
    """
    generada = (bloque_mapeo(indicador) or {}).get("peridocidadGenerada") or {}
    return bool(generada.get("mensual") and generada.get("mensualAcumulado"))


##--------------------------------------

def calcular_mensual_acumulado(meses: dict[str, MesReporte], indicador: str) -> dict[str, MesReporte] | None:
    """
    Acumula numerador/denominador mes a mes (Enero igual, Febrero = Enero+Febrero...) y
    recalcula el resultado con la formula del mapeo y su semaforo. Una unidad a la que le
    falte numerador o denominador en algun mes del rango queda Gris (se muestran los
    acumulados que si existan); un mes en el que la unidad no existe no suma.
    """
    bloque = bloque_mapeo(indicador) or {}
    formula = bloque.get("reporte", {}).get("operacion", {}).get("resultado")
    if not formula:
        return None

    # Se acumula solo mientras los meses vayan seguidos: si faltara Marzo, "Enero-Abril"
    # no puede ser Ene+Feb+Abr, asi que el acumulado se detiene en el primer hueco.
    meses_presentes = []
    for mes in MESES_ESTANDAR:
        if mes in meses:
            meses_presentes.append(mes)
        elif meses_presentes:
            break

    # Lista (no set) para conservar el orden de las unidades, con el TOTAL al final.
    todas_las_unidades = list(dict.fromkeys(u for mes in meses_presentes for u in meses[mes].Reporte))
    if CLAVE_TOTAL in todas_las_unidades:
        todas_las_unidades.remove(CLAVE_TOTAL)
        todas_las_unidades.append(CLAVE_TOTAL)

    acumulado: dict[str, dict[str, UnidadDatos]] = {}
    for indice_mes, mes_actual in enumerate(meses_presentes):
        fila_mes: dict[str, UnidadDatos] = {}
        for unidad in todas_las_unidades:
            numerador_acumulado = denominador_acumulado = 0
            hay_numerador = hay_denominador = False
            completo = True
            for mes in meses_presentes[:indice_mes + 1]:
                dato = meses[mes].Reporte.get(unidad)
                if dato is None:
                    continue
                if dato.numerador is not None:
                    numerador_acumulado += dato.numerador
                    hay_numerador = True
                if dato.denominador is not None:
                    denominador_acumulado += dato.denominador
                    hay_denominador = True
                if dato.numerador is None or dato.denominador is None:
                    completo = False

            if not hay_numerador and not hay_denominador:
                fila_mes[unidad] = UnidadDatos(desempeno="Gris")
                continue

            numerador   = numerador_acumulado   if hay_numerador   else None
            denominador = denominador_acumulado if hay_denominador else None
            if not completo or es_inconsistente(numerador, denominador):
                fila_mes[unidad] = UnidadDatos(numerador=numerador, denominador=denominador, desempeno="Gris")
                continue

            resultado = round(evaluar_formula(formula, numerador, denominador), 2) if denominador else 0
            # desempeno se clasifica abajo, con el semaforo del mapeo
            fila_mes[unidad] = UnidadDatos(**{"numerador": numerador, "denominador": denominador, "desempeno": "Gris", "%": resultado})
        acumulado[mes_actual] = fila_mes

    # Poblacion siempre None: es un acumulado de varios meses, no hay una sola poblacion que le toque.
    return {
        mes: MesReporte(Poblacion=None, Reporte=unidades)
        for mes, unidades in semaforizar_reporte(acumulado, bloque.get("semaforo")).items()
    }
