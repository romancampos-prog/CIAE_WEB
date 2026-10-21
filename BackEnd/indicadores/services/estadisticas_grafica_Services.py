"""
Estadisticas de la pagina de graficas, calculadas con el reporte ya guardado en BD_CIAE y
las reglas del mapeo (semaforo y formula): el front solo las pinta.
  - resumenPorMes: estatal, cambio contra el mes anterior, meta, unidades por semaforo y acumulado
  - mapaCalor:     resultado y semaforo de cada unidad en cada mes
  - brechas:       por mes, cuantos casos le faltan (o le sobran) a cada unidad para llegar a Esperado
Y el perfil del indicador (perfil_de_indicador): tipo de meta, niveles del semaforo, meta por mes,
unidad de medida, si es por corte y el umbral de denominador chico, para que el front no deduzca
reglas por su cuenta.
Usado en: services/bd_Ciae_Indicadores_Services.py (consultar_grafica_indicador)
"""
from schemas.model.indicador_Model import ReporteIndicador
from services.calculo_indicador_Services import CLAVE_TOTAL as TOTAL, evaluar_formula
from shared.MESES import MESES_ESTANDAR
from shared.reglas_periodicidad import es_periodicidad_de_corte
from shared.semaforo_service import es_agrupado, es_formato_explicito, evaluar_color, umbrales_para, _RE_UMBRAL, _RE_UMBRAL_COMPUESTO
from shared.UNIDADES import UNIDAD_TIPO_IAAS01, grupo_de_unidad_iaas01

# Con menos casos que esto en el denominador, un solo caso mueve mucho el resultado: la grafica lo avisa.
UMBRAL_DENOMINADOR_CHICO = 20

# Lo que vale la formula con numerador = denominador = 1 dice en que se expresa el resultado.
_UNIDAD_POR_FACTOR = {1: "promedio", 100: "%", 1000: "por 1,000", 100000: "por 100,000"}


def _resultado_con(formula: str, numerador: float, denominador: float) -> float:
    return round(evaluar_formula(formula, numerador, denominador), 2)


##--------------------------------------

def _meta_esperado(umbrales: dict) -> tuple[str, float] | None:
    """
    ("mas", 70.0) si Esperado es ">= 70" (mas es mejor), ("menos", 1.4) si es "<= 1.4".
    None si el semaforo no permite calcular una brecha (rangos compuestos de IAAS, o vacio).
    Acepta tambien el formato legado ({"Bajo": n, "Esperado": n} / {"Alto": n, "Esperado": n}).
    """
    esperado = umbrales.get("Esperado")
    if esperado is None:
        return None
    if isinstance(esperado, (int, float)):
        return ("menos" if "Alto" in umbrales else "mas", float(esperado))
    coincidencia = _RE_UMBRAL.match(str(esperado))
    if not coincidencia:
        return None
    operador, valor = coincidencia.groups()
    return ("mas" if operador in (">=", ">") else "menos", float(valor))


##--------------------------------------

def _brecha_unidad(formula: str, umbrales: dict, numerador: float, denominador: float) -> dict | None:
    """
    Cuantos casos del numerador tendrian que cambiar, con el mismo denominador, para que la
    unidad quede en Esperado. Se resuelve con la formula del mapeo (es lineal en el numerador)
    y se confirma con la misma evaluacion del semaforo que colorea las unidades.
    """
    meta = _meta_esperado(umbrales)
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

def _texto_meta(umbrales: dict) -> str | None:
    esperado = umbrales.get("Esperado")
    if esperado is None:
        return None
    if isinstance(esperado, (int, float)):
        return f"{'<=' if 'Alto' in umbrales else '>='} {esperado}"
    return str(esperado)


##--------------------------------------

def _meta_numerica(umbrales: dict) -> dict | None:
    """
    La meta (Esperado) con sus numeros, para dibujarla: {"texto": ">= 1.3", "valor": 1.3} si es
    un limite, {"texto": ">= 4 a <= 7", "minimo": 4, "maximo": 7} si es un rango. None si no hay.
    """
    texto = _texto_meta(umbrales)
    if texto is None:
        return None
    limite = _meta_esperado(umbrales)
    if limite:
        return {"texto": texto, "valor": limite[1]}
    rango = _RE_UMBRAL_COMPUESTO.match(texto)
    if rango and rango.group(3) == "a":
        return {"texto": texto, "minimo": float(rango.group(2)), "maximo": float(rango.group(5))}
    return {"texto": texto}


