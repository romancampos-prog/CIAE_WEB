"""
Evalúa las expresiones de numerador/denominador/resultado de cada indicador y agrega el TOTAL_OOAD.
Usado en: ftp/services/reporte_final.py, reporte_categoria.py
"""
import math
import re

from shared.color_service import es_gris, es_bajo_forzado


def ObtenerNumDen(diccionarioPrevio, indicadorOperacion, inidicadorDecimal):
    umbral_sube = float(inidicadorDecimal.get('sube', 0.60))

    def redondeo_personalizado(valor):
        if valor is None:
            return None
        parte_decimal, parte_entera = math.modf(valor)
        if abs(parte_decimal) >= umbral_sube:
            return int(parte_entera + (1 if valor >= 0 else -1))
        return int(parte_entera)

    def repos_usados_en_expr(expresion):
        IGNORAR = {'sum', 'round', 'abs', 'math', 'numerador', 'denominador', 'None', 'True', 'False'}
        tokens = re.findall(r'[A-Za-z_][A-Za-z0-9_]*', expresion)
        return {t for t in tokens if t not in IGNORAR}

    def todos_none(repos_en_expr, reportes_unidad):
        repos = repos_en_expr & set(reportes_unidad.keys())
        if not repos:
            return True
        return all(reportes_unidad.get(r) is None for r in repos)

    resultadosFinales = {}
    errores_calculo   = {}
    contexto_base = {'sum': sum, 'round': round, 'abs': abs, 'math': math}

    repos_num = repos_usados_en_expr(indicadorOperacion['numerador'])
    repos_den = repos_usados_en_expr(indicadorOperacion['denominador'])

    for unidad, reportes in diccionarioPrevio.items():
        try:
            contexto_unidad = contexto_base.copy()
            hay_datos_reales = False

            for repo, valores in reportes.items():
                if valores is not None:
                    contexto_unidad[repo] = [v if v is not None else 0 for v in valores]
                    hay_datos_reales = True
                else:
                    contexto_unidad[repo] = [0] * 20

            if not hay_datos_reales:
                resultadosFinales[unidad] = {"numerador": None, "denominador": None, "resultado": None}
                continue

            if todos_none(repos_num, reportes):
                numerador_final = None
            else:
                numerador_raw   = eval(indicadorOperacion['numerador'], {"__builtins__": None}, contexto_unidad)
                numerador_final = redondeo_personalizado(numerador_raw)

            if todos_none(repos_den, reportes):
                denominador_final = None
            else:
                denominador_raw   = eval(indicadorOperacion['denominador'], {"__builtins__": None}, contexto_unidad)
                denominador_final = redondeo_personalizado(denominador_raw)

            if es_gris(numerador_final, denominador_final):
                resultado = None
            elif denominador_final != 0:
                contexto_unidad['numerador']   = numerador_final
                contexto_unidad['denominador'] = denominador_final
                resultado = eval(indicadorOperacion['resultado'], {"__builtins__": None}, contexto_unidad)
            else:
                resultado = 0

            # numerador o denominador en 0 (con el otro presente) es un dato sospechoso, no un
            # resultado real — se fuerza Bajo en vez de dejar que el umbral normal lo evalúe.
            forzar_bajo = es_bajo_forzado(numerador_final, denominador_final)

            resultadosFinales[unidad] = {
                "numerador":   numerador_final,
                "denominador": denominador_final,
                "resultado":   round(resultado, 2) if resultado is not None else None,
                "forzar_bajo": forzar_bajo,
            }

        except Exception as e:
            print(f"Error calculando indicadores para {unidad}: {e}")
            resultadosFinales[unidad] = {"numerador": None, "denominador": None, "resultado": None}
            errores_calculo[unidad] = str(e)

    # Total OOAD: suma numerador/denominador de las unidades, con las mismas 3 reglas
    # que IAAS -- unidad incompleta (Gris) no cuenta; numerador>0 con denominador=0 es
    # una inconsistencia (se notifica, no se suma); numerador y denominador ambos 0 es
    # un cero real, sí cuenta (no afecta el total, aporta 0/0).
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
        # La tasa del total usa la MISMA fórmula del mapeo que ya usa cada unidad
        # (indicadorOperacion['resultado']) -- nunca un ×100 fijo, porque no todos
        # los indicadores multiplican por 100 en su fórmula.
        if total_den != 0:
            ctx_total = contexto_base.copy()
            ctx_total['numerador']   = total_num
            ctx_total['denominador'] = total_den
            try:
                resultado_total = round(eval(indicadorOperacion['resultado'], {"__builtins__": None}, ctx_total), 2)
            except Exception as e:
                print(f"[FTP] Error evaluando resultado del TOTAL_OOAD: {e}")
                resultado_total = None
        else:
            resultado_total = 0

        resultadosFinales["TOTAL_OOAD"] = {
            "numerador":   total_num,
            "denominador": total_den,
            "resultado":   resultado_total,
            "forzar_bajo": es_bajo_forzado(total_num, total_den),
        }
    else:
        resultadosFinales["TOTAL_OOAD"] = {
            "numerador": total_num, "denominador": None, "resultado": None, "forzar_bajo": False
        }

    return resultadosFinales, errores_calculo
