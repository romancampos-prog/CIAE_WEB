"""
Deteccion y calculo del corte "Semestral Anualizado" del motor Extractor (EH 03,
DM 04): cuando ya estan los 12 meses de numerador crudo de una ventana, se suma,
se trae el denominador de poblacion y se semaforiza -- exclusivo de Extractor.

El denominador se lee con el mismo motor generico que usa FTP (extraer_poblacion,
segun reporte.denominador.sexo del mapeo) y se evalua con la misma formula del
mapeo (evaluar_lado) -- antes sumaba columnas de edad hardcodeadas en vez de leer
la formula, lo que hubiera hecho pasar por alto un cambio en reporte.operacion.denominador.
Usado en: services/extractor/generacion_extractor_Services.py, Controller/extractor_Controller.py
"""
from schemas.model.indicador_Model import UnidadDatos
from schemas.model.generacion_ftp_Model import DatosExtraidosUnidad
from schemas.model.reporte_mapeo_Model import FuentePoblacionInfoSalud
from services.calculo_indicador_Services import UMBRAL_SUBE_REDONDEO, evaluar_lado
from services.extractor.guardado_extractor_Services import leer_reporte, guardar_reporte
from services.indicadorMapeo_Services import cargar_indicador_extractor
from services.ftp.extraccion_indicador_ftp_Services import extraer_poblacion
from services.ftp.registro_errores_ftp_Services import crear_log_errores
from shared.MESES import MESES_ESTANDAR
from shared.semaforizado_service import SemaforizarReporte
from shared.unidades_ftp import NOMBREUNIDADESARCHIVO

_CONTEXTO_PERMITIDO = {"round": round, "sum": sum, "abs": abs}

# Indicadores que usan el motor "extractor" -- un solo Excel mensual (SUI-13 +
# su cruce con Egresos) alimenta a todos al mismo tiempo, cada uno con su
# propia lista de codigos/filtros (ver su bloque "reporte" en indicadores/mapeo/).
INDICADORES_EXTRACTOR = ["EH 03", "DM 04"]

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


def _denominador_por_unidad(anio: int, denominador: FuentePoblacionInfoSalud, formula_denominador: str) -> dict[str, float]:
    """Denominador por unidad para el corte, leido de POBLACION_{anio}.json (misma extraccion que FTP)."""
    extraidos = {unidad: DatosExtraidosUnidad() for unidad in NOMBREUNIDADESARCHIVO}
    extraer_poblacion(denominador.sexo, str(anio), extraidos, crear_log_errores())
    resultado: dict[str, float] = {}
    for unidad, datos in extraidos.items():
        valor = evaluar_lado(formula_denominador, datos.denominador, UMBRAL_SUBE_REDONDEO)
        if valor is not None:
            resultado[unidad] = valor
    return resultado


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
            reportes_cache[anio_mes] = leer_reporte(indicador, anio_mes)
        # MESES siempre es el dato crudo (ver guardado_extractor_Services.guardar_numerador_mes)
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
    denominador_por_unidad = _denominador_por_unidad(anio_poblacion, mapeo.reporte.denominador, mapeo.reporte.operacion.denominador)
    formula_resultado = mapeo.reporte.operacion.resultado

    bloque_corte: dict[str, UnidadDatos] = {}
    total_num = total_den = 0

    for unidad, numerador in numerador_acumulado.items():
        denominador = denominador_por_unidad.get(unidad)
        if not denominador:
            continue  # sin PAMF -- no entra a la tasa por unidad (solo al TOTAL_OOAD)

        total_num += numerador
        total_den += denominador
        contexto = {**_CONTEXTO_PERMITIDO, "numerador": numerador, "denominador": denominador}
        resultado = eval(formula_resultado, {"__builtins__": None}, contexto)

        # UnidadDatos.resultado usa alias "%" sin populate_by_name -- hay que
        # construirlo con el alias, si no el valor se descarta silenciosamente.
        bloque_corte[unidad] = UnidadDatos(**{"numerador": numerador, "denominador": denominador, "%": resultado, "desempeno": "Gris"})

    if total_den:
        contexto_total = {**_CONTEXTO_PERMITIDO, "numerador": total_num, "denominador": total_den}
        resultado_total = eval(formula_resultado, {"__builtins__": None}, contexto_total)
        bloque_corte["TOTAL_OOAD"] = UnidadDatos(**{"numerador": total_num, "denominador": total_den, "%": resultado_total, "desempeno": "Gris"})

    bloque_semaforizado = SemaforizarReporte(bloque_corte, indicador, mes=mes_nombre)

    # El corte se guarda en CORTES.MESES, no en MESES -- ver guardar_numerador_mes.
    # En un indicador "Semestral Anualizado" como este, CORTES.MESES solo tiene
    # (a lo mas) las llaves "Junio" y "Diciembre", nunca los otros 10 meses.
    reporte_anio_corte = reportes_cache[anio]
    reporte_anio_corte.setdefault("CORTES", {}).setdefault("MESES", {})[mes_nombre] = {
        unidad: dato.model_dump(by_alias=True) for unidad, dato in bloque_semaforizado.items()
    }
    guardar_reporte(indicador, anio, reporte_anio_corte)

    return reporte_anio_corte["CORTES"]["MESES"][mes_nombre]


