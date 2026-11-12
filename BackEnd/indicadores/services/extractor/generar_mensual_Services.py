"""
Indicador mensual del Extractor: con los conteos ya hechos calcula el resultado del mes, lo
semaforiza y lo guarda como FTP/IAAS; o arma la respuesta de "falta un archivo".
Usado en: services/extractor/generar_*_Services.py, services/extractor/subir_archivo_extractor_Services.py
"""
from datos.bd_ciae.guardar_mes_Datos import guardar_mes_definitivo
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.calculo.formulas_Services import evaluar_formula
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL, calcular_unidades
from services.semaforo.color_semaforo_Services import semaforizar_unidades
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import FUERA_DEL_TOTAL_OOAD


def calcular_y_guardar_mes(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                            numerador: dict, denominador: dict, numerador_solo_total: int = 0,
                            poblacion_usada: str | None = None) -> dict:
    """
    Indicador mensual: resultado y semaforo del mes con los conteos ya hechos, guardado como FTP/IAAS.
    numerador_solo_total: casos sin unidad que suman al TOTAL_OOAD (DM 05); poblacion_usada: con
    que censo/poblacion se calculo, para la leyenda del Excel.
    """

    # Si el mapeo arma el numerador con una formula (Neonatal 04: nacidos vivos - defunciones),
    # se aplica por unidad; 'numerador' y 'denominador' son los conteos de cada archivo.
    formula_numerador = mapeo.reporte.operacion.numerador.strip()

    if formula_numerador != "numerador":
        conteos = numerador
        numerador = {}
        for unidad in dict.fromkeys([*conteos, *denominador]):
            numerador[unidad] = evaluar_formula(formula_numerador, conteos.get(unidad, 0), denominador.get(unidad, 0))

    # El denominador puede no ser de un archivo (Censo DM): sin catalogo ni campos extra.
    fuente_denominador = mapeo.reporte.denominador
    resultados = calcular_unidades(
        numerador, denominador, mapeo.reporte.operacion.resultado,
        excluidas_del_total=FUERA_DEL_TOTAL_OOAD.get(getattr(fuente_denominador, "catalogoUnidades", None), []),
        cero_es_sin_dato=bool((fuente_denominador.model_extra or {}).get("ceroEsSinDato")),
        numerador_solo_total=numerador_solo_total,
    )
    mes_num = MESES_ESTANDAR.index(mes_nombre) + 1
    semaforizadas = semaforizar_unidades(resultados, mapeo.semaforo, mes=mes_num)
    guardar_mes_definitivo(indicador, str(anio), f"{mes_num:02d}", semaforizadas, poblacion_usada)

    total = semaforizadas[CLAVE_TOTAL]

    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "mensual",
        "numerador_por_unidad": numerador,
        "denominador_por_unidad": denominador,
        "total": {"numerador": total.numerador, "denominador": total.denominador, "%": total.resultado, "desempeno": total.color},
        "corte_generado": False,
        "cortes_recalculados": [],
    }


##--------------------------------------

def resultado_pendiente(indicador: str, anio: int, mes_nombre: str, partes_del_mes: dict, aviso: str) -> dict:
    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "mensual",
        "numerador_por_unidad": partes_del_mes.get("numerador", {}),
        "denominador_por_unidad": partes_del_mes.get("denominador", {}),
        "pendiente": aviso,
        "corte_generado": False,
        "cortes_recalculados": [],
    }
