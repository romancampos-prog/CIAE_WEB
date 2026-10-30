"""
Estadisticas de la pagina de graficas, calculadas con el reporte ya guardado en BD_CIAE y las
reglas del mapeo (semaforo): el front solo las pinta.
  - resumenPorMes: ver services/grafica/resumen_por_mes_Services.py (tambien del mes del semanal
                   que aun no cierra, con parcial = True); resumenAcumuladoPorMes, lo mismo con el acumulado
  - mapaCalor:     resultado y semaforo de cada unidad en cada mes (tambien el del semanal)
Usado en: services/grafica/grafica_indicador_Services.py
"""
from schemas.model.reporte_guardado_Model import ReporteIndicador
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL as TOTAL
from services.grafica.resumen_por_mes_Services import resumen_por_mes
from shared.MESES import MESES_ESTANDAR


def estadisticas_de_reporte(reporte: ReporteIndicador | None, bloque: dict) -> dict | None:
    """Ver docstring del modulo. None si no hay reporte guardado."""

    if reporte is None or not reporte.MESES:
        return None

    semaforo = bloque.get("semaforo") or {}
    meses = [mes for mes in MESES_ESTANDAR if mes in reporte.MESES]
    acumulado = reporte.MENSUAL_ACUMULADO or {}

    # Los meses cerrados y, al final, el del semanal si todavia no cierra: sus datos parciales
    # tambien sirven (resumen y brecha), marcados como parciales.
    fuentes = [(mes, reporte.MESES[mes].Reporte, False) for mes in meses]
    if reporte.SEMANA:
        fuentes += [(mes, dato.Reporte, True) for mes, dato in reporte.SEMANA.MES.items() if mes not in reporte.MESES]

    # El resumen del dato del mes y el del acumulado (el front muestra el que diga su switch)
    resumen = resumen_por_mes(fuentes, semaforo)
    resumen_acumulado = resumen_por_mes(
        [(mes, acumulado[mes].Reporte, False) for mes in MESES_ESTANDAR if mes in acumulado], semaforo,
    ) if acumulado else None

    # El mapa tambien lleva el mes del semanal (parcial) al final, como el resto de la pagina
    por_mes = {mes: datos for mes, datos, _parcial in fuentes}
    meses_mapa = list(por_mes)
    filas = [u for u in por_mes[meses_mapa[-1]] if u != TOTAL]

    for mes in meses_mapa:
        filas += [u for u in por_mes[mes] if u != TOTAL and u not in filas]

    mapa_calor = {
        "meses": meses_mapa,
        "filas": [
            {"unidad": unidad, "valores": [
                {"resultado": d.resultado, "desempeno": d.desempeno} if (d := por_mes[mes].get(unidad)) else None
                for mes in meses_mapa
            ]}
            for unidad in filas
        ],
    }

    return {"resumenPorMes": resumen, "resumenAcumuladoPorMes": resumen_acumulado, "mapaCalor": mapa_calor}
