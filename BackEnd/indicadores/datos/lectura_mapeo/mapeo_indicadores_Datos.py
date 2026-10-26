"""
Lectura del mapeo de indicadores (indicadores/mapeo/): es lo unico que sabe en que carpeta y
archivo vive cada indicador. La carpeta es el modulo (ftp/, iaas/, extractor/; sin_generar/
son los que todavia no se automatizan) y catalogos/ trae lo comun de cada familia.
Usado en: services/*, datos/lectura_mapeo/mapeo_por_modulo_Datos.py
"""
import copy
import json
from functools import lru_cache
from pathlib import Path

_RUTA_MAPEO = Path(__file__).parent.parent.parent / "mapeo"

# mapeo/{carpeta}/{FAMILIA}.json: la carpeta ES el modulo de sus indicadores (ya no se
# escribe "modulo" en cada uno). "sin_generar" son los que todavia no se automatizan.
MODULOS = ("ftp", "iaas", "extractor")

_CARPETA_SIN_GENERAR = "sin_generar"

_RUTA_FAMILIAS = _RUTA_MAPEO / "catalogos" / "familias.json"


def _archivos_de_indicadores() -> list[tuple[str, Path]]:
    """(modulo, ruta) de cada JSON de familia, en el orden en que se listan los indicadores."""
    carpetas = [(modulo, modulo) for modulo in MODULOS] + [("", _CARPETA_SIN_GENERAR)]
    return [(modulo, ruta) for modulo, carpeta in carpetas for ruta in sorted((_RUTA_MAPEO / carpeta).glob("*.json"))]


##--------------------------------------

@lru_cache(maxsize=1)
def _bloques_leidos(firma: tuple) -> dict[str, dict]:
    """
    {indicador: bloque} de todo el mapeo, con lo que no va escrito en cada indicador:
    "modulo" (sale de la carpeta) e "imagen"/"color" (salen de catalogos/familias.json).
    firma solo sirve para que, si se edita un JSON, se vuelva a leer sin reiniciar.
    """
    familias = json.loads(_RUTA_FAMILIAS.read_text(encoding="utf-8"))
    bloques = {}

    for modulo, ruta in _archivos_de_indicadores():
        for indicador, bloque in json.loads(ruta.read_text(encoding="utf-8")).items():
            familia = familias.get(indicador.split()[0], {})
            bloques[indicador] = {**bloque, "modulo": modulo, "imagen": familia.get("imagen", ""), "color": familia.get("color", "")}

    return bloques


##--------------------------------------

def todos_los_bloques() -> dict[str, dict]:
    rutas = [ruta for _, ruta in _archivos_de_indicadores()] + [_RUTA_FAMILIAS]
    return _bloques_leidos(tuple((str(ruta), ruta.stat().st_mtime_ns) for ruta in rutas))


##--------------------------------------

def bloque_mapeo(indicador: str) -> dict | None:
    """
    El bloque crudo de un indicador ("CAMA 01") tal como lo usa el resto del codigo; None si
    no existe. Es la UNICA forma de leer el mapeo de indicadores: solo aqui se sabe en que
    carpeta y archivo vive cada uno. Copia, para que nadie modifique lo leido.
    """
    bloque = todos_los_bloques().get(indicador)
    return copy.deepcopy(bloque) if bloque is not None else None


##--------------------------------------

def catalogo_familias() -> dict[str, dict]:
    """catalogos/familias.json: {familia: {nombre, imagen, color}}."""
    return json.loads(_RUTA_FAMILIAS.read_text(encoding="utf-8"))


##--------------------------------------

def catalogo_archivos_extractor() -> dict[str, dict]:
    """catalogos/archivos_extractor.json: {clave: {nombre, nombreSugerido}} de cada archivo que sube el Extractor."""
    return json.loads((_RUTA_MAPEO / "catalogos" / "archivos_extractor.json").read_text(encoding="utf-8"))
