"""
Transforma los resultados del clustering en el GeoJSON (con casos por municipio) y la tabla
que pinta el mapa Leaflet del front. Hay tres mapas:
    residencia  — municipio donde vive el paciente (DES_MPO_RES); tabla por municipio de residencia
    unidad      — municipio de la unidad que notifico (DES_MPO_UNIDAD); tabla por unidad (DES_UNI_MED_NOTIF)
    confirmados — solo POSITIVO, por municipio de residencia; tabla por unidad
Usado en: services/dengue/pipeline/pasos_pipeline_Services.py
"""
import copy

TIPOS_MAPA = ("residencia", "unidad", "confirmados")

# De donde sale cada mapa: (conteo del mapa, su columna, conteo de la tabla, su columna, que lista la tabla)
FUENTES_MAPA = {
    "residencia" : ("df_municipio",   "MPO_NORM",        "df_municipio",   "MPO_NORM",          "municipio"),
    "unidad"     : ("df_mpo_unidad",  "MPO_UNIDAD_NORM", "df_unidades",    "DES_UNI_MED_NOTIF", "unidad"),
    "confirmados": ("df_confirmados", "MPO_NORM",        "df_uni_confirm", "DES_UNI_MED_NOTIF", "unidad"),
}


def procesar_mapa(clust: dict, tipo: str, año: int) -> dict:
    clave_mapa, col_mapa, clave_tabla, col_tabla, tabla_por = FUENTES_MAPA[tipo]
    df_mapa  = clust[clave_mapa]
    df_tabla = clust[clave_tabla]

    lookup = dict(zip(df_mapa[col_mapa], df_mapa["N_CASOS"]))

    geojson = copy.deepcopy(clust["geojson"])
    nombre_bonito = {}

    for feat in geojson["features"]:
        mpo    = feat["properties"].get("MUNICIPIO", "")
        nombre = feat["properties"].get("mun_name", mpo.title())
        feat["properties"]["N_CASOS"] = int(lookup.get(mpo, 0))
        feat["properties"]["NOMBRE"]  = nombre
        nombre_bonito[mpo] = nombre

    # La tabla por municipio usa el nombre con acentos del GeoJSON; si no esta, el de la base
    tabla = [
        {
            "nombre": nombre_bonito.get(row[col_tabla], str(row[col_tabla]).title())
                      if tabla_por == "municipio" else str(row[col_tabla]).strip(),
            "n"     : int(row["N_CASOS"]),
        }
        for _, row in df_tabla.iterrows()
        if row["N_CASOS"] > 0
    ]

    return {
        "tipo"           : tipo,
        "año"            : año,
        "geojson"        : geojson,
        "max_casos"      : max(lookup.values(), default=1),
        "total"          : sum(r["n"] for r in tabla),
        "mun_con_casos"  : sum(1 for v in lookup.values() if v > 0),
        "tabla_por"      : tabla_por,
        "tabla"          : tabla,
        "brotes_espacial": clust["brotes_espacial"],
        "brotes_temporal": clust["brotes_temporal"],
    }
