"""
Procesar un mes de un indicador de corte: numerador crudo del mes (via 1 + via 2 si ya vino el
Egresos), guardarlo y generar o recalcular los cortes que lo incluyen.
Usado en: services/extractor/subir_archivo_extractor_Services.py, services/extractor/completar_cruce_Services.py
"""
from datos.bd_ciae.extractor_cruce_Datos import guardar_pendiente_cruce
from datos.bd_ciae.extractor_reporte_Datos import guardar_numerador_mes
from datos.excel_subido.lector_excel_Datos import LectorExcel
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.extractor.catalogo_extractor_Services import configuracion_cruce
from services.extractor.conteo_con_cruce_Services import contar_filtro_conteo_acumulado, validar_candidatos_cruce
from services.extractor.corte_semestral_Services import intentar_generar_corte
from shared.MESES import MESES_ESTANDAR


def sumar_validados(via1: dict, candidatos: list[dict], lector_cruce: LectorExcel, cruce_cfg: dict) -> tuple[dict, int]:
    """Via 1 + los candidatos que el archivo de cruce confirma (via 2). Regresa (conteo, cuantos se validaron)."""
    conteo = dict(via1)
    validados = validar_candidatos_cruce(candidatos, lector_cruce, cruce_cfg) if candidatos else {}

    for unidad, cantidad in validados.items():
        conteo[unidad] = conteo.get(unidad, 0) + cantidad

    return conteo, sum(validados.values())


##--------------------------------------

def guardar_mes_de_corte(indicador: str, anio: int, mes_nombre: str, conteo: dict, candidatos: int, validados: int,
                          cruce_aplicado: bool | None) -> dict:
    """Guarda el numerador crudo del mes, genera/recalcula los cortes que lo incluyen y arma el resultado del indicador."""

    guardar_numerador_mes(indicador, anio, mes_nombre, conteo, cruce_aplicado=cruce_aplicado)
    corte = intentar_generar_corte(indicador, anio, mes_nombre)

    # Si este mes ya pertenece a otro corte que YA estaba cerrado (ej. se corrige Marzo despues
    # de generar Junio) se recalcula tambien; si la ventana de ese corte no esta completa, no
    # hace nada. Los cortes que incluyen al mes: su Junio (de este año o del siguiente) y su Diciembre.
    anio_junio = anio if MESES_ESTANDAR.index(mes_nombre) < 6 else anio + 1
    cortes_recalculados = []

    for mes_corte, anio_corte in [("Junio", anio_junio), ("Diciembre", anio)]:
        if (mes_corte, anio_corte) == (mes_nombre, anio):
            continue   # ese ya se intento arriba
        if intentar_generar_corte(indicador, anio_corte, mes_corte) is not None:
            cortes_recalculados.append(f"{mes_corte} {anio_corte}")

    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "corte",
        "numerador_por_unidad": conteo,
        "candidatos_via2": candidatos,
        "validados_via2": validados,
        "cruce_pendiente": cruce_aplicado is False,
        "corte_generado": corte is not None,
        "corte": corte,
        "cortes_recalculados": cortes_recalculados,
    }


##--------------------------------------

def procesar_corte(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                    lector: LectorExcel, lector_cruce: LectorExcel | None) -> dict:
    """
    Indicador por corte: numerador crudo del mes y, si aplica, el corte. Si usa cruce, deja
    guardados via 1 + candidatos para que el Egresos se pueda subir despues; si el Egresos
    vino junto, el cruce se hace de una vez.
    """

    via1, candidatos = contar_filtro_conteo_acumulado(lector, mapeo.reporte.numerador.model_dump(), anio, mes_nombre)

    cruce_cfg = configuracion_cruce(mapeo)
    conteo, validados = via1, 0

    if cruce_cfg:
        guardar_pendiente_cruce(indicador, anio, mes_nombre, via1, candidatos)
        if lector_cruce is not None:
            conteo, validados = sumar_validados(via1, candidatos, lector_cruce, cruce_cfg)

    cruce_aplicado = (lector_cruce is not None) if cruce_cfg else None

    return guardar_mes_de_corte(indicador, anio, mes_nombre, conteo, len(candidatos), validados, cruce_aplicado)
