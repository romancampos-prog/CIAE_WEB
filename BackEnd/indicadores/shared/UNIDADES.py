"""
Unidades de IAAS (hospitales) y su clasificacion por tipo. Unica fuente: mapeo/unidades/iaas.json.
Usado en: services/iaas/*, services/bd_Ciae_Indicadores_Services.py, shared/semaforizado_service.py
"""
import json
from pathlib import Path

_unidades = json.loads((Path(__file__).parent.parent / "mapeo" / "unidades" / "iaas.json").read_text(encoding="utf-8"))

MESES               = _unidades["MESES"]
ORDEN_IAAS01        = _unidades["ORDEN_IAAS01"]
ORDEN_DEMAS_IAAS    = _unidades["ORDEN_DEMAS_IAAS"]
UNIDADES_HGS_IAAS01 = _unidades["UNIDADES_HGS_IAAS01"]
UNIDADES_HGZ_IAAS01 = _unidades["UNIDADES_HGZ_IAAS01"]
UNIDADES_HGR_IAAS01 = _unidades["UNIDADES_HGR_IAAS01"]
UNIDADES_HGO_IAAS01 = _unidades.get("UNIDADES_HGO_IAAS01", [])
UNIDADES_HGP_IAAS01 = _unidades.get("UNIDADES_HGP_IAAS01", [])

# Unidades con menos de 20 camas censables: se siguen calculando y mostrando
# individualmente en los 6 indicadores IAAS, pero no cuentan para el TOTAL_OOAD.
UNIDADES_SIN_OOAD_IAAS = _unidades.get("UNIDADES_SIN_OOAD_IAAS", [])

# Mapa unidad -> tipo de semaforo de IAAS 01. Cualquier unidad que no aparezca aqui
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
    En el dato crudo, algunas unidades HGS/HGSMF vienen guardadas como HGSZ/HGSZMF --
    es la misma unidad, solo cambia el prefijo. Devuelve el nombre alterno a probar,
    o None si el nombre no tiene ese prefijo.
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


def nombre_canonico_iaas(unidad: str) -> str:
    """El dato crudo de IAAS a veces trae el alias HGSZ/HGSZMF de una unidad HGS/HGSMF; devuelve el nombre del catalogo."""
    return _ALIAS_A_CANONICO_IAAS.get(unidad, unidad)


# UNIDAD_TIPO_IAAS01 solo tiene los nombres canonicos (HGS/HGSMF); el dato crudo
# a veces trae el alias HGSZ/HGSZMF -- este mapa cubre tambien esa variante.
_ALIAS_TIPO_IAAS01: dict[str, str] = {
    alias: tipo for nombre, tipo in UNIDAD_TIPO_IAAS01.items()
    for alias in [alias_hgsz(nombre)] if alias
}


def grupo_de_unidad_iaas01(unidad: str | None) -> str:
    """
    Tipo de hospital de una unidad para el semaforo agrupado de IAAS 01
    (HGS/HGZ/HGR/HGO/HGP); cualquier otra (ej. "TOTAL_OOAD", o una unidad que
    no aplica a IAAS 01) cae en "OOAD", el grupo con el umbral general.
    """
    return UNIDAD_TIPO_IAAS01.get(unidad) or _ALIAS_TIPO_IAAS01.get(unidad, "OOAD")
