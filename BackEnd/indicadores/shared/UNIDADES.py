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