"""
Aplica semáforo (Esperado/Medio/Bajo/Gris) a cada unidad según los umbrales del indicador.
Usado en: ftp/services/reporte_final.py, reporte_categoria.py
"""
from shared.MESES import MESES_ESTANDAR
from shared.semaforo_service import evaluar_color, umbrales_para


def Semaforizado(diccionarioPrevio, indicadorSemaforo, mes):
    nombre_mes = MESES_ESTANDAR[int(mes) - 1] if mes else None
    metas      = umbrales_para(indicadorSemaforo, nombre_mes)

    for unidad, datos in diccionarioPrevio.items():
        resultado = datos.get("resultado")

        if resultado is None:
            datos["color"] = "Gris"
            continue

        datos["color"] = evaluar_color(resultado, metas)

    return diccionarioPrevio
