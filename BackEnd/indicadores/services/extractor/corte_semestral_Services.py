"""
El corte "Semestral Anualizado" (EH 03, DM 04): cuando ya estan los 12 meses de numerador crudo
de una ventana, se suma, se trae el denominador de poblacion (misma lectura y formula del mapeo
que FTP), se semaforiza y se guarda en CORTES. Tambien el recalculo de los cortes ya generados
cuando llega una poblacion nueva.
Usado en: services/extractor/generar_corte_Services.py, services/poblacion/recalcular_poblacion_Services.py
"""
from datos.bd_ciae.extractor_Datos import guardar_reporte_extractor, leer_reporte_extractor
from datos.bd_ciae.poblacion_Datos import texto_poblacion_vigente
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_extractor
from schemas.model.reporte_guardado_Model import UnidadDatos
from services.calculo.formulas_Services import evaluar_formula
from services.extractor.catalogo_extractor_Services import indicadores_extractor_de_corte
from services.poblacion.denominador_poblacion_Services import denominador_de_poblacion
from services.semaforo.color_semaforo_Services import semaforizar_reporte
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import NOMBREUNIDADESARCHIVO

# Meses en los que la periodicidad "Semestral Anualizado" dispara un corte.
MESES_CORTE_SEMESTRAL = ["Junio", "Diciembre"]


def ventana_corte(mes_corte: str, anio: int) -> list[tuple[str, int]]:
    """
    Devuelve los 12 (mes, año) que componen el corte "Semestral Anualizado":
      - corte "Junio":     Julio(anio-1) .. Junio(anio)
      - corte "Diciembre": Enero(anio)   .. Diciembre(anio)
    Cada tupla dice en qué archivo de año buscar ese mes (puede ser el año
    anterior para el corte de Junio).
    """

    if mes_corte == "Junio":
        meses_prev = MESES_ESTANDAR[6:12]   # Julio..Diciembre
        meses_actual = MESES_ESTANDAR[0:6]  # Enero..Junio
        return [(m, anio - 1) for m in meses_prev] + [(m, anio) for m in meses_actual]

    if mes_corte == "Diciembre":
        return [(m, anio) for m in MESES_ESTANDAR]

    raise ValueError(f"Mes de corte desconocido para Semestral Anualizado: {mes_corte!r}")


##--------------------------------------

