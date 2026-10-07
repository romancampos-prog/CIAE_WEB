"""
Navegacion por las carpetas del FTP del IMSS (exclusivo de FTP): arma la ruta de
los reportes de una unidad, entra segmento por segmento, diagnostica por que una
carpeta no se encontro, lista los reportes y baja el archivo a memoria.
Usado en: services/ftp/extraccion_indicador_ftp_Services.py
"""
import difflib
import io
from ftplib import FTP
from typing import NamedTuple

_EXTENSIONES_EXCEL = (".XLS", ".XLSX")


class ResultadoNavegacion(NamedTuple):
    ok:               bool
    segmento_fallido: str | None = None
    diagnostico:      str | None = None


def ruta_reportes_unidad(ano: str, mes: str, unidad: str, subcarpeta: str, semana: int | None = None) -> str:
    """
    Definitivo: 01. DATAMARTEM/ArchsDataMart_{año}/{año}{mes}/{unidad}/1.SIAIS_Reportes/{subcarpeta}
    Semanal:    01. DATAMARTEM/ArchsData_Previos_{año}/{año}{mes}/{unidad}/1.SIAIS_Reportes/Semana_{s}/{subcarpeta}_S{s}
    """
    if semana is None:
        return f"01. DATAMARTEM/ArchsDataMart_{ano}/{ano}{mes}/{unidad}/1.SIAIS_Reportes/{subcarpeta}"
    return f"01. DATAMARTEM/ArchsData_Previos_{ano}/{ano}{mes}/{unidad}/1.SIAIS_Reportes/Semana_{semana}/{subcarpeta}_S{semana}"


def ruta_piramides(ano: str) -> str:
    """01. DATAMARTEM/ArchsDataMart_{año}/Piramides para {año} por unidades -- un PB02 por unidad, fijo todo el año."""
    return f"01. DATAMARTEM/ArchsDataMart_{ano}/Piramides para {ano} por unidades"


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


def listar_reportes(ftp: FTP, codigo_reporte: str, clave_unidad: str | None = None) -> list[str]:
    """
    Excel de la carpeta actual cuyo nombre empieza con el codigo del reporte (ej. "CP03_algo" -> "CP03").
    clave_unidad: para carpetas con los archivos de todas las unidades juntos (piramides), donde el
    nombre es "{codigo}U{clave}..." y el resto del nombre no sigue ningun formato.
    """
    prefijo = codigo_reporte.split("_")[0].upper()
    if clave_unidad:
        prefijo = f"{prefijo}U{clave_unidad.upper()}"
    return [
        archivo for archivo in ftp.nlst()
        if archivo.upper().strip().startswith(prefijo) and archivo.upper().endswith(_EXTENSIONES_EXCEL)
    ]


def descargar_archivo(ftp: FTP, nombre_archivo: str) -> io.BytesIO:
    """Baja el archivo de la carpeta actual a memoria (nada se guarda en disco)."""
    buffer = io.BytesIO()
    ftp.retrbinary(f"RETR {nombre_archivo.split('/')[-1]}", buffer.write, blocksize=65536)
    buffer.seek(0)
    return buffer


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
