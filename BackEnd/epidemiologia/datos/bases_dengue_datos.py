"""
Las dos bases que sube el usuario (BD_CIAE/EPIDEMIOLOGIA/Dengue/bases): guardarlas y leerlas.
Usado en: services/subir_bases_service.py, services/depuracion_service.py
"""
import pandas as pd


def cargar_base(ruta_archivo):
    """
    Carga la base de datos operativa desde un archivo de excel.
    ruta_archivo es el parámetro que utiliza la función, es decir,
    la ruta completa al archivo .xlsx
    """

    print(f"Cargando archivo: {ruta_archivo}")

    df = pd.read_excel(ruta_archivo)

    print(f"Registros cargados:  {len(df)}")

    return df


##--------------------------------------

def cargar_siscep(ruta_siscep):
    """
    Carga la base de resultados SisCep proporcionada por el usuario.
    """

    print(f"Cargando SisCep: {ruta_siscep}")
    df_siscep = pd.read_excel(ruta_siscep)

    # Verificar que exista la columna de cruce
    if 'FOLIO SINAVE' not in df_siscep.columns:
        raise ValueError("La base SisCep no contiene la columna 'FOLIO SINAVE'. Verifica el archivo.")

    print(f"SisCep cargada: {len(df_siscep)} registros")
    print(f"Columnas disponibles: {list(df_siscep.columns)}")

    return df_siscep


##--------------------------------------

def guardar_base(ruta, contenido: bytes) -> None:
    """Guarda (o reemplaza) una base subida por el usuario."""
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_bytes(contenido)
