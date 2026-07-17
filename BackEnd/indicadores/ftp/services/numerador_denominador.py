"""
Evalúa las expresiones de numerador/denominador/resultado de cada indicador y agrega el TOTAL.
Usado en: ftp/services/reporte_final.py, reporte_categoria.py
"""
import math
import re


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

            if numerador_final is None or denominador_final is None:
                resultado = None
            elif denominador_final != 0:
                contexto_unidad['numerador']   = numerador_final
                contexto_unidad['denominador'] = denominador_final
                resultado = eval(indicadorOperacion['resultado'], {"__builtins__": None}, contexto_unidad)
            else:
                resultado = 0

            # numerador o denominador en 0 (con el otro presente) es un dato sospechoso, no un
            # resultado real — se fuerza rojo en vez de dejar que el umbral normal lo evalúe.
            forzar_rojo = (
                numerador_final is not None and denominador_final is not None and
                (numerador_final == 0 or denominador_final == 0)
            )

            resultadosFinales[unidad] = {
                "numerador":   numerador_final,
                "denominador": denominador_final,
                "resultado":   round(resultado, 2) if resultado is not None else None,
                "forzar_rojo": forzar_rojo,
            }

        except Exception as e:
            print(f"Error calculando indicadores para {unidad}: {e}")
            resultadosFinales[unidad] = {"numerador": None, "denominador": None, "resultado": None}
            errores_calculo[unidad] = str(e)

    total_num = 0
    total_den = 0
    hay_den   = False

    for res in resultadosFinales.values():
        if res["numerador"] is not None:
            total_num += res["numerador"]
        if res["denominador"] is not None:
            total_den += res["denominador"]
            hay_den = True

    if hay_den:
        resultadosFinales["TOTAL"] = {
            "numerador":   total_num,
            "denominador": total_den,
            "resultado":   round((total_num / total_den) * 100, 2) if total_den > 0 else 0,
            "forzar_rojo": total_num == 0 or total_den == 0,
        }
    else:
        resultadosFinales["TOTAL"] = {
            "numerador": total_num, "denominador": None, "resultado": None, "forzar_rojo": False
        }

    return resultadosFinales, errores_calculo
