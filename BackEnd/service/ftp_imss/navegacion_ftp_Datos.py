"""
Moverse dentro del FTP del IMSS sin importar el modulo: entrar a una ruta segmento por segmento
(con diagnostico de por que una carpeta no se encontro: espacios, mayusculas, carpeta parecida),
probar varias rutas y bajar un archivo a memoria.
Usado en: indicadores/services/ftp/extraer_reporte_ftp_Services.py (y lo que epidemiologia baje del FTP)
"""
import difflib
import io
from ftplib import FTP
from typing import NamedTuple


class ResultadoNavegacion(NamedTuple):
    ok:               bool
    segmento_fallido: str | None = None
    diagnostico:      str | None = None


##--------------------------------------

def navegar_alguna_ruta(ftp: FTP, rutas: list[str]) -> tuple[str, ResultadoNavegacion]:
    """Entra a la primera de las rutas que exista; si ninguna, regresa la primera con su diagnostico."""
    primer_fallo = None

    for ruta in rutas:
        navegacion = navegar_ruta(ftp, ruta)
        if navegacion.ok:
            return ruta, navegacion
        if primer_fallo is None:
            primer_fallo = (ruta, navegacion)

    return primer_fallo


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
