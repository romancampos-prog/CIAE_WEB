"""
Leer el Excel crudo mensual del Extractor: la hoja que trae las columnas del mapeo, validar que
sea del mes declarado, las filas que pasan los filtros con su unidad, y las fechas tal como
vienen (2025 en texto, 2026 como fecha de Excel).
Usado en: services/extractor/conteo_*_Services.py
"""
import pandas as pd

from compartido.extraccion_excel.detalle_extraccion_Model import DetalleFiltroConteo
from compartido.extraccion_excel.modos_por_filtro.mascara_filtros_Services import mascara_filtros
from compartido.extraccion_excel.motor_extraccion_Services import columnas_esperadas
from datos.excel_subido.lector_excel_Datos import LectorExcel, numeros_escritos_como_texto
from shared.MESES import MESES_ESTANDAR
from shared.UNIDADES import CATALOGOS_UNIDADES, CLAVE_UNIDADES_F

# Sin catalogoUnidades se agrupa por la UMF de adscripcion: el SUI-13 trae la clave recortada
# ("11011125"), y sus 6 primeras cifras identifican la unidad (igual que el cruce de EH 03/DM 04).
DIGITOS_CLAVE_UMF = 6


def columnas_por_nombre(config: dict) -> list[str]:
    """Columnas que el codigo usa por nombre (no por letra): la de unidad, la llave del cruce y las fechas de sobrevida."""
    nombres = [config["agrupacion"]] if config.get("agrupacion") else []

    if (config.get("cruce") or {}).get("activa"):
        nombres.append(config.get("columnaLlaveCruce", "numeroAfiliacion"))

    regla = config.get("mesDelReporte") or {}

    for columna in ("columnaFechaNacimiento", "columnaFechaDefuncion"):
        if regla.get(columna):
            nombres.append(regla[columna])

    if config.get("columnaMesDeConteo"):
        nombres.append(config["columnaMesDeConteo"])

    return nombres


##--------------------------------------

def validar_mes_anio_archivo(df, anio: int, mes_nombre: str, columnas: dict | None = None) -> None:
    """
    El archivo trae sus propias columnas de mes/año (en el SUI-13 "mes"/"anio",
    en Egresos TOCO "mesm"/"aniom" -- las dice 'columnasPeriodo' del mapeo).
    Las declaro quien lo exporto, no necesariamente el mes real de cada fila,
    pero sirven para detectar el error mas comun: subir el archivo de un mes
    mientras se declara otro. Se compara contra el valor que MAS SE REPITE (no
    exige el 100%, es normal que traiga algunas filas de un mes vecino). No
    depende del nombre del archivo.
    """

    col_mes  = (columnas or {}).get("mes", "mes")
    col_anio = (columnas or {}).get("anio", "anio")

    if col_mes not in df.columns or col_anio not in df.columns:
        return  # el archivo no trae estas columnas -- no se puede validar, se deja pasar

    mes_num_declarado = MESES_ESTANDAR.index(mes_nombre) + 1
    combinaciones = df[[col_mes, col_anio]].dropna()

    if combinaciones.empty:
        return

    mes_mas_comun, anio_mas_comun = combinaciones.mode().iloc[0]

    if int(mes_mas_comun) != mes_num_declarado or int(anio_mas_comun) != int(anio):
        raise ValueError(
            f"El archivo parece ser de {int(mes_mas_comun):02d}/{int(anio_mas_comun)} "
            f"(según sus propias columnas mes/anio), pero declaraste {mes_nombre} {anio}. "
            f"Revisa que sea el archivo correcto antes de subirlo."
        )


##--------------------------------------

def filas_que_cuentan(lector: LectorExcel, config: dict, anio: int, mes_nombre: str,
                      con_fuera_de_catalogo: bool = False) -> tuple[pd.DataFrame, dict]:
    """
    Las filas del archivo que pasan los filtros del bloque del mapeo (filtroColumna +
    filtroGrupoColumnas, la misma regla que FILTRO_CONTEO), con su unidad en la columna
    "unidad" (de 'agrupacion' buscada en 'catalogoUnidades'); las de unidades fuera del
    catalogo se quitan, salvo con_fuera_de_catalogo (quedan con "unidad" vacia: DM 05 las
    suma al TOTAL_OOAD). Regresa (filas, catalogo).
    """

    nombre_catalogo = config.get("catalogoUnidades")
    catalogo = CLAVE_UNIDADES_F if nombre_catalogo is None else CATALOGOS_UNIDADES.get(nombre_catalogo)

    if catalogo is None:
        raise ValueError(f"catalogoUnidades '{nombre_catalogo}' no existe -- opciones: {list(CATALOGOS_UNIDADES)}")

    # La hoja elegida ya trae los encabezados del mapeo en sus letras (y la columna de unidad).
    df = lector.hoja_con_columnas(columnas_esperadas("FILTRO_CONTEO", config), config.get("encabezado", 1), columnas_por_nombre(config))
    df = numeros_escritos_como_texto(df, config)
    validar_mes_anio_archivo(df, anio, mes_nombre, config.get("columnasPeriodo"))

    filas = df[mascara_filtros(df, DetalleFiltroConteo.model_validate(config))].copy()
    # Una clave numerica con celdas vacias en la columna llega como float ("110804012151.0").
    claves = filas[config["agrupacion"]].astype(str).str.strip().str.replace(r"\.0$", "", regex=True)
    if nombre_catalogo is None:
        claves = claves.str[:DIGITOS_CLAVE_UMF]
    filas["unidad"] = claves.map(catalogo)

    return (filas if con_fuera_de_catalogo else filas[filas["unidad"].notna()]), catalogo


##--------------------------------------

def leer_fecha(columna: pd.Series) -> pd.Series:
    """
    Fechas como vienen en los reportes: 2026 trae fecha de Excel ("2026-01-17 14:32:00") y
    2025 texto con "p. m." ("28/12/2025 02:12:00 p. m."); el SUI-13 las trae pegadas DDMMAAAA
    ("11072025", o como numero sin el cero inicial). Lo que no se pueda leer queda vacio.
    """
    texto = columna.astype(str).str.strip().str.replace("p. m.", "PM", regex=False).str.replace("a. m.", "AM", regex=False)
    fechas = pd.Series(pd.NaT, index=columna.index)

    for formato in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %I:%M:%S %p", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
        fechas = fechas.fillna(pd.to_datetime(texto, errors="coerce", format=formato))

    pegadas = texto.str.replace(r"\.0$", "", regex=True)
    pegadas = pegadas.where(pegadas.str.fullmatch(r"\d{7,8}")).str.zfill(8)
    return fechas.fillna(pd.to_datetime(pegadas, errors="coerce", format="%d%m%Y"))