##--------------------------------------

def _tipo_meta(umbrales: dict) -> str | None:
    """"mas" / "menos" (que direccion es mejor), "rango" (Esperado entre dos valores) o None."""
    limite = _meta_esperado(umbrales)
    if limite:
        return limite[0]
    meta = _meta_numerica(umbrales)
    return "rango" if meta and "minimo" in meta else None


##--------------------------------------

def _niveles_semaforo(semaforo: dict) -> list[str]:
    """
    Los niveles que de verdad puede tomar el indicador. Medio solo si algun bloque del mapeo lo
    define (CACU 03, EH 03 no lo tienen); en el formato legado (numeros) siempre hay Medio.
    """
    if not semaforo:
        return []
    bloques = list(semaforo.values()) if any(isinstance(v, dict) for v in semaforo.values()) else [semaforo]
    tiene_medio = any(b.get("Medio") or not es_formato_explicito(b) for b in bloques)
    return ["Esperado", "Medio", "Bajo"] if tiene_medio else ["Esperado", "Bajo"]


##--------------------------------------

def _unidad_de_medida(formula: str | None) -> str | None:
    """"%", "por 1,000", "por 100,000" o "promedio" segun la formula del mapeo; None sin formula."""
    if not formula:
        return None
    factor = evaluar_formula(formula, 1, 1)
    return _UNIDAD_POR_FACTOR.get(int(factor)) if factor == int(factor) else None


##--------------------------------------

def perfil_de_indicador(bloque: dict, unidades: list[str]) -> dict:
    """
    Lo que la grafica necesita saber del indicador, sacado del mapeo:
      tipoMeta (mas/menos/rango/None), niveles del semaforo, meta de cada mes (y de cada unidad
      cuando el semaforo va por grupo, IAAS 01), unidad de medida, si se publica por corte y el
      umbral de denominador chico (solo en porcentajes y tasas: en un promedio el denominador no
      son casos, ej. dias laborados).
    """
    semaforo = bloque.get("semaforo") or {}
    formula = (bloque.get("reporte") or {}).get("operacion", {}).get("resultado")
    unidad_medida = _unidad_de_medida(formula)
    meta_por_mes = {mes: _meta_numerica(umbrales_para(semaforo, mes, "OOAD")) for mes in MESES_ESTANDAR} if semaforo else {}
    # El semaforo por mes puede no traer todos los meses (trimestrales: solo marzo, junio...).
    tipos = [_tipo_meta(umbrales_para(semaforo, mes, "OOAD")) for mes in MESES_ESTANDAR] if semaforo else []
    tipo_meta = next((tipo for tipo in tipos if tipo), None)

    meta_de_unidad = None
    if es_agrupado(semaforo):
        meta_de_unidad = {u: _meta_numerica(umbrales_para(semaforo, None, grupo_de_unidad_iaas01(u))) for u in unidades}

    return {
        "tipoMeta": tipo_meta,
        "niveles": _niveles_semaforo(semaforo),
        "metaPorMes": meta_por_mes,
        "metaDeUnidad": meta_de_unidad,
        "unidadMedida": unidad_medida,
        "esCorte": es_periodicidad_de_corte(bloque.get("periodicidad")),
        "umbralDenominadorChico": UMBRAL_DENOMINADOR_CHICO if unidad_medida in ("%", "por 1,000", "por 100,000") else None,
        "serieCortes": None,
    }


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
            "meta": _texto_meta(umbrales_para(semaforo, mes, "OOAD")) if semaforo else None,
            # "mas" / "menos": que direccion del resultado es mejor (para colorear el cambio); None en rangos.
            "mejora": (_meta_esperado(umbrales_para(semaforo, mes, "OOAD")) or (None,))[0] if semaforo else None,
            # False cuando la meta es un rango (IAAS: ">= 7 a <= 12"): ahi no hay "casos que faltan".
            "brechaAplica": bool(formula and semaforo and _meta_esperado(umbrales_para(semaforo, mes, "OOAD"))),
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
                                  "meta": _texto_meta(umbrales), **brecha})
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
