"""
Cuantos de los 12 meses de cada corte (Junio, Diciembre y el Junio siguiente) ya estan subidos,
para que el front muestre "llevas 8 de 12 meses para el corte de Diciembre".
Usado en: Controller/extractor_Controller.py
"""
from datos.bd_ciae.extractor_reporte_Datos import leer_reporte_extractor
from services.extractor.catalogo_extractor_Services import indicadores_extractor_de_corte
from services.extractor.corte_semestral_Services import ventana_corte


def estado_ventanas(anio_referencia: int) -> dict:
    """
    Para los cortes de Junio y Diciembre del anio de referencia (y el Junio
    siguiente, para ver que sigue despues), reporta cuantos de los 12 meses
    de cada ventana ya estan subidos -- pensado para que el front muestre
    "llevas 8 de 12 meses para el corte de Diciembre 2026".

    Un mes cuenta como "subido" solo si YA esta guardado para TODOS los
    indicadores de la lista (por default, los de corte: indicadores_extractor_de_corte();
    los mensuales no tienen ventanas ni CORTES) -- una sola subida alimenta a todos
    a la vez, asi que deberian ir siempre parejos, pero se valida por si uno fallo y el otro no.

    Solo se incluye una ventana si la ventana anterior (6 meses antes) ya
    genero su corte -- la primera de la lista (Junio del anio de referencia)
    siempre se incluye. Asi no aparece, por ejemplo, "Junio 2027" mientras
    todavia no se cierra el corte de Diciembre 2026 -- no tiene caso mostrar
    una ventana en 0/12 cuando ni siquiera empezo su turno.
    """

    indicadores = indicadores_extractor_de_corte()
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
                    cache[clave_cache] = leer_reporte_extractor(indicador, anio_mes)
                if cache[clave_cache]["MESES"].get(mes) is None:
                    presente_en_todos = False

            if presente_en_todos:
                subidos += 1

            detalle.append({"mes": mes, "anio": anio_mes, "subido": presente_en_todos})

        clave = f"{mes_corte} {anio_corte}"
        ya_generado = all(
            "TOTAL_OOAD" in ((cache[(indicador, anio_corte)].get("CORTES", {}).get("MESES", {}).get(mes_corte) or {}).get("Reporte") or {})
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
