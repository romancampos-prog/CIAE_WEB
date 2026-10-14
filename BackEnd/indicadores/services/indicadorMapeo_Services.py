import copy
import json
from functools import lru_cache
from pathlib import Path

#mis archivos
from indicadores.schemas.model.indicador_Model import IndicesIndicadores
from schemas.model.indicadorGenerar_Model import IndicadorGenerar
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from schemas.model.indicador_Model import InfoIndicador
from indicadores.schemas.model.ficha_tecnica_Model import FichaTecnicaCompleta, ReporteFicha, FuenteCalculo
# Mismo modulo con el que FTP hace isinstance de las fuentes (si se importara por otra ruta seria otra clase).
from schemas.model.reporte_mapeo_Model import IndicadorFTPMapeo, IndicadorIAASMapeo, IndicadorExtractorMapeo
from shared.semaforo_service import es_agrupado
from shared.UNIDADES import UNIDAD_TIPO_IAAS01
from shared.reglas_periodicidad import descripcion_periodicidad



_RUTA_MAPEO = Path(__file__).parent.parent / "mapeo"

# mapeo/{carpeta}/{FAMILIA}.json: la carpeta ES el modulo de sus indicadores (ya no se
# escribe "modulo" en cada uno). "sin_generar" son los que todavia no se automatizan.
MODULOS = ("ftp", "iaas", "extractor")
_CARPETA_SIN_GENERAR = "sin_generar"
_RUTA_FAMILIAS = _RUTA_MAPEO / "catalogos" / "familias.json"


def _archivos_de_indicadores() -> list[tuple[str, Path]]:
    """(modulo, ruta) de cada JSON de familia, en el orden en que se listan los indicadores."""
    carpetas = [(modulo, modulo) for modulo in MODULOS] + [("", _CARPETA_SIN_GENERAR)]
    return [(modulo, ruta) for modulo, carpeta in carpetas for ruta in sorted((_RUTA_MAPEO / carpeta).glob("*.json"))]


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


def _todos_los_bloques() -> dict[str, dict]:
    rutas = [ruta for _, ruta in _archivos_de_indicadores()] + [_RUTA_FAMILIAS]
    return _bloques_leidos(tuple((str(ruta), ruta.stat().st_mtime_ns) for ruta in rutas))


def bloque_mapeo(indicador: str) -> dict | None:
    """
    El bloque crudo de un indicador ("CAMA 01") tal como lo usa el resto del codigo; None si
    no existe. Es la UNICA forma de leer el mapeo de indicadores: solo aqui se sabe en que
    carpeta y archivo vive cada uno. Copia, para que nadie modifique lo leido.
    """
    bloque = _todos_los_bloques().get(indicador)
    return copy.deepcopy(bloque) if bloque is not None else None


def catalogo_familias() -> dict[str, dict]:
    """catalogos/familias.json: {familia: {nombre, imagen, color}}."""
    return json.loads(_RUTA_FAMILIAS.read_text(encoding="utf-8"))


def catalogo_archivos_extractor() -> dict[str, dict]:
    """catalogos/archivos_extractor.json: {clave: {nombre, nombreSugerido}} de cada archivo que sube el Extractor."""
    return json.loads((_RUTA_MAPEO / "catalogos" / "archivos_extractor.json").read_text(encoding="utf-8"))

#-----------------------------------------------------------------------------------------------------------------------------------------------------#

def AllIndicadores(campo: str = "mostrarGrafica", modulo: str | None = None) -> list[IndicesIndicadores]:
    """
    campo: bandera del mapeo que decide que indicadores se listan -- "mostrarGrafica"
           (gráficas/descargas, default) o "mostrarGenerar" (páginas de Generar).
    modulo: si se manda ("ftp", "iaas", "extractor"), solo los indicadores de ese módulo
            (un indicador sin módulo asignado todavía no está automatizado).
    Las categorías que quedan sin indicadores no se incluyen.
    """
    familias = catalogo_familias()
    por_familia: dict[str, list[str]] = {}
    for indicador, bloque in _todos_los_bloques().items():
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


def indicadores_del_modulo(modulo: str) -> list[IndicadorGenerar]:
    """
    Los indicadores que se generan en un modulo ("ftp", "iaas", "extractor"), con lo que
    las tres paginas de Generar necesitan de cada uno. Cada modulo le agrega lo suyo en
    su servicio (ver schemas/model/indicadorGenerar_Model.py).
    """
    familias = catalogo_familias()
    lista = []
    for indicador, bloque in _todos_los_bloques().items():
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
            peridocidadGenerada=bloque.get("peridocidadGenerada") or {},
            previos=bloque.get("previos", False),
            imagen=bloque["imagen"],
            color=bloque["color"],
        ))
    return lista

#-----------------------------------------------------------------------------------------------------------------------------------------------------#

