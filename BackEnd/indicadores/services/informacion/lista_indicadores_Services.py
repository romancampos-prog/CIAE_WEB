"""
Listas de indicadores que salen del mapeo: por familia (graficas, descargas) y por modulo (lo
comun de las paginas de Generar; cada modulo le agrega lo suyo en su pagina_generar_*).
Usado en: Controller/informacion_Controller.py, services/{ftp,iaas,extractor,poblacion}/*
"""
from datos.lectura_mapeo.mapeo_indicadores_Datos import catalogo_familias, todos_los_bloques
from schemas.model.ficha_indicador_Model import IndicesIndicadores
from schemas.model.pagina_generar_Model import IndicadorGenerar
from shared.reglas_periodicidad import descripcion_periodicidad


def todos_los_indicadores(campo: str = "mostrarGrafica", modulo: str | None = None) -> list[IndicesIndicadores]:
    """
    campo: bandera del mapeo que decide que indicadores se listan -- "mostrarGrafica"
           (gráficas/descargas, default) o "mostrarGenerar" (páginas de Generar).
    modulo: si se manda ("ftp", "iaas", "extractor"), solo los indicadores de ese módulo
            (un indicador sin módulo asignado todavía no está automatizado).
    Las categorías que quedan sin indicadores no se incluyen.
    """
    familias = catalogo_familias()
    por_familia: dict[str, list[str]] = {}

    for indicador, bloque in todos_los_bloques().items():
        if bloque.get(campo, True) and (modulo is None or bloque["modulo"] == modulo.lower()):
            por_familia.setdefault(indicador.split()[0], []).append(indicador)

    return [
        IndicesIndicadores(
            categoriaIndicador=familia,
            indicadores=por_familia[familia],
            imagen=familias.get(familia, {}).get("imagen", ""),
            color=familias.get(familia, {}).get("color", ""),
        )
        for familia in sorted(por_familia, key=str.lower)
    ]


##--------------------------------------

def indicadores_del_modulo(modulo: str) -> list[IndicadorGenerar]:
    """
    Los indicadores que se generan en un modulo ("ftp", "iaas", "extractor"), con lo que
    las tres paginas de Generar necesitan de cada uno. Cada modulo le agrega lo suyo en
    su servicio (ver schemas/model/pagina_generar_Model.py).
    """
    familias = catalogo_familias()
    lista = []

    for indicador, bloque in todos_los_bloques().items():
        if bloque["modulo"] != modulo or not bloque.get("mostrarGenerar"):
            continue
        categoria = indicador.split()[0]
        lista.append(IndicadorGenerar(
            indicador=indicador,
            categoria=categoria,
            nombreCategoria=familias.get(categoria, {}).get("nombre", categoria),
            titulo=bloque["informacion"]["titulo"],
            periodicidad=bloque["periodicidad"],
            descripcionPeriodicidad=descripcion_periodicidad(bloque["periodicidad"]),
            imagen=bloque["imagen"],
            color=bloque["color"],
        ))

    return lista
