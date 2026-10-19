"""
Catalogos de unidades medicas, leidos de mapeo/unidades/:
  - ftp.json:        las 46 UMF (carpeta en el servidor, nombre y clave presupuestal)
  - hospitales.json: hospitales de 2o nivel por clave, para indicadores que se agrupan por el
                     hospital que atiende (MT, Neonatal) y no por la UMF de adscripcion
  - iaas.json:       hospitales de IAAS y su tipo (para el semaforo agrupado de IAAS 01)
Usado en: services/*, shared/semaforo_service.py
"""
import json
from pathlib import Path

_RUTA_UNIDADES = Path(__file__).parent.parent / "mapeo" / "unidades"
_ftp        = json.loads((_RUTA_UNIDADES / "ftp.json").read_text(encoding="utf-8"))
_hospitales = json.loads((_RUTA_UNIDADES / "hospitales.json").read_text(encoding="utf-8"))
_iaas       = json.loads((_RUTA_UNIDADES / "iaas.json").read_text(encoding="utf-8"))

# FTP: carpeta de cada unidad en el servidor (semanal y definitivo), nombre y clave presupuestal.
UNIDADES_PREVIOS      = _ftp["UNIDADES_PREVIOS"]
UNIDADES_FINALES      = _ftp["UNIDADES_FINALES"]
NOMBREUNIDADESARCHIVO = _ftp["NOMBREUNIDADESARCHIVO"]
CLAVE_UNIDADES_F      = _ftp["CLAVE_UNIDADES_F"]

CLAVE_HOSPITALES = _hospitales["CLAVE_HOSPITALES"]

# Catalogos que un indicador del Extractor puede pedir en 'catalogoUnidades' del mapeo.
CATALOGOS_UNIDADES = {
    "hospitales": CLAVE_HOSPITALES,
}

# Como se describe cada agrupacion en pantalla; None = sin catalogoUnidades (UMF de adscripcion).
NOMBRE_AGRUPACION = {
    None:         _ftp["nombreAgrupacion"],
    "hospitales": _hospitales["nombreAgrupacion"],
}

ORDEN_IAAS01        = _iaas["ORDEN_IAAS01"]
ORDEN_DEMAS_IAAS    = _iaas["ORDEN_DEMAS_IAAS"]
UNIDADES_HGS_IAAS01 = _iaas["UNIDADES_HGS_IAAS01"]
UNIDADES_HGZ_IAAS01 = _iaas["UNIDADES_HGZ_IAAS01"]
UNIDADES_HGR_IAAS01 = _iaas["UNIDADES_HGR_IAAS01"]
UNIDADES_HGO_IAAS01 = _iaas.get("UNIDADES_HGO_IAAS01", [])
UNIDADES_HGP_IAAS01 = _iaas.get("UNIDADES_HGP_IAAS01", [])

# Unidades con menos de 20 camas censables: se siguen calculando y mostrando
# individualmente en los 6 indicadores IAAS, pero no cuentan para el TOTAL_OOAD.
UNIDADES_SIN_OOAD_IAAS = _iaas.get("UNIDADES_SIN_OOAD_IAAS", [])

# Unidad -> tipo de semaforo de IAAS 01. Cualquier unidad que no aparezca aqui
# (ej. "TOTAL_OOAD") se toma como "OOAD" en donde se use este mapa.
UNIDAD_TIPO_IAAS01: dict[str, str] = {
    unidad: tipo
    for tipo, unidades in (
        ("HGS", UNIDADES_HGS_IAAS01), ("HGZ", UNIDADES_HGZ_IAAS01), ("HGR", UNIDADES_HGR_IAAS01),
        ("HGO", UNIDADES_HGO_IAAS01), ("HGP", UNIDADES_HGP_IAAS01),
    )
    for unidad in unidades
}


def alias_hgsz(nombre: str) -> str | None:
    """
    En el dato crudo, algunas unidades HGS/HGSMF vienen guardadas como HGSZ/HGSZMF -- es la
    misma unidad, solo cambia el prefijo. Devuelve el nombre alterno a probar, o None.
    """
    if nombre.startswith("HGSMF "):
        return "HGSZMF " + nombre[len("HGSMF "):]
    if nombre.startswith("HGS "):
        return "HGSZ " + nombre[len("HGS "):]
    return None


# alias (HGSZ 10 ..., HGSZMF 13 ...) -> nombre canonico del catalogo (HGS 10 ..., HGSMF 13 ...)
_ALIAS_A_CANONICO_IAAS: dict[str, str] = {
    alias: nombre
    for nombre in UNIDADES_HGS_IAAS01
    for alias in [alias_hgsz(nombre)] if alias
}

# UNIDAD_TIPO_IAAS01 solo tiene los nombres canonicos; el dato crudo a veces trae el alias.
_ALIAS_TIPO_IAAS01: dict[str, str] = {
    alias: tipo for nombre, tipo in UNIDAD_TIPO_IAAS01.items()
    for alias in [alias_hgsz(nombre)] if alias
}


##--------------------------------------

def nombre_canonico_iaas(unidad: str) -> str:
    """El dato crudo de IAAS a veces trae el alias HGSZ/HGSZMF de una unidad HGS/HGSMF; devuelve el nombre del catalogo."""
    return _ALIAS_A_CANONICO_IAAS.get(unidad, unidad)


##--------------------------------------

def grupo_de_unidad_iaas01(unidad: str | None) -> str:
    """
    Tipo de hospital de una unidad para el semaforo agrupado de IAAS 01 (HGS/HGZ/HGR/HGO/HGP);
    cualquier otra (ej. "TOTAL_OOAD") cae en "OOAD", el grupo con el umbral general.
    """
    return UNIDAD_TIPO_IAAS01.get(unidad) or _ALIAS_TIPO_IAAS01.get(unidad, "OOAD")
