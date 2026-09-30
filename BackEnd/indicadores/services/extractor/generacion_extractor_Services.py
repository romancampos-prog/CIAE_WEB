"""
Orquestador del motor Extractor: procesa el Excel mensual subido para TODOS los
indicadores del extractor a la vez (EH 03, DM 04 por ahora -- ver
corte_extractor_Services.indicadores_extractor()), guarda el numerador crudo del
mes y dispara el corte semestral cuando aplica.
Usado en: Controller/extractor_Controller.py
"""
import io

from services.extractor.corte_extractor_Services import (
    indicadores_extractor, _ventanas_de_mes, intentar_generar_corte,
)
from services.extractor.extraccion_extractor_Services import (
    contar_filtro_conteo_acumulado, validar_candidatos_cruce,
)
from services.extractor.guardado_extractor_Services import guardar_numerador_mes
from services.indicadorMapeo_Services import cargar_indicador_extractor


def _procesar_archivo_mensual_indicador(indicador: str, anio: int, mes_nombre: str, contenido_excel, contenido_excel_cruce=None) -> dict:
    """Procesa el Excel del mes para UN indicador (ej. "EH 03"). Ver procesar_archivo_mensual()."""
    config_numerador = cargar_indicador_extractor(indicador).reporte.numerador.model_dump()

    conteo_por_unidad, candidatos_cruce = contar_filtro_conteo_acumulado(contenido_excel, config_numerador, anio=anio, mes_nombre=mes_nombre)

    cruce_cfg = config_numerador.get("cruce")
    validados = {}
    if cruce_cfg and cruce_cfg.get("activa") and contenido_excel_cruce is not None and candidatos_cruce:
        validados = validar_candidatos_cruce(candidatos_cruce, contenido_excel_cruce, cruce_cfg)
        for unidad, cantidad in validados.items():
            conteo_por_unidad[unidad] = conteo_por_unidad.get(unidad, 0) + cantidad

    guardar_numerador_mes(indicador, anio, mes_nombre, conteo_por_unidad)

    corte = intentar_generar_corte(indicador, anio, mes_nombre)

    # Si este mes ya pertenece a algun corte que YA estaba cerrado (ej. se
    # corrige Marzo despues de que el corte de Junio ya se genero), se
    # recalcula tambien -- intentar_generar_corte siempre relee los 12 meses
    # guardados y sobreescribe, asi que llamarlo de nuevo sobre un corte ya
    # cerrado simplemente lo actualiza con el dato corregido; si la ventana
    # de ese otro corte todavia no esta completa, no hace nada (regresa None).
    cortes_recalculados = []
    for mes_c, anio_c in _ventanas_de_mes(mes_nombre, anio):
        if (mes_c, anio_c) == (mes_nombre, anio):
            continue  # ese es el que ya se intento arriba
        if intentar_generar_corte(indicador, anio_c, mes_c) is not None:
            cortes_recalculados.append(f"{mes_c} {anio_c}")

    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "numerador_por_unidad": conteo_por_unidad,
        "candidatos_via2": len(candidatos_cruce),
        "validados_via2": sum(validados.values()) if validados else 0,
        "corte_generado": corte is not None,
        "corte": corte,
        "cortes_recalculados": cortes_recalculados,
    }


def procesar_archivo_mensual(anio: int, mes_nombre: str, contenido_bytes: bytes, contenido_cruce_bytes: bytes | None = None,
                              indicadores: list[str] | None = None) -> dict:
    """
    Punto de entrada del controller: un solo Excel del mes (+ su cruce) se
    procesa para TODOS los indicadores del extractor (EH 03 y DM 04 por
    ahora) -- cada uno con su propio filtro/codigos, del mismo archivo.
    """
    indicadores = indicadores or indicadores_extractor()
    resultados = {}
    for indicador in indicadores:
        excel = io.BytesIO(contenido_bytes)
        cruce = io.BytesIO(contenido_cruce_bytes) if contenido_cruce_bytes else None
        resultados[indicador] = _procesar_archivo_mensual_indicador(indicador, anio, mes_nombre, excel, cruce)
    return resultados
