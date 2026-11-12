"""
Los meses de un año que ya tienen extraccion guardada, para que la pantalla solo ofrezca esos:
si ya es definitivo o, si no, de que semana es el previo.
Usado en: Controller/epiFTP.py
"""
from epidemiologia.datos.ftp.extracciones_ftp_Datos import periodos_guardados


def periodos_de_extraccion(ano: int, archivo: str) -> tuple[str, list[dict]]:

    #1- Un archivo por mes: su "semana" dice si es definitivo (None) o de que semana es el previo
    periodos = [
        {"mes": int(mes), "definitivo": semana is None, "ultimaSemana": semana}
        for mes, semana in periodos_guardados(archivo, ano)
    ]

    #2- En orden de mes
    periodos.sort(key=lambda p: p["mes"])

    return f"{archivo} {ano}: {len(periodos)} meses con extraccion.", periodos