def ObtenerFichaPorIndicador(payload: IndicadorRequest) -> InfoIndicador | None:
    #esta funcion es para obtener la informacion visual del indicador
    #ejem: titulo, objetivo, descripcion del numerador y denominador, semaforo, etc...
    datoIndicadorJson = bloque_mapeo(payload.indicador)
    if datoIndicadorJson is None:
        return None
    fichaIndicador = InfoIndicador.model_validate(datoIndicadorJson)

    # Semaforo agrupado (hoy solo IAAS 01, por tipo de hospital) -- el front necesita
    # saber a que grupo pertenece cada unidad para pintar el umbral que le toca.
    # es_agrupado necesita el dict CRUDO (fichaIndicador.semaforo ya viene tipado a
    # Semaforo, sus valores dejaron de ser dict). UNIDAD_TIPO_IAAS01 es el unico
    # catalogo de grupos que existe por ahora; si algun dia otro indicador usa un
    # semaforo agrupado con otras unidades, esto hay que generalizarlo a un catalogo
    # por indicador.
    if es_agrupado(datoIndicadorJson.get("semaforo", {})):
        fichaIndicador.grupoDeUnidad = UNIDAD_TIPO_IAAS01

    return fichaIndicador

#-----------------------------------------------------------------------------------------------------------------------------------------------------#

def ObtenerFichaTecnicaCompleta(indicador: str) -> FichaTecnicaCompleta | None:
    """
    Ficha técnica completa (para el panel compartido FichaTecnicaBoton, usado
    en FTP/IAAS/Extractor): igual que ObtenerFichaPorIndicador pero además
    incluye reporte.numerador/denominador/operacion -- lo que necesita la
    pestaña "Cálculo" para explicar cómo se saca el indicador.
    reporte queda en None cuando el indicador no está automatizado todavía
    (mostrarGenerar=false, ej. CACU 02 -- su bloque "reporte" viene vacío {}
    en el mapeo).
    """
    dato = bloque_mapeo(indicador)
    if not dato:
        return None

    repCrudo = dato.get("reporte") or {}
    reporte = None
    if repCrudo:
        num = repCrudo["numerador"]
        den = repCrudo["denominador"]
        reporte = ReporteFicha(
            numerador=FuenteCalculo(fuente=num.get("fuente", ""), modoExtraccion=num.get("modoExtraccion"), detalle=num),
            denominador=FuenteCalculo(fuente=den.get("fuente", ""), modoExtraccion=den.get("modoExtraccion"), detalle=den),
            operacion=repCrudo["operacion"],
        )

    return FichaTecnicaCompleta(
        modulo=dato.get("modulo", ""),
        fechaModificacion=dato["fechaModificacion"],
        periodicidad=dato["periodicidad"],
        automatizado=bool(repCrudo),
        informacion=dato["informacion"],
        reporte=reporte,
        semaforo=dato["semaforo"],
        columnasPorMes={
            **({"MESES_CIP01": dato["MESES_CIP01"]} if dato.get("MESES_CIP01") else {}),
            **dato.get("COLUMNAS_POR_MES", {}),
        },
    )


#-----------------------------------------------------------------------------------------------------------------------------------------------------#
# Mapeo tipado para los indicadores de FTP (ficha y lo que necesita la extraccion)

def _bloque_obligatorio(indicador: str) -> dict:
    bloque = bloque_mapeo(indicador)
    if bloque is None:
        raise KeyError(f"{indicador} no existe en el mapeo")
    return bloque


def cargar_indicador_mapeo(indicador: str) -> IndicadorFTPMapeo:
    """Lo que necesita la extraccion de un indicador FTP: reportes, formulas y semaforo."""
    return IndicadorFTPMapeo.model_validate(_bloque_obligatorio(indicador))


#-----------------------------------------------------------------------------------------------------------------------------------------------------#
# Mapeo tipado para los indicadores de IAAS

@lru_cache(maxsize=None)
def cargar_mapeo_iaas() -> dict[str, IndicadorIAASMapeo]:
    """Los indicadores del modulo IAAS (se lee una sola vez)."""
    return {
        indicador: IndicadorIAASMapeo.model_validate(copy.deepcopy(bloque))
        for indicador, bloque in _todos_los_bloques().items() if bloque["modulo"] == "iaas"
    }


def cargar_indicador_iaas(indicador: str) -> IndicadorIAASMapeo:
    return cargar_mapeo_iaas()[indicador]


#-----------------------------------------------------------------------------------------------------------------------------------------------------#
# Mapeo tipado para los indicadores del motor Extractor (mapeo/extractor/{FAMILIA}.json)

def cargar_indicador_extractor(indicador: str) -> IndicadorExtractorMapeo:
    """Lo que necesita el motor Extractor de un indicador: reportes, formulas y semaforo."""
    return IndicadorExtractorMapeo.model_validate(_bloque_obligatorio(indicador))
