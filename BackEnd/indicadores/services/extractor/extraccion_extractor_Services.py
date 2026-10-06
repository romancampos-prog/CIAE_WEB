"""
Filtrado y conteo del Excel crudo mensual del motor Extractor (SUI-13 + su cruce
opcional con Egresos) -- exclusivo de Extractor, "capa 1" (leer la hoja y validar
que sea el archivo correcto). El chequeo celda-por-celda (LISTA/RANGO/match simple)
vive en services/metodos_extraccion_excel.py (capa 2, compartida con FTP e IAAS).
Usado en: services/extractor/generacion_extractor_Services.py
"""
import io

import pandas as pd

from shared.unidades_ftp import CATALOGOS_UNIDADES, CLAVE_UNIDADES_F
from shared.MESES import MESES_ESTANDAR
from shared.validarArchivo_service import ejecutar_validaciones, validar_columnas_esperadas
from services.metodos_extraccion_excel import (
    columnas_esperadas,
    CondicionFiltro,
    cumple_condicion,
    DetalleFiltroConteo,
    fila_cumple,
    letra_a_numero,
    mascara_filtros,
)


class LectorExcel:
    """
    Lee cada hoja del Excel subido UNA sola vez aunque varios indicadores la pidan
    (EH 03, DM 04 y MT 03 salen del mismo SUI-13 del mes).
    """
    def __init__(self, contenido_bytes: bytes):
        self._contenido = contenido_bytes
        self._hojas: dict[tuple[str, int], pd.DataFrame] = {}

    def hoja(self, nombre: str, encabezado: int = 1) -> pd.DataFrame:
        clave = (nombre, encabezado)
        if clave not in self._hojas:
            self._hojas[clave] = pd.read_excel(io.BytesIO(self._contenido), sheet_name=nombre, header=encabezado - 1)
        return self._hojas[clave]


def _tipar_filtro_columna(filtro_columna: dict) -> dict[str, CondicionFiltro]:
    return {
        letra: cfg if isinstance(cfg, CondicionFiltro) else CondicionFiltro.model_validate(
            cfg if isinstance(cfg, dict) else {"filtro": cfg}
        )
        for letra, cfg in filtro_columna.items()
    }


def _validar_mes_anio_archivo(df, anio: int, mes_nombre: str, columnas: dict | None = None) -> None:
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


def contar_por_unidad(lector: LectorExcel, config: dict, anio: int, mes_nombre: str) -> dict[str, int]:
    """
    Cuenta, por unidad, las filas que pasan los filtros del bloque del mapeo
    (filtroColumna + filtroGrupoColumnas) -- la misma regla que FILTRO_CONTEO,
    pero agrupada. La unidad sale de la columna 'agrupacion' buscada en el
    catalogo 'catalogoUnidades' por clave completa; filas de unidades fuera del
    catalogo no cuentan (asi el mapeo, no el codigo, decide quien entra).
    Toda unidad del catalogo aparece, en 0 si no tuvo casos.
    """
    nombre_catalogo = config.get("catalogoUnidades")
    catalogo = CATALOGOS_UNIDADES.get(nombre_catalogo)
    if catalogo is None:
        raise ValueError(f"catalogoUnidades '{nombre_catalogo}' no existe -- opciones: {list(CATALOGOS_UNIDADES)}")

    hoja = config["hoja"]
    df = lector.hoja(hoja, config.get("encabezado", 1))
    errores = ejecutar_validaciones([
        lambda: validar_columnas_esperadas(list(df.columns), columnas_esperadas("FILTRO_CONTEO", config)),
        lambda: _validar_mes_anio_archivo(df, anio, mes_nombre, config.get("columnasPeriodo")),
    ])
    if errores:
        raise ValueError("\n".join(errores))

    col_agrupacion = config["agrupacion"]
    if col_agrupacion not in df.columns:
        raise KeyError(f"La columna de agrupacion '{col_agrupacion}' no existe en la hoja '{hoja}'")

    mascara = mascara_filtros(df, DetalleFiltroConteo.model_validate(config))
    unidades = df.loc[mascara, col_agrupacion].astype(str).str.strip().map(catalogo).dropna()
    conteo = unidades.value_counts()
    return {nombre: int(conteo.get(nombre, 0)) for nombre in catalogo.values()}


