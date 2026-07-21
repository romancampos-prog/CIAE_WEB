"""
Caché en memoria para resultados de gráficas (por indicador/año): guarda el
resultado ya calculado junto con la fecha de modificación de los archivos de
los que depende, y solo recalcula si alguno de esos archivos cambió desde la
última vez. La invalidación es automática — nunca hay que acordarse de
"limpiar" el caché en el lugar donde se escriben los datos.
Usado en: iaas/services/grafica_service.py, ftp/services/grafica_service.py
"""
from pathlib import Path


def obtener_o_calcular(cache: dict, clave, archivos: list[Path], calcular_fn):
    """
    cache:       dict donde vive el caché (uno por módulo, ej. _CACHE_IAAS).
    clave:       identifica de forma única el resultado (ej. ("IAAS 01", "2026")).
    archivos:    Path de los archivos de los que depende el resultado.
    calcular_fn: función sin argumentos que recalcula el resultado si hace falta.
    """
    mtimes_actuales = [f.stat().st_mtime for f in archivos if f.exists()]

    entrada = cache.get(clave)
    if entrada is not None and entrada["mtimes"] == mtimes_actuales:
        return entrada["datos"]

    datos = calcular_fn()
    cache[clave] = {"mtimes": mtimes_actuales, "datos": datos}
    return datos