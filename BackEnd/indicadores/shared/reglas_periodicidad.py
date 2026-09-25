"""
Reglas por periodicidad del mapeo (campo "periodicidad" de cada indicador):
que meses muestran el Excel y la grafica, y el texto que explica el periodo.
Solo hay dos formas: "mensual" (los 12 meses) y "de corte" (solo los meses de
corte); lo que cambia entre periodicidades mensuales es el dato, no las columnas.
Usado en: services/excel_dibujante_Services.py, schemas/model/indicador_Model.py,
          iaas/services/info_service.py
"""

# Indice 0-based de los meses de corte de cada periodicidad "de corte".
_MESES_DE_CORTE = {
    "trimestral acumulado": [2, 5, 8, 11],   # Marzo, Junio, Septiembre, Diciembre
    "semestral anualizado": [5, 11],         # Junio, Diciembre
}

_EXPLICACION = {
    "mensual":                     "dato de cada mes",
    "mensual mensual acumulado":   "dato de cada mes y acumulado desde enero",
    "mensual acumulado":           "cada mes acumula desde enero",
    "mensual anualizado":          "cada mes acumula los últimos 12 meses",
    "mensual semestralizado":      "cada mes acumula los últimos 6 meses",
    "mensual trimestralizado":     "cada mes acumula los últimos 3 meses",
    "trimestral acumulado":        "corte cada 3 meses, acumulado desde enero",
    "semestral anualizado":        "corte en junio (jul a jun) y en diciembre (ene a dic)",
}


def _clave(periodicidad: str | None) -> str:
    return " ".join((periodicidad or "").lower().replace(" - ", " ").replace("-", " ").split())


def indices_de_meses(periodicidad: str | None) -> list[int]:
    """Indices 0-based de los meses que se muestran como columna."""
    return _MESES_DE_CORTE.get(_clave(periodicidad), list(range(12)))


def descripcion_periodicidad(periodicidad: str | None) -> str | None:
    """Ej. "Mensual Trimestralizado: cada mes acumula los últimos 3 meses"; None si el indicador no tiene periodicidad."""
    if not periodicidad:
        return None
    explicacion = _EXPLICACION.get(_clave(periodicidad))
    return f"{periodicidad}: {explicacion}" if explicacion else periodicidad
