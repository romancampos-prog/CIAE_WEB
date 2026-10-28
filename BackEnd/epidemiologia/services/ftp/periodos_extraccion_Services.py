"""
Los meses de un año que ya tienen extraccion guardada, para que la pantalla solo ofrezca esos:
si tienen definitivo y, si no, su ultima semana (previo).
Usado en: Controller/epiFTP.py
"""
from epidemiologia.datos.ftp.extracciones_ftp_Datos import periodos_guardados


def periodos_de_extraccion(ano: int, archivo: str) -> tuple[str, list[dict]]:

    #1- Juntar por mes lo que hay guardado
    por_mes: dict[str, dict] = {}

    for mes, semana in periodos_guardados(archivo, ano):
        periodo = por_mes.setdefault(mes, {"mes": int(mes), "definitivo": False, "ultimaSemana": None})

        if semana is None:
            periodo["definitivo"] = True
        else:
            periodo["ultimaSemana"] = max(semana, periodo["ultimaSemana"] or 0)

    #2- En orden de mes
    periodos = sorted(por_mes.values(), key=lambda p: p["mes"])

    return f"{archivo} {ano}: {len(periodos)} meses con extraccion.", periodos
