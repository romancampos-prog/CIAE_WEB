"""
La regla unica de "esta celda cumple": filtroColumna con tipo LISTA/RANGO/PREFIJO/SUFIJO, o el
formato simple (match exacto o "^prefijo") que usa IAAS.
Usado en: indicadores/services/extractor/conteo_con_cruce_Services.py, modos_por_filtro/fila_cumple_Services.py, modos_por_filtro/filtro_unidad_valor_Services.py, modos_por_filtro/mascara_filtros_Services.py
"""
import re

import pandas as pd

from service.extraccion_excel.detalle_extraccion_Model import CondicionFiltro
from service.extraccion_excel.valores_celda_Services import es_vacio


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