def _ventanas_de_mes(mes_nombre: str, anio: int) -> list[tuple[str, int]]:
    """
    Los cortes (mes_corte, anio_corte) cuya ventana de 12 meses "Semestral
    Anualizado" incluye a mes_nombre/anio -- Diciembre(anio) siempre, y
    Junio(anio) o Junio(anio+1) segun si mes_nombre cae en Ene-Jun o Jul-Dic.
    Sirve para saber que cortes hay que revisar si se corrige este mes.
    """
    anio_junio = anio if MESES_ESTANDAR.index(mes_nombre) < 6 else anio + 1
    return [("Junio", anio_junio), ("Diciembre", anio)]


def estado_ventanas(anio_referencia: int, indicadores: list[str] | None = None) -> dict:
    """
    Para los cortes de Junio y Diciembre del anio de referencia (y el Junio
    siguiente, para ver que sigue despues), reporta cuantos de los 12 meses
    de cada ventana ya estan subidos -- pensado para que el front muestre
    "llevas 8 de 12 meses para el corte de Diciembre 2026".

    Un mes cuenta como "subido" solo si YA esta guardado para TODOS los
    indicadores de la lista (por default, todos los de INDICADORES_EXTRACTOR)
    -- una sola subida alimenta a todos a la vez, asi que deberian ir siempre
    parejos, pero se valida por si uno fallo y el otro no.

    Solo se incluye una ventana si la ventana anterior (6 meses antes) ya
    genero su corte -- la primera de la lista (Junio del anio de referencia)
    siempre se incluye. Asi no aparece, por ejemplo, "Junio 2027" mientras
    todavia no se cierra el corte de Diciembre 2026 -- no tiene caso mostrar
    una ventana en 0/12 cuando ni siquiera empezo su turno.
    """
    indicadores = indicadores or INDICADORES_EXTRACTOR
    cache: dict[tuple[str, int], dict] = {}
    resultado = {}
    anterior_generado = True

    for mes_corte, anio_corte in [("Junio", anio_referencia), ("Diciembre", anio_referencia), ("Junio", anio_referencia + 1)]:
        if not anterior_generado:
            break

        ventana = ventana_corte(mes_corte, anio_corte)
        detalle = []
        subidos = 0

        for mes, anio_mes in ventana:
            presente_en_todos = True
            for indicador in indicadores:
                clave_cache = (indicador, anio_mes)
                if clave_cache not in cache:
                    cache[clave_cache] = leer_reporte(indicador, anio_mes)
                if cache[clave_cache]["MESES"].get(mes) is None:
                    presente_en_todos = False
            if presente_en_todos:
                subidos += 1
            detalle.append({"mes": mes, "anio": anio_mes, "subido": presente_en_todos})

        clave = f"{mes_corte} {anio_corte}"
        ya_generado = all(
            "TOTAL_OOAD" in (cache[(indicador, anio_corte)].get("CORTES", {}).get("MESES", {}).get(mes_corte) or {})
            for indicador in indicadores
        )
        resultado[clave] = {
            "mesCorte": mes_corte,
            "anioCorte": anio_corte,
            "mesesSubidos": subidos,
            "mesesTotales": 12,
            "completo": subidos == 12,
            "corteYaGenerado": ya_generado,
            "detalle": detalle,
        }
        anterior_generado = ya_generado

    return resultado
