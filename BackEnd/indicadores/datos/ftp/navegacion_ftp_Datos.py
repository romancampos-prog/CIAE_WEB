"""
Moverse dentro del FTP: las rutas de un reporte en una unidad (con las plantillas y los nombres
de carpeta de mapeo/catalogos/ftp.json), la navegacion segmento por segmento (con diagnostico de
por que una carpeta no se encontro), listar los reportes, elegir el del periodo y bajarlo a memoria.
Usado en: services/ftp/extraer_reporte_ftp_Services.py
"""
import difflib
import io
from ftplib import FTP
from typing import NamedTuple

from datos.ftp.catalogo_reportes_ftp_Datos import CARPETAS, RUTAS, codigo_base, periodo_en_nombre, subcarpeta_de_reporte

_EXTENSIONES_EXCEL = (".XLS", ".XLSX")


class ResultadoNavegacion(NamedTuple):
    ok:               bool
    segmento_fallido: str | None = None
    diagnostico:      str | None = None


##--------------------------------------

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
