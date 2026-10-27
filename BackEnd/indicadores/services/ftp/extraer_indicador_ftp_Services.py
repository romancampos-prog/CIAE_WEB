"""
Extraccion de los datos de un indicador de FTP: agrupa lo que pide el mapeo por reporte, lo lee
en las carpetas de las 46 unidades y, si el denominador sale de la poblacion, lo lee de
POBLACION_{año}.json. No calcula nada: entrega lo leido y las restricciones (errores por
unidad y ruta).
Usado en: services/ftp/generar_indicador_ftp_Services.py
"""
from typing import Any

from ftp_imss.catalogo_reportes_ftp_Datos import codigo_base
from ftp_imss.conexion_ftp_Datos import conectar_ftp, desconectar_ftp
from schemas.model.generacion_ftp_Model import ErrorExtraccion, LogErrores
from schemas.model.mapeo_comun_Model import FuentePoblacionInfoSalud
from schemas.model.mapeo_ftp_Model import FuenteArchivosFTP, IndicadorFTPMapeo
from schemas.model.unidad_resultado_Model import DatosExtraidosUnidad
from services.ftp.errores_extraccion_ftp_Services import CATALOGO_ERRORES_FTP, registrar_error
from services.ftp.extraer_reporte_ftp_Services import extraer_reporte_de_unidades
from services.poblacion.denominador_poblacion_Services import extraer_poblacion
from shared.UNIDADES import NOMBREUNIDADESARCHIVO


def extraer_indicador(indicador: str, ano: str, mes: str, semana: int | None, mapeo: IndicadorFTPMapeo) -> tuple[dict[str, DatosExtraidosUnidad], LogErrores]:
    """Regresa (lo leido por unidad, errores encontrados)."""

    reporte   = mapeo.reporte
    extraidos = {unidad: DatosExtraidosUnidad() for unidad in NOMBREUNIDADESARCHIVO}
    log       = {id_error: ErrorExtraccion(nombreError=nombre, descripcionError=descripcion)
                 for id_error, (nombre, descripcion) in CATALOGO_ERRORES_FTP.items()}

    # 1. Agrupar lo que se lee por reporte real: "IN33_MF"/"IN33_40" (DM 03) son dos HOJAS del
    #    MISMO archivo (el sufijo solo distingue la fuente en la formula), asi se baja una sola
    #    vez. La llave "lado::codigo" se desempaca al final para que cada codigo siga siendo su fuente.
    detalles_por_prefijo: dict[str, dict[str, dict[str, Any]]] = {}

    for lado, fuente in (("numerador", reporte.numerador), ("denominador", reporte.denominador)):
        if isinstance(fuente, FuenteArchivosFTP):
            for codigo, detalle in fuente.archivo.items():
                detalles_por_prefijo.setdefault(codigo_base(codigo), {})[f"{lado}::{codigo}"] = detalle

    # 2. Leer cada reporte en las carpetas de las unidades
    if detalles_por_prefijo:
        ftp = conectar_ftp()
        if not ftp:
            return extraidos, {"CONEXION": ErrorExtraccion(nombreError="Error FTP", descripcionError="Fallo de conexión")}

        try:
            for prefijo, detalles in detalles_por_prefijo.items():
                valores_por_unidad = extraer_reporte_de_unidades(
                    ftp, prefijo, ano, mes, semana, detalles, mapeo.marcadores_por_mes(),
                    mapeo.unidadesSinServicio or [], log,
                )

                for unidad, valores_por_llave in valores_por_unidad.items():
                    for llave in detalles:
                        lado, codigo = llave.split("::", 1)
                        valores = valores_por_llave[llave] if valores_por_llave else None

                        if lado == "numerador":
                            extraidos[unidad].numerador[codigo] = valores
                        else:
                            extraidos[unidad].denominador[codigo] = valores
        finally:
            desconectar_ftp(ftp)

    # 3. Denominador de poblacion, si el mapeo lo pide
    if isinstance(reporte.denominador, FuentePoblacionInfoSalud):
        for unidad, grupo, mensaje in extraer_poblacion(reporte.denominador.sexo, ano, extraidos):
            registrar_error(log, "PB_JSON_ERROR", unidad, grupo, mensaje)

    # 4. Solo los tipos de error que tuvieron alguna unidad afectada
    return extraidos, {id_error: error for id_error, error in log.items() if error.unidades}
