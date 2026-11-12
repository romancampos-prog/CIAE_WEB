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
    """
    Explica por que una carpeta no se pudo abrir. Si en ese nivel hay una carpeta casi igual, el texto
    termina en "— real: '...'" (solo cambian espacios o mayusculas) o "— parecida: '...'" (se le
    parece, hay que revisarla); la pantalla lo pone junto a la ruta buscada, que es la correcta.
    """

    try:
        disponibles = ftp.nlst()
    except Exception:
        return "no se pudo listar el directorio padre"

    if not disponibles:
        return "el directorio padre está vacío"

    b_lower = buscado.lower()
    b_snorm = buscado.strip().lower()

    for d in disponibles:
        if d == buscado:
            return "la carpeta existe pero no se pudo acceder (¿permisos?)"

        if d.replace(" ", "") == buscado.replace(" ", ""):
            return f"{_explicar_espacio(buscado, d)} — real: '{d}'"

        if d.lower() == b_lower:
            return f"la carpeta del FTP está escrita con otras mayúsculas — real: '{d}'"

        if d.strip().lower() == b_snorm:
            return f"la carpeta del FTP tiene otras mayúsculas y espacios — real: '{d}'"

    # Un solo caracter insertado corre todas las posiciones siguientes, asi que en vez
    # de comparar letra por letra se muestran las dos carpetas completas.
    candidatos = difflib.get_close_matches(buscado, disponibles, n=1, cutoff=0.55)

    if candidatos:
        parecida = candidatos[0]
        porcentaje = int(difflib.SequenceMatcher(None, buscado.lower(), parecida.lower()).ratio() * 100)
        return f"no existe esa carpeta; hay una {porcentaje}% similar, revisa si es la misma — parecida: '{parecida}'"

    muestra = ", ".join(f"'{d}'" for d in disponibles[:6])
    sufijo  = f" … ({len(disponibles)} en total)" if len(disponibles) > 6 else ""

    return f"no existe en este nivel — carpetas disponibles: {muestra}{sufijo}"


##--------------------------------------

def _explicar_espacio(buscado: str, real: str) -> str:
    """Dice de que lado esta el espacio distinto y en que parte (buscado y real solo difieren en espacios)."""

    for i, (letra_buscada, letra_real) in enumerate(zip(buscado, real)):
        if letra_buscada != letra_real:
            antes = buscado[:i].strip()
            lugar = f"después de «{antes}»" if antes else "al inicio"
            return f"a la carpeta del FTP le falta un espacio {lugar}" if letra_buscada == " " else f"la carpeta del FTP trae un espacio de más {lugar}"

    return "a la carpeta del FTP le falta un espacio al final" if len(buscado) > len(real) else "la carpeta del FTP trae un espacio de más al final"
