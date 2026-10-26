"""
Consulta tipada de lo guardado en BD_CIAE para las graficas y el Excel: el reporte del año
(con sus cortes del Extractor) y el semanal de FTP.
Usado en: services/grafica/*, services/excel/leer_hoja_excel_Services.py
"""
from datos.bd_ciae.archivos_bd_ciae_Datos import leer_json_para_actualizar, ruta_definitivo
from datos.bd_ciae.semanal_Datos import leer_semanal_indicador
from schemas.model.reporte_guardado_Model import MesReporte, ReporteIndicador, ReportePrevio
from services.extractor.catalogo_extractor_Services import indicadores_extractor_de_corte


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

    datos = leer_json_para_actualizar(ruta, {})

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