def intentar_generar_corte(indicador: str, anio: int, mes_nombre: str) -> dict | None:
    """
    Si 'mes_nombre' es un mes de corte (Junio/Diciembre) y ya estan los 12
    meses de la ventana correspondiente, calcula y guarda el corte final
    (numerador acumulado + denominador + resultado + semaforo).
    Retorna el bloque generado, o None si no aplicaba/no estaba completo.
    """

    if mes_nombre not in MESES_CORTE_SEMESTRAL:
        return None

    ventana = ventana_corte(mes_nombre, anio)  # [(mes, anio), ...] x12

    reportes_cache: dict[int, dict] = {}
    # arranca con las 46 unidades en cero, mismo orden que usan los demas
    # reportes (NOMBREUNIDADESARCHIVO) -- si no, una unidad sin ningun caso en
    # todo el año simplemente no aparecia en el corte, en vez de salir en 0.
    numerador_acumulado: dict[str, int] = {unidad: 0 for unidad in NOMBREUNIDADESARCHIVO}

    for mes, anio_mes in ventana:
        if anio_mes not in reportes_cache:
            reportes_cache[anio_mes] = leer_reporte_extractor(indicador, anio_mes)

        # MESES siempre es el dato crudo (ver datos/bd_ciae/extractor_Datos.guardar_numerador_mes)
        # -- nunca lo sobreescribe un cierre de corte, ni siquiera para el propio mes de
        # corte, asi que sirve igual si "mes" es Junio/Diciembre o cualquier otro.
        datos_mes = reportes_cache[anio_mes]["MESES"].get(mes)

        if datos_mes is None:
            return None  # todavia no esta completa la ventana de 12 meses

        for unidad, dato in datos_mes.items():
            numerador_acumulado[unidad] = numerador_acumulado.get(unidad, 0) + (dato.get("numerador") or 0)

    mapeo = cargar_indicador_extractor(indicador)

    # Poblacion base del corte: Junio usa la del año anterior (el corte
    # Jul[anio-1]-Jun[anio] cae mayormente en anio-1), Diciembre usa la del
    # mismo año (corte Ene-Dic[anio]).
    anio_poblacion = anio - 1 if mes_nombre == "Junio" else anio
    denominador_por_unidad = denominador_de_poblacion(mapeo.reporte.denominador.sexo, mapeo.reporte.operacion.denominador, anio_poblacion)
    formula_resultado = mapeo.reporte.operacion.resultado
    poblacion_usada = texto_poblacion_vigente(anio_poblacion)

    bloque_corte: dict[str, UnidadDatos] = {}
    total_num = total_den = 0

    for unidad, numerador in numerador_acumulado.items():
        denominador = denominador_por_unidad.get(unidad)

        if not denominador:
            continue  # sin PAMF -- no entra a la tasa por unidad (solo al TOTAL_OOAD)

        total_num += numerador
        total_den += denominador
        resultado = evaluar_formula(formula_resultado, numerador, denominador)

        # UnidadDatos.resultado usa alias "%" sin populate_by_name -- hay que
        # construirlo con el alias, si no el valor se descarta silenciosamente.
        bloque_corte[unidad] = UnidadDatos(**{"numerador": numerador, "denominador": denominador, "%": resultado, "desempeno": "Gris"})

    if total_den:
        resultado_total = evaluar_formula(formula_resultado, total_num, total_den)
        bloque_corte["TOTAL_OOAD"] = UnidadDatos(**{"numerador": total_num, "denominador": total_den, "%": resultado_total, "desempeno": "Gris"})

    bloque_semaforizado = semaforizar_reporte(bloque_corte, mapeo.semaforo, mes=mes_nombre)

    # El corte se guarda en CORTES.MESES, no en MESES -- ver guardar_numerador_mes.
    # En un indicador "Semestral Anualizado" como este, CORTES.MESES solo tiene
    # (a lo mas) las llaves "Junio" y "Diciembre", nunca los otros 10 meses.
    reporte_anio_corte = reportes_cache[anio]
    cortes = reporte_anio_corte.setdefault("CORTES", {})
    cortes.setdefault("MESES", {})[mes_nombre] = {
        "Poblacion": poblacion_usada,
        "Reporte": {unidad: dato.model_dump(by_alias=True) for unidad, dato in bloque_semaforizado.items()},
    }
    guardar_reporte_extractor(indicador, anio, reporte_anio_corte)

    return reporte_anio_corte["CORTES"]["MESES"][mes_nombre]


##--------------------------------------

def recalcular_cortes_con_poblacion(anio_poblacion: int) -> list[dict]:
    """
    Cuando se sube una poblacion nueva para 'anio_poblacion', refresca los cortes
    ya generados que la usan. A diferencia de FTP (que recalcula mes a mes), aqui
    la poblacion es por año completo -- no importa que mes traiga el reporte de
    poblacion, solo el año -- asi que solo hay 2 cortes candidatos por indicador
    (misma regla que intentar_generar_corte: Junio usa el año anterior, Diciembre
    el mismo año):
      - Diciembre del mismo anio_poblacion (usa la poblacion de ese mismo año).
      - Junio del año siguiente (usa la poblacion del año anterior a el, o sea
        anio_poblacion).
    Si ese corte todavia no se genero (ventana incompleta), no se fuerza -- sigue
    esperando a que se complete, igual que siempre. Si ya se genero, se recalcula
    con la poblacion mas reciente disponible -- no se "congela" con la primera
    poblacion que alcanzo, sigue ajustandose cada vez que se sube una nueva y se
    dispara el recalculo, hasta que el usuario decida que ya es la definitiva.
    """
    recalculados = []

    for indicador in indicadores_extractor_de_corte():
        for mes_corte, anio_corte in [("Diciembre", anio_poblacion), ("Junio", anio_poblacion + 1)]:
            bloque = leer_reporte_extractor(indicador, anio_corte).get("CORTES", {}).get("MESES", {}).get(mes_corte)
            if not (bloque and "TOTAL_OOAD" in (bloque.get("Reporte") or {})):
                continue
            if intentar_generar_corte(indicador, anio_corte, mes_corte) is not None:
                recalculados.append({"indicador": indicador, "corte": f"{mes_corte} {anio_corte}"})

    return recalculados
