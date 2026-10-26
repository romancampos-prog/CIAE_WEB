"""
Estadisticas de la pagina de graficas, calculadas con el reporte ya guardado en BD_CIAE y las
reglas del mapeo (semaforo y formula): el front solo las pinta.
  - resumenPorMes: estatal, cambio contra el mes anterior, meta, unidades por semaforo y acumulado
  - mapaCalor:     resultado y semaforo de cada unidad en cada mes
  - brechas:       por mes, cuantos casos le faltan (o le sobran) a cada unidad para llegar a Esperado
Usado en: services/grafica/grafica_indicador_Services.py
"""
from schemas.model.reporte_guardado_Model import ReporteIndicador
from services.compartido.calculo.formulas_Services import evaluar_formula
from services.compartido.calculo.resultado_unidades_Services import CLAVE_TOTAL as TOTAL
from services.compartido.semaforo.color_semaforo_Services import evaluar_color
from services.compartido.semaforo.umbrales_semaforo_Services import umbrales_para
from services.grafica.metas_semaforo_Services import meta_esperado, texto_meta
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import UNIDAD_TIPO_IAAS01


def _resultado_con(formula: str, numerador: float, denominador: float) -> float:
    return round(evaluar_formula(formula, numerador, denominador), 2)


##--------------------------------------

def _brecha_unidad(formula: str, umbrales: dict, numerador: float, denominador: float) -> dict | None:
    """
    Cuantos casos del numerador tendrian que cambiar, con el mismo denominador, para que la
    unidad quede en Esperado. Se resuelve con la formula del mapeo (es lineal en el numerador)
    y se confirma con la misma evaluacion del semaforo que colorea las unidades.
    """

    meta = meta_esperado(umbrales)

    if meta is None or not denominador:
        return None

    sentido, valor = meta
    # La formula redondea a 2 decimales: con un numerador muy grande ese redondeo ya no pesa.
    muestra = 10 ** 9
    por_caso = (_resultado_con(formula, muestra, denominador) - _resultado_con(formula, 0, denominador)) / muestra

    if por_caso <= 0:
        return None

    def es_esperado(n: int) -> bool:
        return evaluar_color(_resultado_con(formula, n, denominador), umbrales) == "Esperado"

    estimado = valor / por_caso
    margen = max(10, int(estimado * 0.05))

    if sentido == "mas":
        # Menor numerador que ya queda en Esperado (el resultado crece con el numerador).
        bajo, alto = max(0, int(estimado) - margen), int(estimado) + margen

        while not es_esperado(alto):
            alto *= 2

        while bajo < alto:
            medio = (bajo + alto) // 2
            bajo, alto = (bajo, medio) if es_esperado(medio) else (medio + 1, alto)

        if bajo <= numerador:
            return None

        return {"sentido": "faltan", "casos": int(bajo - numerador)}

    # Mayor numerador que todavia queda en Esperado.
    bajo, alto = max(0, int(estimado) - margen), int(estimado) + margen

    if not es_esperado(bajo):
        bajo = 0
        if not es_esperado(0):
            return None

    while bajo < alto:
        medio = (bajo + alto + 1) // 2
        bajo, alto = (medio, alto) if es_esperado(medio) else (bajo, medio - 1)

    if bajo >= numerador:
        return None

    return {"sentido": "sobran", "casos": int(numerador - bajo)}


##--------------------------------------

def estadisticas_de_reporte(reporte: ReporteIndicador | None, bloque: dict) -> dict | None:
    """Ver docstring del modulo. None si no hay reporte guardado."""

    if reporte is None or not reporte.MESES:
        return None

    semaforo = bloque.get("semaforo") or {}
    formula = (bloque.get("reporte") or {}).get("operacion", {}).get("resultado")
    meses = [mes for mes in MESES_ESTANDAR if mes in reporte.MESES]
    acumulado = reporte.MENSUAL_ACUMULADO or {}

    resumen, brechas = [], {}
    anterior = None

    for mes in meses:
        datos = reporte.MESES[mes].Reporte
        total = datos.get(TOTAL)
        unidades = {u: d for u, d in datos.items() if u != TOTAL}
        conteo = {"Esperado": 0, "Medio": 0, "Bajo": 0, "Gris": 0}

        for dato in unidades.values():
            conteo[dato.desempeno] = conteo.get(dato.desempeno, 0) + 1

        estatal = total.resultado if total else None
        total_acumulado = acumulado.get(mes).Reporte.get(TOTAL) if mes in acumulado else None
        resumen.append({
            "mes": mes,
            "estatal": estatal,
            "desempenoEstatal": total.desempeno if total else "Gris",
            "cambio": round(estatal - anterior, 2) if estatal is not None and anterior is not None else None,
            "meta": texto_meta(umbrales_para(semaforo, mes, "OOAD")) if semaforo else None,
            # "mas" / "menos": que direccion del resultado es mejor (para colorear el cambio); None en rangos.
            "mejora": (meta_esperado(umbrales_para(semaforo, mes, "OOAD")) or (None,))[0] if semaforo else None,
            # False cuando la meta es un rango (IAAS: ">= 7 a <= 12"): ahi no hay "casos que faltan".
            "brechaAplica": bool(formula and semaforo and meta_esperado(umbrales_para(semaforo, mes, "OOAD"))),
            "unidades": conteo,
            "unidadesConDato": sum(v for k, v in conteo.items() if k != "Gris"),
            "acumulado": total_acumulado.resultado if total_acumulado else None,
            "desempenoAcumulado": total_acumulado.desempeno if total_acumulado else None,
        })

        if estatal is not None:
            anterior = estatal

        if formula and semaforo:
            lista = []

            for unidad, dato in unidades.items():
                if dato.desempeno in ("Esperado", "Gris") or dato.numerador is None or dato.denominador is None:
                    continue

                umbrales = umbrales_para(semaforo, mes, UNIDAD_TIPO_IAAS01.get(unidad, "OOAD"))
                brecha = _brecha_unidad(formula, umbrales, dato.numerador, dato.denominador)

                if brecha:
                    lista.append({"unidad": unidad, "resultado": dato.resultado, "desempeno": dato.desempeno,
                                  "meta": texto_meta(umbrales), **brecha})

            brechas[mes] = sorted(lista, key=lambda b: -b["casos"])

    filas = [u for u in reporte.MESES[meses[-1]].Reporte if u != TOTAL]

    for mes in meses:
        filas += [u for u in reporte.MESES[mes].Reporte if u != TOTAL and u not in filas]

    mapa_calor = {
        "meses": meses,
        "filas": [
            {"unidad": unidad, "valores": [
                {"resultado": d.resultado, "desempeno": d.desempeno} if (d := reporte.MESES[mes].Reporte.get(unidad)) else None
                for mes in meses
            ]}
            for unidad in filas
        ],
    }

    return {"resumenPorMes": resumen, "mapaCalor": mapa_calor, "brechas": brechas}
