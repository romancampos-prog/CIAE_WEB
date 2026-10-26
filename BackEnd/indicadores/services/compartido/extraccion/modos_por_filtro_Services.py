"""
Modos de extraccion por filtro (los de IAAS y el Extractor): FILTRO_CONTEO (cuantas filas
cumplen los filtros) y FILTRO_UNIDAD_VALOR (el valor de la fila de una unidad). Aqui vive la
regla unica de "esta fila cuenta": filtroColumna con tipo LISTA/RANGO/PREFIJO/SUFIJO, o el
formato simple (match exacto o "^prefijo") que usa IAAS.
Usado en: services/compartido/extraccion/motor_extraccion_Services.py, services/iaas/*, services/extractor/*
"""
import re

import pandas as pd

from schemas.model.detalle_extraccion_Model import CondicionFiltro, DetalleFiltroConteo, DetalleFiltroUnidadValor
from services.compartido.extraccion.valores_celda_Services import a_numero, es_vacio
from shared.columnas_excel import letra_a_numero


def cumple_condicion(valor, cfg: CondicionFiltro) -> bool:
    if es_vacio(valor):
        valor = None

    if cfg.tipo == 'LISTA':
        objetivo = cfg.filtro

        if valor is None:
            return False
        if isinstance(valor, (int, float)):
            return valor in objetivo or str(int(valor)) in [str(o) for o in objetivo]

        return str(valor).strip() in [str(o) for o in objetivo]

    if cfg.tipo == 'RANGO':
        if valor is None or not isinstance(valor, (int, float)) or pd.isna(valor):
            return False
        minimo, maximo = cfg.filtro
        return minimo <= valor <= maximo

    if cfg.tipo == 'PREFIJO':
        # Compara desde el inicio tantos caracteres como tenga cada prefijo: "O11"
        # acepta O110/O11X, "O" acepta cualquier codigo O (los CIE traen sufijos variables).
        if valor is None:
            return False
        prefijos = cfg.filtro if isinstance(cfg.filtro, list) else [cfg.filtro]
        return str(valor).strip().upper().startswith(tuple(str(p).strip().upper() for p in prefijos))

    if cfg.tipo == 'SUFIJO':
        # Lo mismo pero por el final: el regimen viene al final del agregado (1F1992ND -> "ND").
        if valor is None:
            return False
        sufijos = cfg.filtro if isinstance(cfg.filtro, list) else [cfg.filtro]
        return str(valor).strip().upper().endswith(tuple(str(s).strip().upper() for s in sufijos))

    # Formato simple (solo lo usa IAAS): exacto sin distinguir mayusculas ni
    # espacios de los lados, o "^prefijo" = el texto empieza con esa palabra
    # completa ("^CIRUGIA" acepta "CIRUGIA GENERAL" pero no "CIRUGIAS").
    texto       = str(cfg.filtro)
    valor_texto = "" if valor is None else str(valor)

    if texto.startswith("^"):
        return re.match(rf'{re.escape(texto[1:])}(\s|$)', valor_texto, re.IGNORECASE) is not None

    return valor_texto.strip().upper() == texto.strip().upper()


##--------------------------------------

def fila_cumple(fila, filtro_columna: dict[str, CondicionFiltro]) -> bool:
    for letra, cfg in filtro_columna.items():
        idx = letra_a_numero(letra)
        if idx >= len(fila) or not cumple_condicion(fila.iloc[idx], cfg):
            return False

    return True


##--------------------------------------

def _columna_cumple(df, letra: str, cfg: CondicionFiltro) -> pd.Series:
    idx = letra_a_numero(letra)
    if idx >= df.shape[1]:
        raise KeyError(f"La columna {letra} no existe en la hoja")
    return df.iloc[:, idx].map(lambda v, c=cfg: cumple_condicion(v, c)).astype(bool)


##--------------------------------------

def mascara_filtros(df, detalle: DetalleFiltroConteo) -> pd.Series:
    """
    Que filas pasan TODOS los filtros del detalle (filtroColumna y filtroGrupoColumnas).
    Es la regla unica de "esta fila cuenta": la usan el conteo total (filtro_conteo)
    y el conteo por unidad del Extractor. KeyError si una columna no existe en la hoja.
    """
    mascara = pd.Series(True, index=df.index)

    for letra, cfg in detalle.filtroColumna.items():
        mascara &= _columna_cumple(df, letra, cfg)

    for grupo in detalle.filtroGrupoColumnas:
        condicion = grupo.condicion()
        alguna = pd.concat([_columna_cumple(df, letra, condicion) for letra in grupo.columnas], axis=1).any(axis=1)
        mascara &= alguna if grupo.coincidencia == 'CUALQUIERA' else ~alguna

    if detalle.filtroAlternativas:
        cumple_alguna = pd.Series(False, index=df.index)

        for alternativa in detalle.filtroAlternativas:
            cumple_esta = pd.Series(True, index=df.index)
            for letra, cfg in alternativa.items():
                cumple_esta &= _columna_cumple(df, letra, cfg)
            cumple_alguna |= cumple_esta

        mascara &= cumple_alguna

    return mascara


##--------------------------------------

def filtro_conteo(df, detalle: DetalleFiltroConteo):
    try:
        mascara = mascara_filtros(df, detalle)
    except KeyError as e:
        return None, "COLUMNA_NO_ENCONTRADA", str(e)

    return int(mascara.sum()), None, None


##--------------------------------------

def coincide_unidad(valor, nombre_unidad: str) -> bool:
    """
    Busca la unidad por su NUMERO (segundo token del nombre, ej. "HGZ 2 X" -> 2)
    como palabra completa -- el Excel a veces trae otra variante del nombre de
    la ciudad.
    """
    partes = nombre_unidad.split()
    return len(partes) > 1 and re.search(rf'\b{re.escape(partes[1])}\b', str(valor)) is not None


##--------------------------------------

def filtro_unidad_valor(df, detalle: DetalleFiltroUnidadValor, nombre_unidad_buscada: str | None = None):
    """
    Ubica la fila de una unidad especifica y toma un valor de otra columna.
    "UNIDADES_IAAS" en columnaUnidad.filtro es un marcador especial (ver
    mapeo/README.md): en vez de comparar contra un valor fijo, compara contra
    nombre_unidad_buscada (la unidad que se esta pidiendo en esa llamada).
    """

    col_unidad_letra, cfg_unidad = next(iter(detalle.columnaUnidad.items()))
    idx_unidad = letra_a_numero(col_unidad_letra)
    col_valor_letra = next(iter(detalle.tomarValor))
    idx_valor  = letra_a_numero(col_valor_letra)

    for _, fila in df.iterrows():
        valor_unidad = fila.iloc[idx_unidad]

        if cfg_unidad.filtro == "UNIDADES_IAAS":
            if nombre_unidad_buscada is None or not coincide_unidad(valor_unidad, nombre_unidad_buscada):
                continue
        elif not cumple_condicion(valor_unidad, cfg_unidad):
            continue

        if detalle.filtroColumna and not fila_cumple(fila, detalle.filtroColumna):
            continue

        return a_numero(fila.iloc[idx_valor]), None, None

    return None, "ETIQUETA_NO_ENCONTRADA", f"Unidad no encontrada en columna {col_unidad_letra}"
