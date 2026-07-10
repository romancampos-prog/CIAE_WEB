"""
Aplica semáforo (Verde/Amarillo/Rojo/Gris) a cada unidad según los umbrales del indicador.
Usado en: ftp/services/reporte_final.py, reporte_categoria.py
"""


def Semaforizado(diccionarioPrevio, indicadorSemaforo, mes):
    meses_nombre = {
        "01": "Enero",   "02": "Febrero",   "03": "Marzo",    "04": "Abril",
        "05": "Mayo",    "06": "Junio",     "07": "Julio",    "08": "Agosto",
        "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
    }

    nombre_mes = meses_nombre.get(mes)
    metas = indicadorSemaforo.get(nombre_mes, indicadorSemaforo) if nombre_mes in indicadorSemaforo else indicadorSemaforo

    for unidad, datos in diccionarioPrevio.items():
        resultado = datos.get("resultado")

        if resultado is None:
            datos["color"] = "Gris"
            continue

        color = "Gris"

        if "Bajo" in metas and "Esperado" in metas:
            if resultado >= metas["Esperado"]:
                color = "Verde"
            elif resultado <= metas["Bajo"]:
                color = "Rojo"
            else:
                color = "Amarillo"
        elif "Alto" in metas and "Esperado" in metas:
            if resultado <= metas["Esperado"]:
                color = "Verde"
            elif resultado >= metas["Alto"]:
                color = "Rojo"
            else:
                color = "Amarillo"

        datos["color"] = color

    return diccionarioPrevio
