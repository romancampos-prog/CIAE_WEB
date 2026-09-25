"""
Evalúa las expresiones de numerador/denominador/resultado de cada indicador y agrega el TOTAL_OOAD.
Usado en: ftp/services/reporte_final.py, reporte_categoria.py
"""
import math


CONTEXTO_BASE_EVAL = {'sum': sum, 'round': round, 'abs': abs, 'math': math}


def redondeo_personalizado(valor, umbral_sube=0.60):
    if valor is None:
        return None
    parte_decimal, parte_entera = math.modf(valor)
    if abs(parte_decimal) >= umbral_sube:
        return int(parte_entera + (1 if valor >= 0 else -1))
    return int(parte_entera)


def AgregarTotalOOAD(resultadosFinales, formula_resultado):
    """
    Suma numerador/denominador de las unidades y agrega la llave TOTAL_OOAD a
    resultadosFinales (mismas 3 reglas que IAAS -- unidad incompleta (Gris) no
    cuenta; numerador>0 con denominador=0 es inconsistencia (se notifica, no se
    suma); ambos 0 es un cero real, sí cuenta). formula_resultado es la misma
    del mapeo que usa cada unidad -- nunca un ×100 fijo, porque no todos los
    indicadores multiplican por 100.
    """
    total_num  = 0
    total_den  = 0
    hay_alguna = False

    for unidad, res in resultadosFinales.items():
        num = res["numerador"]
        den = res["denominador"]
        if num is None or den is None:
            continue
        if den == 0 and num > 0:
            print(f"[FTP] Inconsistencia en {unidad}: numerador={num} con denominador=0 -- no se incluye en el TOTAL_OOAD.")
            continue
        total_num += num
        total_den += den
        hay_alguna = True

    if hay_alguna:
        if total_den != 0:
            ctx_total = CONTEXTO_BASE_EVAL.copy()
            ctx_total['numerador']   = total_num
            ctx_total['denominador'] = total_den
            try:
                resultado_total = round(eval(formula_resultado, {"__builtins__": None}, ctx_total), 2)
            except Exception as e:
                print(f"[FTP] Error evaluando resultado del TOTAL_OOAD: {e}")
                resultado_total = None
        else:
            resultado_total = 0

        resultadosFinales["TOTAL_OOAD"] = {
            "numerador":   total_num,
            "denominador": total_den,
            "resultado":   resultado_total,
        }
    else:
        resultadosFinales["TOTAL_OOAD"] = {
            "numerador": total_num, "denominador": None, "resultado": None
        }
