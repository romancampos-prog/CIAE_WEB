"""
Lo que pide la pagina de Generar FTP: los indicadores (con los reportes SIAIS que lee cada
uno) y los meses que ya estan generados.
Usado en: Controller/ftp_Controller.py
"""
from compartido.ftp_imss.catalogo_reportes_ftp_Datos import codigo_base
from datos.bd_ciae.historico_indicador_Datos import meses_con_datos
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_ftp
from schemas.model.mapeo_ftp_Model import FuenteArchivosFTP
from schemas.model.pagina_generar_Model import IndicadorGenerarFTP
from services.informacion.lista_indicadores_Services import indicadores_del_modulo


def indicadores_para_generar() -> list[IndicadorGenerarFTP]:
    """Lo comun del mapeo de cada indicador de FTP mas los reportes SIAIS que lee."""
    lista = []

    for base in indicadores_del_modulo("ftp"):
        reporte = cargar_indicador_ftp(base.indicador).reporte
        # "CP03_A"/"CP03_B" son dos hojas del mismo reporte: se lista una vez como "CP03".
        reportes = []

        for fuente in (reporte.numerador, reporte.denominador):
            if not isinstance(fuente, FuenteArchivosFTP):
                continue

            for codigo in fuente.archivo:
                if codigo_base(codigo) not in reportes:
                    reportes.append(codigo_base(codigo))

        lista.append(IndicadorGenerarFTP(**base.model_dump(), reportes=reportes))

    return lista


##--------------------------------------

def meses_generados_ftp(indicador: str, ano: str) -> list[str]:
    """Meses definitivos ya guardados del indicador ("01".."12"), para marcarlos en la pagina."""
    return meses_con_datos(indicador, ano)
