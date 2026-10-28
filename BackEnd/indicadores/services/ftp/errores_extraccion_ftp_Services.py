"""
Como se registra una unidad/ruta afectada en el log de errores de la extraccion de FTP (las
"restricciones" que el front muestra). El catalogo de errores vive en compartido/ftp_imss/
catalogo_errores_ftp.py (lo usa tambien epidemiologia).
Usado en: services/ftp/extraer_*_Services.py
"""
from schemas.model.generacion_ftp_Model import LogErrores, RutaAfectada


def registrar_error(log: LogErrores, id_error: str, unidad: str, reporte: str, ruta_afectada: str) -> None:
    rutas_de_la_unidad = log[id_error].unidades.setdefault(unidad, [])
    existente = next((r for r in rutas_de_la_unidad if r.ruta == ruta_afectada), None)

    if existente is None:
        rutas_de_la_unidad.append(RutaAfectada(reportes=[reporte], ruta=ruta_afectada))
    elif reporte not in existente.reportes:
        existente.reportes.append(reporte)
