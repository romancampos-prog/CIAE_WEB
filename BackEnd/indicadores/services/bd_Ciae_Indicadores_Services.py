"""
Consulta tipada de lo guardado en BD_CIAE para las graficas y el Excel: el reporte del año
(con sus cortes del Extractor), el semanal de FTP y la grafica completa de un indicador.
Usado en: Controller/reportes_Controller.py, services/excel_Services.py
"""
import json

from schemas.model.indicador_Model import MesReporte, ReporteIndicador, ReportePrevio
from services.bd_Ciae_Guardado_Services import leer_semanal_indicador, ruta_definitivo
from services.calculo_indicador_Services import acumula_sumando_meses, calcular_mensual_acumulado
from services.estadisticas_grafica_Services import estadisticas_de_reporte, perfil_de_indicador
from services.extractor.corte_extractor_Services import indicadores_extractor_de_corte
from services.indicadorMapeo_Services import obtener_ficha_indicador, bloque_mapeo
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import nombre_canonico_iaas


def normalizar_meses(bloque_meses: dict, envuelto: bool = True) -> dict:
    """
    {mes: {"Poblacion", "Reporte": {unidad: datos}}} con el semaforo siempre como "desempeno"
    (algunos meses viejos de FTP lo guardaron como "color"). envuelto=False es el MESES crudo
    del Extractor de corte, que se guarda plano ({mes: {unidad: datos}}): se envuelve aqui,
    solo en memoria.
    """
    return {
        mes: {
            "Poblacion": contenido.get("Poblacion") if envuelto else None,
            "Reporte": {
                unidad: (
                    {**vals, "desempeno": vals["color"]}
                    if isinstance(vals, dict) and "color" in vals and "desempeno" not in vals
                    else vals
                )
                for unidad, vals in (contenido.get("Reporte", {}) if envuelto else contenido).items()
            },
        }
        for mes, contenido in bloque_meses.items()
    }


##--------------------------------------

def cargar_reporte_indicador(indicador: str, ano: str) -> tuple[ReporteIndicador, dict[str, MesReporte]] | None:
    """
    (reporte, cortes) de un indicador/año, o None si no existe. cortes es CORTES.MESES ya
    tipado (solo el Extractor de corte lo trae; en los demas queda {}).
    """
    ruta = ruta_definitivo(indicador, ano)
    if not ruta.exists():
        return None
    with open(ruta, "r", encoding="utf-8") as archivo:
        datos = json.load(archivo)

    datos["MESES"] = normalizar_meses(datos.get("MESES", {}), envuelto=datos.get("INDICADOR") not in indicadores_extractor_de_corte())
    reporte = ReporteIndicador.model_validate(datos)
    if reporte.INDICADOR != indicador:
        return None
    cortes_guardados = normalizar_meses(datos.get("CORTES", {}).get("MESES", {}))
    cortes = {mes: MesReporte.model_validate(contenido) for mes, contenido in cortes_guardados.items()}
    return reporte, cortes


##--------------------------------------

def cargar_semanal(indicador: str, ano: str) -> ReportePrevio | None:
    """El semanal (previo) de FTP del año, o None si no hay ningun mes semanal guardado."""
    crudo = leer_semanal_indicador(indicador, ano)
    if not crudo.get("MES"):
        return None
    crudo["MES"] = normalizar_meses(crudo["MES"])
    return ReportePrevio.model_validate(crudo)


##--------------------------------------

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


##--------------------------------------

def consultar_grafica_indicador(indicador: str, ano: str) -> dict | None:
    """
    Ficha + reporte + estadisticas + perfil de un indicador para las graficas. El modulo sale del
    mapeo (la carpeta del indicador), no de lo que mande el front. None si no existe en el mapeo.
    """
    # 1. Leer el mapeo y el reporte guardado del año
    bloque = bloque_mapeo(indicador)
    if bloque is None:
        return None
    modulo = bloque["modulo"]
    cargado = cargar_reporte_indicador(indicador, ano)
    reporte = cargado[0] if cargado else None

    if reporte is not None:
        # 2. IAAS: el dato guardado a veces trae el alias HGSZ de una unidad HGS -- se unifica al
        #    nombre del catalogo para que la unidad no aparezca duplicada ni "sin datos".
        if modulo == "iaas":
            reporte.MESES = {
                mes: MesReporte(Poblacion=contenido.Poblacion, Reporte={nombre_canonico_iaas(u): d for u, d in contenido.Reporte.items()})
                for mes, contenido in reporte.MESES.items()
            }

        # 3. FTP: el semanal se muestra si es del mes siguiente al ultimo definitivo
        semanal = cargar_semanal(indicador, ano) if modulo == "ftp" else None
        if semanal:
            ultimo_mes = MESES_ESTANDAR.index(list(reporte.MESES)[-1]) + 1
            mes_semanal = MESES_ESTANDAR.index(list(semanal.MES)[-1]) + 1
            if ultimo_mes + 2 > mes_semanal > ultimo_mes:
                reporte.SEMANA = semanal

        # 4. Mensual + mensual acumulado en el mapeo: el acumulado se arma sumando meses
        if acumula_sumando_meses(indicador):
            reporte.MENSUAL_ACUMULADO = calcular_mensual_acumulado(reporte.MESES, indicador) or None

        # 5. Extractor de corte: MESES trae el numerador crudo; la grafica muestra solo el
        #    ultimo corte cerrado (CORTES.MESES), el ultimo resultado oficial.
        elif modulo == "extractor" and indicador in indicadores_extractor_de_corte():
            cortes = cargado[1]
            ultimo_corte = max(cortes, key=MESES_ESTANDAR.index) if cortes else None
            reporte.MESES = {ultimo_corte: cortes[ultimo_corte]} if ultimo_corte else {}

    # 6. Perfil: lo que la grafica necesita saber del indicador (meta, niveles, unidad de medida...)
    unidades = []
    for contenido in (reporte.MESES.values() if reporte else []):
        unidades += [u for u in contenido.Reporte if u not in unidades]
    perfil = perfil_de_indicador(bloque, unidades)
    if modulo == "extractor" and indicador in indicadores_extractor_de_corte():
        perfil["serieCortes"] = serie_de_cortes(indicador, ano)

    # 7. Juntar ficha, reporte, estadisticas y perfil
    return {
        "ficha": obtener_ficha_indicador(indicador),
        "reporte": reporte,
        "estadisticas": estadisticas_de_reporte(reporte, bloque),
        "perfil": perfil,
    }
