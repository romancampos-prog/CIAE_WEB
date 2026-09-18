HOSPITALES_IAAS = [
    "HGZMF 2 IRAPUATO",
    "HGZMF 3 SALAMANCA",
    "HGZ 4 CELAYA",
    "HGS 10 GUANAJUATO",
    "HGSMF 13 ACAMBARO",
    "HGZMF 21 LEON SUR",
    "HGS 54 SILAO",
    "HGR 58 LEÓN",
    "HGSMF 7 SAN FCO. DEL R.",
    "HGSMF 15 MOROLEON",
    "HGSMF 20 SAN LUIS DE"
]

CLASIFICACION_HOSPITALES_IAAS_01 = {
    "UNIDADES_HGS_IAAS01": [
        "HGSMF 13 ACAMBARO",
        "HGS 54 SILAO",
        "HGSMF 7 SAN FCO. DEL R.",
        "HGSMF 15 MOROLEON",
        "HGS 10 GUANAJUATO",
        "HGSMF 20 SAN LUIS DE"
    ],
    "UNIDADES_HGZ_IAAS01": [
        "HGZMF 2 IRAPUATO",
        "HGZMF 3 SALAMANCA",
        "HGZ 4 CELAYA",
        "HGZMF 21 LEON SUR"
    ],
    "UNIDADES_HGR_IAAS01": [
        "HGR 58 LEÓN"
    ],
    "UNIDADES_HGO_IAAS01": [
    
    ],
     "UNIDADES_HGP_IAAS01": [

    ],
}

# Mapa inverso unidad -> tipo de semaforo, para no recorrer las 5 listas en cada
# consulta. Cualquier unidad que no aparezca aqui (ej. "TOTAL_OOAD") se toma
# como "OOAD" en donde se use este mapa.
UNIDAD_TIPO_IAAS01: dict[str, str] = {
    unidad: clave.removeprefix("UNIDADES_").removesuffix("_IAAS01")
    for clave, unidades in CLASIFICACION_HOSPITALES_IAAS_01.items()
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
    for nombre in {u for unidades in CLASIFICACION_HOSPITALES_IAAS_01.values() for u in unidades}
    for alias in [alias_hgsz(nombre)] if alias
}


def nombre_canonico_iaas(unidad: str) -> str:
    """El dato crudo de IAAS a veces trae el alias HGSZ/HGSZMF de una unidad HGS/HGSMF; devuelve el nombre del catalogo."""
    return _ALIAS_A_CANONICO_IAAS.get(unidad, unidad)
