"""
Un mes de un indicador anualizado con el Censo DM de denominador (DM 05): el numerador son los
casos con fecha de ingreso dentro de los 12 meses de la ventana, sacados de los SUI-13 de esos
mismos 12 meses; el denominador es el censo que le toca al mes (no se suma por mes).
Usado en: services/extractor/generar_anualizado_censo_Services.py, services/censo_dm/recalcular_censo_dm_Services.py
"""
from schemas.model.mapeo_extractor_Model import IndicadorExtractorMapeo
from services.censo_dm.denominador_censo_dm_Services import anio_del_censo, denominador_de_censo_dm, texto_censo_usado
from services.extractor.conteo_por_unidad_Services import FUERA_DE_UNIDADES
from services.extractor.generar_mensual_Services import calcular_y_guardar_mes
from shared.MESES import MESES_ESTANDAR, mes_desplazado


def _clave_mes(mes_nombre: str, anio: int) -> str:
    """Como se guardan los meses de ingreso en las partes: "AAAA-MM"."""
    return f"{anio}-{MESES_ESTANDAR.index(mes_nombre) + 1:02d}"


##--------------------------------------

def generar_mes_anualizado_censo(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                                  partes_por_anio: dict[int, dict]) -> tuple[dict | None, str | None]:
    """
    Genera y guarda el mes si ya estan los SUI-13 de sus 12 meses y el censo que le toca.
    partes_por_anio: {año: EXTRACTOR_PARTES de ese año}, al menos el año del mes y el anterior.
    Regresa (resultado, None) o (None, lo que falta, ej. "falta subir el Censo DM 2025.").
    """

    # 1. Los 12 SUI-13 de la ventana
    ventana = [mes_desplazado(mes_nombre, anio, -k) for k in range(11, -1, -1)]
    faltan = [f"{mes} {anio_mes}" for mes, anio_mes in ventana
              if "numerador" not in partes_por_anio.get(anio_mes, {}).get(mes, {})]

    if faltan:
        return None, f"{'falta 1' if len(faltan) == 1 else f'faltan {len(faltan)}'} de sus 12 meses del SUI-13: {', '.join(faltan)}."

    # 2. El censo del mes
    anio_censo = anio_del_censo(anio, mes_nombre)
    denominador = denominador_de_censo_dm(mapeo.reporte.denominador.gruposEdad, anio_censo)

    if denominador is None:
        return None, f"falta subir el Censo DM {anio_censo}."

    # 3. Numerador: de cada SUI-13 de la ventana, solo los ingresos que caen dentro de la ventana
    meses_de_la_ventana = {_clave_mes(mes, anio_mes) for mes, anio_mes in ventana}
    numerador: dict[str, int] = {}

    for mes, anio_mes in ventana:
        for mes_ingreso, por_unidad in partes_por_anio[anio_mes][mes]["numerador"].items():
            if mes_ingreso not in meses_de_la_ventana:
                continue
            for unidad, cantidad in por_unidad.items():
                numerador[unidad] = numerador.get(unidad, 0) + cantidad

    fuera_de_unidades = numerador.pop(FUERA_DE_UNIDADES, 0)

    # 4. Calculo, semaforo y guardado
    resultado = calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, numerador, denominador,
                                       fuera_de_unidades, texto_censo_usado(anio_censo))
    return resultado, None
