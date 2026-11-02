"""
Procesar un mes de un indicador de corte (EH 03, DM 04): conteo del SUI-13 por mes de ingreso,
guardarlo y generar o recalcular los cortes que lo incluyen.
Usado en: services/extractor/subir_archivo_extractor_Services.py
"""
from datos.bd_ciae.extractor_Datos import guardar_numerador_mes, guardar_parte_mes
from datos.excel_subido.lector_excel_Datos import LectorExcel
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.extractor.conteo_por_unidad_Services import FUERA_DE_UNIDADES, contar_por_unidad_y_mes_de_fecha
from services.extractor.corte_semestral_Services import intentar_generar_corte
from shared.MESES import MESES_ESTANDAR


def _total_del_archivo(conteo_por_mes_de_ingreso: dict[str, dict[str, int]]) -> dict[str, int]:
    """Los casos del archivo por unidad, sin importar el mes de ingreso (el numerador crudo de MESES)."""
    total: dict[str, int] = {}

    for por_unidad in conteo_por_mes_de_ingreso.values():
        for unidad, cantidad in por_unidad.items():
            if unidad != FUERA_DE_UNIDADES:
                total[unidad] = total.get(unidad, 0) + cantidad

    return total


##--------------------------------------

def procesar_corte(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str, lector: LectorExcel) -> dict:
    """
    Indicador por corte: cada caso del SUI-13 se guarda en el mes de su fecha de ingreso
    (EXTRACTOR_PARTES), porque el corte solo suma los ingresos que caen dentro de su ventana.
    MESES guarda el total del archivo, que marca el mes como subido.
    """

    # 1. Conteo del archivo por mes de ingreso
    conteo = contar_por_unidad_y_mes_de_fecha(lector, mapeo.reporte.numerador.model_dump(), anio, mes_nombre)
    guardar_parte_mes(indicador, anio, mes_nombre, "numerador", conteo)

    numerador_del_archivo = _total_del_archivo(conteo)
    guardar_numerador_mes(indicador, anio, mes_nombre, numerador_del_archivo)

    # 2. El corte de este mes (si es Junio/Diciembre) y los que ya estaban cerrados y lo incluyen
    # (ej. se corrige Marzo despues de generar Junio): su Junio (de este año o del siguiente) y
    # su Diciembre. Si la ventana de un corte no esta completa, no hace nada.
    corte = intentar_generar_corte(indicador, anio, mes_nombre)
    anio_junio = anio if MESES_ESTANDAR.index(mes_nombre) < 6 else anio + 1
    cortes_recalculados = []

    for mes_corte, anio_corte in [("Junio", anio_junio), ("Diciembre", anio)]:
        if (mes_corte, anio_corte) == (mes_nombre, anio):
            continue   # ese ya se intento arriba
        if intentar_generar_corte(indicador, anio_corte, mes_corte) is not None:
            cortes_recalculados.append(f"{mes_corte} {anio_corte}")

    # 3. Resultado
    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "corte",
        "numerador_por_unidad": numerador_del_archivo,
        "corte_generado": corte is not None,
        "corte": corte,
        "cortes_recalculados": cortes_recalculados,
    }
