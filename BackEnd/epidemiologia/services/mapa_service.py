"""
Módulo  : mapa_service.py
Carpeta : epidemiologia/services/
Qué hace: Transforma resultados de clustering en estructura GeoJSON para el mapa Leaflet del front.
Usado en: pipeline_service.py
"""
import copy


def procesar_mapa(clust: dict, tipo: str, año: int) -> dict:
    if tipo == "situacion":
        df_mpo = clust["df_municipio"]
        df_uni = clust["df_unidades"]
    else:
        df_mpo = clust["df_confirmados"]
        df_uni = clust["df_uni_confirm"]

    lookup = dict(zip(df_mpo["MPO_NORM"], df_mpo["N_CASOS"]))

    geojson = copy.deepcopy(clust["geojson"])
    for feat in geojson["features"]:
        mpo    = feat["properties"].get("MUNICIPIO", "")
        nombre = feat["properties"].get("mun_name", mpo.title())
        feat["properties"]["N_CASOS"] = int(lookup.get(mpo, 0))
        feat["properties"]["NOMBRE"]  = nombre

    unidades = [
        {"unidad": row["DES_UNI_MED_NOTIF"], "n": int(row["N_CASOS"])}
        for _, row in df_uni.iterrows()
        if row["N_CASOS"] > 0
    ]

    return {
        "tipo"           : tipo,
        "año"            : año,
        "geojson"        : geojson,
        "max_casos"      : max(lookup.values(), default=1),
        "total"          : sum(r["n"] for r in unidades),
        "mun_con_casos"  : sum(1 for v in lookup.values() if v > 0),
        "unidades"       : unidades,
        "brotes_espacial": clust["brotes_espacial"],
        "brotes_temporal": clust["brotes_temporal"],
    }
