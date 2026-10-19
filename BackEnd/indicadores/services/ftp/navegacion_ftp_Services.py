"""
Todo lo del servidor FTP del IMSS (exclusivo de FTP): conexion, en que subcarpeta de
1.SIAIS_Reportes vive cada reporte, como se arma la ruta de una unidad, la navegacion
segmento por segmento (con diagnostico de por que una carpeta no se encontro), listar los
reportes y bajar el archivo a memoria.
Usado en: services/ftp/extraccion_indicador_ftp_Services.py
"""
import difflib
import io
from ftplib import FTP
from typing import NamedTuple

from configs.settings import FTP_PASS, FTP_SERVER, FTP_USER

_EXTENSIONES_EXCEL = (".XLS", ".XLSX")

# Subcarpeta de 1.SIAIS_Reportes de cada reporte (ej. "CP03" -> "Salud Pública").
REPORTES_POR_SUBCARPETA: dict[str, tuple[str, ...]] = {
    "Estomatologia": (
        "EST01", "EST02", "EST03",
    ),
    "Indicadores": (
        "IN01", "IN02", "IN03", "IN04", "IN05", "IN06", "IN07", "IN08", "IN09", "IN10",
        "IN11", "IN12", "IN13", "IN14", "IN15", "IN16", "IN17", "IN18", "IN19", "IN20",
        "IN21", "IN22", "IN23", "IN24", "IN25", "IN26", "IN27", "IN28", "IN29", "IN30",
        "IN31", "IN32", "IN33",
    ),
    "Otros reportes": (
        "LAPI01", "OC05", "OC19", "OC27", "OC28", "OC33", "OC34", "OC36",
        "OC48", "OC49", "OC52", "OC56",
    ),
    "Planificación Familiar": (
        "PF01", "PF02", "PF03", "PF04", "PF05", "PF06", "PF07",
        "PF08", "PF09", "PF10", "PF11", "PF12", "PF13", "PF14",
    ),
    "Productividad": (
        "PM01", "PM02", "PM03", "PM04", "PM05", "PM06", "PM07", "PM08",
        "PU01", "PU02", "PU03", "PU04", "PU05", "PU06", "PU07", "PU08",
        "PU09", "PU10", "PU11", "PU12",
    ),
    "Salud en el Trabajo": (
        "ST01", "ST02", "ST03", "ST05", "ST06",
    ),
    "Salud Materna": (
        "MT01", "MT02", "MT03", "MT06",
    ),
    "Salud Pública": (
        "CHK01", "CHK02", "CHK03", "CHK04", "CHK05", "CHK06",
        "CIP01", "CP01", "CP02", "CP03", "CP04",
        "IAP01", "IAP02", "IAP03",
    ),
    "Validaciones": (
        "VA01", "VA02", "VA03", "VA04", "VA05",
    ),
}

# No viven en 1.SIAIS_Reportes de cada unidad sino en una carpeta del año con un
# archivo por unidad (la piramide de poblacion adscrita, ej. PB02 al 30 de junio).
REPORTES_DE_PIRAMIDES: tuple[str, ...] = ("PB02",)

_SUBCARPETA_POR_REPORTE: dict[str, str] = {
    reporte: subcarpeta
    for subcarpeta, reportes in REPORTES_POR_SUBCARPETA.items()
    for reporte in reportes
}


def codigo_base(codigo_reporte: str) -> str:
    """El mapeo a veces trae sufijo ("CP03_algo"); el reporte es lo de antes del guion bajo."""
    return codigo_reporte.split("_")[0].strip().upper()


##--------------------------------------

def subcarpeta_de_reporte(codigo_reporte: str) -> str:
    """Subcarpeta de 1.SIAIS_Reportes donde vive el reporte; ValueError si no esta en el catalogo."""
    subcarpeta = _SUBCARPETA_POR_REPORTE.get(codigo_base(codigo_reporte))
    if subcarpeta is None:
        raise ValueError(f"El reporte '{codigo_reporte}' no esta en el catalogo de 1.SIAIS_Reportes.")
    return subcarpeta


##--------------------------------------

def conectar_ftp() -> FTP | None:
    # NOTA: se intento migrar a FTP_TLS (conexion cifrada) pero el servidor
    # del IMSS rechazo la conexion -- no soporta FTPS por ahora. Pendiente
    # de confirmar con el equipo que administra ese servidor si algun dia
    # lo habilitan, para volver a intentar este cambio.
    try:
        ftp = FTP()
        ftp.connect(FTP_SERVER, 21, timeout=120)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.set_pasv(True)
        print(f"Conexión establecida con {FTP_SERVER}")
        return ftp
    except Exception as error:
        print(f"Error al conectar al FTP: {error}")
        return None


##--------------------------------------

def desconectar_ftp(ftp: FTP | None) -> None:
    if not ftp:
        return
    try:
        ftp.quit()
        print("Sesión FTP cerrada correctamente.")
    except Exception:
        ftp.close()
        print("Conexión forzada a cerrar.")


##--------------------------------------

class ResultadoNavegacion(NamedTuple):
    ok:               bool
    segmento_fallido: str | None = None
    diagnostico:      str | None = None