def contar_filtro_conteo_acumulado(lector: LectorExcel, config_numerador: dict, anio: int | None = None, mes_nombre: str | None = None) -> tuple[dict, list[dict]]:
    """
    Filtra y cuenta el Excel del mes segun 'reporte.numerador' del mapeo.

    Retorna:
      - conteo_por_unidad: {nombre_unidad_canonico: conteo}, ya sumando los
        casos que cumplen el filtro directo (via 1).
      - candidatos_cruce: lista de dicts {"unidad": ..., "llave": ...} de las
        filas que no cumplen via 1 pero si tienen uno de los codigosCandidatos
        de 'cruce' -- pendientes de validar contra un segundo archivo.
    """
    hoja = config_numerador["hoja"]
    encabezado = config_numerador.get("encabezado", 1)
    filtro_columna = config_numerador["filtroColumna"]
    col_agrupacion = config_numerador["agrupacion"]
    cruce_cfg = config_numerador.get("cruce")

    df = lector.hoja(hoja, encabezado)

    errores = ejecutar_validaciones([
        lambda: validar_columnas_esperadas(list(df.columns), columnas_esperadas("FILTRO_CONTEO_ACUMULADO", config_numerador)),
        lambda: _validar_mes_anio_archivo(df, anio, mes_nombre, config_numerador.get("columnasPeriodo")) if anio is not None and mes_nombre is not None else None,
    ])
    if errores:
        raise ValueError("\n".join(errores))

    # columna de agrupacion (ej. "undadAdscripcion") -> se busca por nombre en el encabezado real
    if col_agrupacion not in df.columns:
        raise KeyError(f"La columna de agrupacion '{col_agrupacion}' no existe en la hoja '{hoja}'")

    conteo_por_unidad: dict[str, int] = {}
    candidatos_cruce: list[dict] = []

    # Se tipa una sola vez fuera del loop (no por fila) -- CondicionFiltro.model_validate
    # tiene costo real si se repite miles de veces en un SUI-13 grande.
    filtro_columna_tipado = _tipar_filtro_columna(filtro_columna)

    diag_letra = next((l for l, c in filtro_columna.items() if isinstance(c, dict) and c.get("nombreColumna") == "diagnosticoPrincipal"), None)
    diag_idx = letra_a_numero(diag_letra) if diag_letra else None
    diag_cfg = filtro_columna_tipado.get(diag_letra) if diag_letra else None
    # El resto de columnas (edad, tipoIngreso, ...) deben cumplirse SIEMPRE,
    # tanto para contar via 1 directo como para calificar como candidato via 2
    # -- si no, un candidato con tipoIngreso invalido igual colaria.
    filtros_base = {l: c for l, c in filtro_columna_tipado.items() if l != diag_letra}

    for _, fila in df.iterrows():
        clave_unidad = str(fila[col_agrupacion])[:6]
        nombre_unidad = CLAVE_UNIDADES_F.get(clave_unidad)
        if not nombre_unidad:
            continue  # unidad sin PAMF -- no se cuenta por unidad (igual que EH/DM ya validado)

        if filtros_base and not fila_cumple(fila, filtros_base):
            continue

        if diag_cfg is not None and cumple_condicion(fila.iloc[diag_idx], diag_cfg):
            conteo_por_unidad[nombre_unidad] = conteo_por_unidad.get(nombre_unidad, 0) + 1
            continue

        if cruce_cfg and cruce_cfg.get("activa") and diag_idx is not None:
            diag_valor = str(fila.iloc[diag_idx]).strip()
            if diag_valor in cruce_cfg["codigosCandidatos"]:
                llave_col = config_numerador.get("columnaLlaveCruce", "numeroAfiliacion")
                llave = fila[llave_col] if llave_col in df.columns else None
                candidatos_cruce.append({"unidad": nombre_unidad, "llave": llave})

    return conteo_por_unidad, candidatos_cruce


def validar_candidatos_cruce(candidatos_cruce: list[dict], contenido_excel_cruce: LectorExcel, cruce_cfg: dict) -> dict:
    """
    Cruza los candidatos (via 2) contra el archivo del mismo mes indicado en
    'cruce.archivoCruce'. Por cada paciente valida si alguna de sus filas trae,
    en cualquiera de 'columnasDiagnostico', uno de los 'codigosValidos'.
    Retorna {nombre_unidad: cuantos candidatos se validaron}.
    """
    if not candidatos_cruce:
        return {}

    hoja = cruce_cfg.get("hoja", "Hoja1")
    encabezado = cruce_cfg.get("encabezado", 1)
    df = contenido_excel_cruce.hoja(hoja, encabezado)

    col_llave = cruce_cfg["columnaLlave"]
    cols_diag = cruce_cfg["columnasDiagnostico"]
    codigos_validos = set(cruce_cfg["codigosValidos"])

    diag_por_paciente: dict[str, set] = {}
    for _, fila in df.iterrows():
        llave = fila.get(col_llave)
        if llave is None:
            continue
        diags = diag_por_paciente.setdefault(llave, set())
        for letra in cols_diag:
            idx = letra_a_numero(letra)
            if idx < len(fila):
                valor = fila.iloc[idx]
                if valor:
                    diags.add(str(valor).strip())

    validados_por_unidad: dict[str, int] = {}
    for candidato in candidatos_cruce:
        diags_paciente = diag_por_paciente.get(candidato["llave"], set())
        if diags_paciente & codigos_validos:
            unidad = candidato["unidad"]
            validados_por_unidad[unidad] = validados_por_unidad.get(unidad, 0) + 1

    return validados_por_unidad
