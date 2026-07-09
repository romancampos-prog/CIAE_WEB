"""
Recalcula el denominador de los indicadores que usan POBLACION.json
leyendo el numerador del JSON histórico ya guardado.
NO accede al FTP — solo lee NUM del JSON y recomputa DEN desde el
POBLACION.json actualizado. Escribe DEN y % de vuelta al JSON.
Usado en: ftp_indicadores/controllers/reportes_controller.py  (/recalcular-poblacion)
"""
import math
from ftp_indicadores.services.ftp_extraer import ExtraerPBDesdeJSON
from ftp_indicadores.config import UNIDADES_FINALES
from ftp_indicadores.services.datos_json_service import (
    leer_numeradores_todos_meses,
    actualizar_denominadores_en_json,
)


def _redondeo(v, umbral_sube: float):
    if v is None:
        return None
    parte_decimal, parte_entera = math.modf(v)
    if abs(parte_decimal) >= umbral_sube:
        return int(parte_entera + (1 if v >= 0 else -1))
    return int(parte_entera)


def actualizar_historico_con_nueva_poblacion(indicador: str, ano: str, info: dict) -> tuple:
    """
    Lee el numerador del JSON histórico y recalcula denominador + resultado
    usando el POBLACION.json actualizado. No toca el FTP.

    Retorna: (éxito: bool, detalle: str, meses_actualizados: int)
    """
    operacion   = info.get("operacion", {})
    decimales   = info.get("decimales") or {}
    umbral_sube = float(decimales.get("sube", 0.60))

    formula_den = operacion.get("denominador", "")
    formula_res = operacion.get("resultado", "round((numerador / denominador) * 100, 2)")
    ctx_base    = {"sum": sum, "round": round, "abs": abs, "math": math}

    meses_nums = leer_numeradores_todos_meses(indicador, ano)

    if not meses_nums:
        return False, "Sin meses con datos en el JSON histórico", 0

    diccionarioPB = {u: {} for u in UNIDADES_FINALES}
    repos_pb = {
        r: v for r, v in info.get("reporte", {}).items()
        if isinstance(v, dict) and v.get("modo") == "JSON_POBLACION"
    }
    for repo, repo_info in repos_pb.items():
        ExtraerPBDesdeJSON(repo, repo_info, diccionarioPB)

    nuevos_den = {}
    for unidad in UNIDADES_FINALES:
        ctx      = ctx_base.copy()
        all_none = True
        for repo, vals in diccionarioPB.get(unidad, {}).items():
            if vals is not None:
                ctx[repo]  = vals if isinstance(vals, list) else [vals]
                all_none   = False
            else:
                ctx[repo] = [0] * 30

        if all_none:
            nuevos_den[unidad] = None
        else:
            try:
                den_raw            = eval(formula_den, {"__builtins__": None}, ctx)
                nuevos_den[unidad] = _redondeo(den_raw, umbral_sube)
            except Exception as e:
                print(f"[RecalcPob] Error evaluando denominador para {unidad}: {e}")
                nuevos_den[unidad] = None

    datos_por_mes = {}

    for idx_mes, nums_mes in meses_nums.items():
        unidades_actualizadas = {}

        for unidad in UNIDADES_FINALES:
            num = nums_mes.get(unidad)
            den = nuevos_den.get(unidad)

            if num is not None and den and den != 0:
                ctx = ctx_base.copy()
                ctx["numerador"]   = num
                ctx["denominador"] = den
                try:
                    res = eval(formula_res, {"__builtins__": None}, ctx)
                    res = round(float(res), 2)
                except Exception as e:
                    print(f"[RecalcPob] Error evaluando resultado para {unidad}: {e}")
                    res = None
            else:
                res = None

            unidades_actualizadas[unidad] = {
                "denominador": den,
                "resultado":   res,
            }

        datos_por_mes[idx_mes] = unidades_actualizadas

    ok = actualizar_denominadores_en_json(indicador, ano, datos_por_mes)
    if not ok:
        return False, "Error escribiendo al JSON histórico", 0

    return True, f"{len(meses_nums)} mes(es) actualizados", len(meses_nums)
