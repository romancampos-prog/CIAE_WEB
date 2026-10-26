"""
Extractor de corte (EH 03, DM 04): los cortes cerrados y los casos crudos de cada mes, de este
año y del anterior, para la tendencia por cortes de la grafica.
Usado en: services/grafica/grafica_indicador_Services.py
"""
from services.compartido.reporte_guardado_Services import cargar_reporte_indicador
from shared.MESES import MESES_ESTANDAR


def serie_de_cortes(indicador: str, ano: str) -> dict:
    """
    Extractor de corte (EH 03, DM 04): los cortes cerrados de una unidad y los casos crudos de cada
    mes, de este año y del anterior (el corte de junio junta julio-diciembre del año pasado).
      cortes:      [{mes, anio, unidades: {unidad: {resultado, desempeno, numerador, denominador}}}]
      casosPorMes: [{mes, anio, enCurso, unidades: {unidad: numerador}}]; enCurso = cuenta para el
                   siguiente corte (va despues del ultimo corte cerrado)
    """
    cortes, casos = [], []

    for anio in (int(ano) - 1, int(ano)):
        cargado = cargar_reporte_indicador(indicador, str(anio))

        if cargado is None:
            continue

        reporte, cortes_del_anio = cargado

        for mes in sorted(cortes_del_anio, key=MESES_ESTANDAR.index):
            cortes.append({"mes": mes, "anio": anio, "unidades": {
                u: {"resultado": d.resultado, "desempeno": d.desempeno, "numerador": d.numerador, "denominador": d.denominador}
                for u, d in cortes_del_anio[mes].Reporte.items()
            }})

        for mes in sorted(reporte.MESES, key=MESES_ESTANDAR.index):
            casos.append({"mes": mes, "anio": anio, "unidades": {u: d.numerador for u, d in reporte.MESES[mes].Reporte.items()}})

    ultimo = (cortes[-1]["anio"], MESES_ESTANDAR.index(cortes[-1]["mes"])) if cortes else None

    for mes in casos:
        mes["enCurso"] = ultimo is None or (mes["anio"], MESES_ESTANDAR.index(mes["mes"])) > ultimo

    return {"cortes": cortes, "casosPorMes": casos}
