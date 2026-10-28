"""
Los reportes SIAIS dentro del FTP: las rutas de un reporte en una unidad (con las plantillas y los
nombres de carpeta de service/ftp_imss/catalogo_ftp.json), listar los reportes de la carpeta y elegir el del
periodo. Navegar y descargar esta en service/ftp_imss/navegacion_ftp_Datos.py.
Usado en: indicadores/services/ftp/extraer_reporte_ftp_Services.py (y epidemiologia)
"""
from ftplib import FTP

from service.ftp_imss.catalogo_reportes_ftp_Datos import CARPETAS, RUTAS, codigo_base, periodo_en_nombre, subcarpeta_de_reporte

_EXTENSIONES_EXCEL = (".XLS", ".XLSX")


def rutas_de_la_unidad(codigo_reporte: str, ano: str, mes: str, unidad: str, semana: int | None = None) -> list[str]:
    """
    Las rutas donde puede estar la carpeta del reporte en una unidad, una por cada nombre que esa
    carpeta tiene en el FTP (ej. en el semanal "Planificacion Familiar" va sin acento y en alguna
    semana "Validaciones" vino como "Validacione"). Piramides: una sola carpeta del año.
    """

    carpeta = CARPETAS[subcarpeta_de_reporte(codigo_reporte)]
    tipo_de_ruta = carpeta.get("ruta") or ("semanal" if semana is not None else "definitivo")
    plantilla = RUTAS[tipo_de_ruta]
    rutas = []

    for nombre_en_ftp in carpeta.get("nombresEnFtp") or [""]:
        ruta = plantilla.format(anio=ano, mes=mes, unidad=unidad, semana=semana, carpeta=nombre_en_ftp)
        if ruta not in rutas:
            rutas.append(ruta)

    return rutas


##--------------------------------------

def listar_reportes(ftp: FTP, codigo_reporte: str, clave_unidad: str | None = None) -> list[str]:
    """
    Excel de la carpeta actual cuyo nombre empieza con el codigo del reporte (ej. "CP03_algo" -> "CP03").
    clave_unidad: para carpetas con los archivos de todas las unidades juntos (piramides), donde el
    nombre es "{codigo}U{clave}..." y el resto del nombre no sigue ningun formato.
    """
    prefijo = codigo_base(codigo_reporte)

    if clave_unidad:
        prefijo = f"{prefijo}U{clave_unidad.upper()}"

    return [
        archivo for archivo in ftp.nlst()
        if archivo.upper().strip().startswith(prefijo) and archivo.upper().endswith(_EXTENSIONES_EXCEL)
    ]


##--------------------------------------

def elegir_archivo_del_periodo(archivos: list[str], ano: str, mes: str) -> str:
    """
    Si hay varios archivos del mismo reporte (ej. IN01U...052026062026 e IN01U...062026062026), el
    que trae en el nombre el periodo del mes (para junio, del 26 de mayo al 25 de junio); si
    ninguno lo trae, el primero que lista el servidor.
    """
    periodo = periodo_en_nombre(ano, mes)

    for archivo in archivos:
        if archivo.rsplit(".", 1)[0].strip().endswith(periodo):
            return archivo

    return archivos[0]
