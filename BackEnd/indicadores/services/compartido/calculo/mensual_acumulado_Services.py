"""
Mensual acumulado: cuando el mapeo pide mensual Y mensual acumulado se guarda el dato de cada
mes y el acumulado se arma aqui sumando meses (lo usan la grafica y el Excel).
Usado en: services/grafica/grafica_indicador_Services.py, services/excel/hoja_estandar_excel_Services.py
"""
from datos.lectura_mapeo.mapeo_indicadores_Datos import bloque_mapeo
from schemas.model.reporte_guardado_Model import MesReporte, UnidadDatos
from services.compartido.calculo.formulas_Services import evaluar_formula
from services.compartido.calculo.resultado_unidades_Services import CLAVE_TOTAL, es_inconsistente
from services.compartido.semaforo.color_semaforo_Services import semaforizar_reporte
from shared.MESES import MESES_ESTANDAR


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
