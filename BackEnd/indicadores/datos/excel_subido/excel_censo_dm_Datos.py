"""
Lectura del Excel nacional del Censo de pacientes con DM por unidad de adscripcion: se filtra
Guanajuato y se acomoda por las 46 unidades (por su clave presupuestal), con cada sexo por
grupo de edad. Hoja y encabezados salen de mapeo/CENSO_DM.json.
Usado en: services/censo_dm/archivo_censo_dm_Services.py
"""
import io
import re

import pandas as pd

from datos.lectura_mapeo.mapeo_censo_dm_Datos import cargar_mapeo_censo_dm
from shared.UNIDADES import CLAVE_UNIDADES_F, NOMBREUNIDADESARCHIVO

_REGEX_ANIO = re.compile(r"\b(20\d{2})\b")


def _texto(valor) -> str:
    return "" if pd.isna(valor) else str(valor).strip()


##--------------------------------------

def _numero(valor) -> int:
    """Celda vacia = 0 (el censo deja en blanco los grupos sin pacientes)."""
    numero = pd.to_numeric(valor, errors="coerce")
    return 0 if pd.isna(numero) else int(numero)


##--------------------------------------

def _elegir_hoja(libro: pd.ExcelFile, empieza_con: str) -> str:
    for hoja in libro.sheet_names:
        if hoja.strip().startswith(empieza_con):
            return hoja

    raise ValueError(f"El archivo no trae una hoja que empiece con '{empieza_con}' (trae: {libro.sheet_names}).")


##--------------------------------------

def _fila_de_encabezados(df: pd.DataFrame, encabezado_clave: str) -> int:
    for indice, fila in df.iterrows():
        if any(_texto(valor) == encabezado_clave for valor in fila):
            return indice

    raise ValueError(f"No se encontró el encabezado '{encabezado_clave}' en la hoja del censo.")


##--------------------------------------

def _columnas_de_bloques(encabezados: list[str], grupos: list[str], bloques: dict[str, str]) -> dict[str, dict[str, int]]:
    """{sexo: {grupo de edad: columna}}: cada bloque va de su encabezado hasta donde empieza el siguiente."""
    inicios = {}

    for sexo, titulo in bloques.items():
        if titulo not in encabezados:
            raise ValueError(f"No se encontró el bloque '{titulo}' en los encabezados del censo.")
        inicios[sexo] = encabezados.index(titulo)

    orden = sorted(inicios.values()) + [len(encabezados)]
    columnas = {}

    for sexo, inicio in inicios.items():
        fin = orden[orden.index(inicio) + 1]
        columnas[sexo] = {grupos[col]: col for col in range(inicio, fin) if grupos[col]}

    return columnas


##--------------------------------------

def leer_excel_censo_dm(contenido: bytes) -> dict:
    """
    {"hoja", "anio_detectado", "unidades": {unidad: {sexo: {grupo: n}}}, "no_encontradas", "extras"}.
    no_encontradas = unidades del catalogo que no vienen en el censo; extras = claves de Guanajuato
    que no estan en el catalogo.
    """

    mapeo = cargar_mapeo_censo_dm()
    libro = pd.ExcelFile(io.BytesIO(contenido))
    hoja = _elegir_hoja(libro, mapeo["hojaEmpiezaCon"])
    df = pd.read_excel(libro, sheet_name=hoja, header=None, dtype=object)

    # 1. Encabezados: la fila con "Clave Presupuestal" y, abajo, los grupos de edad
    fila = _fila_de_encabezados(df, mapeo["encabezados"]["clave"])
    encabezados = [_texto(v) for v in df.iloc[fila]]
    grupos = [_texto(v) for v in df.iloc[fila + 1]]
    col_delegacion = encabezados.index(mapeo["encabezados"]["delegacion"])
    col_clave = encabezados.index(mapeo["encabezados"]["clave"])
    col_unidad = encabezados.index(mapeo["encabezados"]["unidad"])
    columnas = _columnas_de_bloques(encabezados, grupos, mapeo["bloquesEdad"])

    # 2. El año del censo viene en el titulo, arriba de los encabezados
    titulos = " ".join(_texto(v) for v in df.iloc[:fila].to_numpy().ravel())
    anios = _REGEX_ANIO.findall(titulos)

    # 3. Las unidades de la delegacion, por su clave presupuestal
    digitos = mapeo["digitosClaveUnidad"]
    unidades, extras = {}, []

    for _, renglon in df.iloc[fila + 2:].iterrows():
        clave = _texto(renglon[col_clave])
        if _texto(renglon[col_delegacion]) != mapeo["delegacion_filtro"] or not clave:
            continue

        nombre = CLAVE_UNIDADES_F.get(clave[:digitos])
        if not nombre:
            extras.append(f"{clave} {_texto(renglon[col_unidad])}")
            continue

        unidades[nombre] = {
            sexo: {grupo: _numero(renglon[col]) for grupo, col in por_grupo.items()}
            for sexo, por_grupo in columnas.items()
        }

    return {
        "hoja": hoja,
        "anio_detectado": int(anios[-1]) if anios else None,
        "unidades": unidades,
        "no_encontradas": [u for u in NOMBREUNIDADESARCHIVO if u not in unidades],
        "extras": extras,
    }