##--------------------------------------

def ruta_reportes_unidad(ano: str, mes: str, unidad: str, subcarpeta: str, semana: int | None = None) -> str:
    """
    Definitivo: 01. DATAMARTEM/ArchsDataMart_{año}/{año}{mes}/{unidad}/1.SIAIS_Reportes/{subcarpeta}
    Semanal:    01. DATAMARTEM/ArchsData_Previos_{año}/{año}{mes}/{unidad}/1.SIAIS_Reportes/Semana_{s}/{subcarpeta}_S{s}
    """
    if semana is None:
        return f"01. DATAMARTEM/ArchsDataMart_{ano}/{ano}{mes}/{unidad}/1.SIAIS_Reportes/{subcarpeta}"
    return f"01. DATAMARTEM/ArchsData_Previos_{ano}/{ano}{mes}/{unidad}/1.SIAIS_Reportes/Semana_{semana}/{subcarpeta}_S{semana}"


##--------------------------------------

def navegar_ruta(ftp: FTP, carpeta_remota: str) -> ResultadoNavegacion:
    """Entra a la ruta segmento por segmento; si uno falla, diagnostica por que."""
    ftp.cwd('/')
    for segmento in carpeta_remota.split("/"):
        if not segmento:
            continue
        try:
            ftp.cwd(segmento)
        except Exception:
            return ResultadoNavegacion(False, segmento, diagnosticar_segmento(ftp, segmento))
    return ResultadoNavegacion(True)


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

def descargar_archivo(ftp: FTP, nombre_archivo: str) -> io.BytesIO:
    """Baja el archivo de la carpeta actual a memoria (nada se guarda en disco)."""
    buffer = io.BytesIO()
    ftp.retrbinary(f"RETR {nombre_archivo.split('/')[-1]}", buffer.write, blocksize=65536)
    buffer.seek(0)
    return buffer


##--------------------------------------

def diagnosticar_segmento(ftp: FTP, buscado: str) -> str:
    """Explica por que una carpeta no se pudo abrir: espacios, mayusculas, carpeta parecida o que hay en ese nivel."""
    try:
        disponibles = ftp.nlst()
    except Exception:
        return "no se pudo listar el directorio padre"

    if not disponibles:
        return "el directorio padre está vacío"

    b_strip = buscado.strip()
    b_lower = buscado.lower()
    b_snorm = b_strip.lower()

    for d in disponibles:
        d_strip = d.strip()
        d_lower = d.lower()
        d_snorm = d_strip.lower()

        if d == buscado:
            return "la carpeta existe pero no se pudo acceder (¿permisos?)"

        if d == b_strip and buscado != b_strip:
            lados = []
            if buscado.startswith(' '): lados.append(f"{len(buscado) - len(buscado.lstrip())} al inicio")
            if buscado.endswith(' '):   lados.append(f"{len(buscado) - len(buscado.rstrip())} al final")
            return f"espacio(s) extra en la ruta buscada ({', '.join(lados)}) — real: '{d}'"

        if d_strip == buscado and d != d_strip:
            lados = []
            if d.startswith(' '): lados.append(f"{len(d) - len(d.lstrip())} al inicio")
            if d.endswith(' '):   lados.append(f"{len(d) - len(d.rstrip())} al final")
            return f"la carpeta en el FTP tiene espacio(s) extra ({', '.join(lados)}) — real: '{d}'"

        if d_strip == b_strip and (d != d_strip or buscado != b_strip):
            return f"espacios extra en ambos lados — real en FTP: '{d}', buscado: '{buscado}'"

        # Mismas letras pero con un espacio de mas/menos a media palabra
        # (ej. 'SIAIS_Reportes' vs 'SIAIS_ Reportes') -- no lo cubre strip().
        if d.replace(" ", "") == buscado.replace(" ", "") and d != buscado:
            return f"hay un espacio de más — buscado: '{buscado}', real: '{d}'"

        if d_lower == b_lower and d != buscado:
            difs = [f"pos {i}: '{x}'→'{y}'" for i, (x, y) in enumerate(zip(d, buscado)) if x != y]
            return f"mayúsculas distintas — real: '{d}' · diferencias: {', '.join(difs)}"

        if d_snorm == b_snorm and d != buscado:
            return f"mayúsculas/espacios distintos — real: '{d}', buscado: '{buscado}'"

    # Un solo caracter insertado corre todas las posiciones siguientes, asi que en vez
    # de comparar letra por letra se muestran las dos carpetas completas.
    candidatos = difflib.get_close_matches(buscado, disponibles, n=1, cutoff=0.55)
    if candidatos:
        parecida = candidatos[0]
        porcentaje = int(difflib.SequenceMatcher(None, buscado.lower(), parecida.lower()).ratio() * 100)
        return f"carpeta más parecida: '{parecida}' ({porcentaje}% similar) — buscado: '{buscado}'"

    muestra = ", ".join(f"'{d}'" for d in disponibles[:6])
    sufijo  = f" … ({len(disponibles)} en total)" if len(disponibles) > 6 else ""
    return f"no existe en este nivel — carpetas disponibles: {muestra}{sufijo}"
