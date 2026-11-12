"""
Los errores de una extraccion agrupados por tipo con la MISMA forma que las "restricciones" de
indicadores FTP, para que el front los pinte con el mismo modal (ModalRestricciones):
{tipo: {nombreError, descripcionError, unidades: {unidad: [{reportes, ruta}]}}}.
Usado en: services/ftp/consulta_extraccion_Services.py
"""
from compartido.ftp_imss.catalogo_errores_ftp import CATALOGO_ERRORES_FTP


def errores_por_tipo(errores: list[dict]) -> dict[str, dict]:
    """
    @param errores - [{tipo, unidad, reporte, detalle}] tal cual se guardaron
    @returns {tipo: {nombreError, descripcionError, unidades: {unidad: [{reportes, ruta}]}}}, el tipo con mas unidades primero
    """

    grupos: dict[str, dict] = {}

    for error in errores:
        tipo = error["tipo"]
        nombre, descripcion = CATALOGO_ERRORES_FTP.get(tipo, (tipo, ""))
        grupo = grupos.setdefault(tipo, {"nombreError": nombre, "descripcionError": descripcion, "unidades": {}})
        grupo["unidades"].setdefault(error["unidad"], []).append({"reportes": [error["reporte"]], "ruta": error["detalle"]})

    return dict(sorted(grupos.items(), key=lambda par: -len(par[1]["unidades"])))
