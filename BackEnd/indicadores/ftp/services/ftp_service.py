"""
Consulta información de indicadores desde los JSON de catálogo.
Usado en: ftp/controllers/ftp_controller.py
"""
import json
from ftp.config import ICONOS_INDICADORES, RUTA_MAPEO_UNIFICADO


def _adaptar_desde_mapeo_unificado(dato: dict, indicador: str) -> dict:
    """
    Traduce un indicador del mapeo unificado (indicadores/mapeo/, con
    informacion.titulo/descNum/descDen) a la forma plana que espera el motor
    de Excel/reportes viejo (titulo/descripcionNumerador/descripcionDenominador/
    nombreArchivoFinal) -- para indicadores que todavia no tienen entrada en
    ftp/mapeo/ (ej. EH 03, DM 04 -- modulo "Extractor").
    """
    informacion = dato.get("informacion", {})
    return {
        "titulo":                 informacion.get("titulo"),
        "descripcionNumerador":   informacion.get("descNum"),
        "descripcionDenominador": informacion.get("descDen"),
        "nombreArchivoFinal":     indicador.replace(" ", "_"),
        "fechaModificacion":      dato.get("fechaModificacion"),
        "semaforo":               dato.get("semaforo", {}),
        "decimales":              None,
        "periodicidad":           dato.get("periodicidad"),
        "modulo":                 dato.get("modulo"),
        # El motor "Extractor" (FILTRO_CONTEO_ACUMULADO) no arma numerador/denominador
        # por extraccion de columnas de Excel como el resto (ver reporte.numerador en
        # indicadores/mapeo/EH.json y DM.json) -- no hay "reporte"/"operacion" en la
        # forma plana vieja que espera operacionParser.js, por eso se omiten aqui;
        # InformacionIndicador.jsx detecta su ausencia y muestra una descripcion
        # simple en vez del desglose de fuentes por columna.
    }


def obtenerInformacionIndicador(indicador: str) -> dict:
    tipo    = indicador.split()[0]
    entrada = ICONOS_INDICADORES.get(tipo)

    if entrada:
        try:
            with open(entrada["json"], "r", encoding="utf-8") as f:
                datos = json.load(f)
                info  = datos.get(indicador)
                if info:
                    return info
        except Exception:
            pass

    # No esta en el mapeo viejo (ftp/mapeo/) -- probar el mapeo unificado
    # (indicadores/mapeo/), para indicadores como EH 03/DM 04 que todavia
    # no se migran ahi.
    try:
        with open(RUTA_MAPEO_UNIFICADO / f"{tipo}.json", "r", encoding="utf-8") as f:
            datos_uni = json.load(f)
        dato = datos_uni.get(indicador)
        if dato:
            return _adaptar_desde_mapeo_unificado(dato, indicador)
    except Exception:
        pass

    return {"error": f"No se encontró el indicador: {indicador}"}


def _pasa_filtro_unificado(val: dict, campo_mostrar: str) -> bool:
    """
    El mapeo unificado (indicadores/mapeo/) no tiene el campo "generaFTP" del
    mapeo viejo -- se traduce a mostrarGenerar + que tenga modulo asignado
    (un indicador con mostrarGenerar=true pero sin modulo no está realmente
    automatizado todavía). "mostrarGrafica" sí existe igual en ambos mapeos,
    se usa tal cual.
    """
    if campo_mostrar == "generaFTP":
        return bool(val.get("mostrarGenerar")) and bool(val.get("modulo"))
    return val.get(campo_mostrar, True)


def consultarTodosIndicadores(campo_mostrar: str = "mostrarGrafica") -> dict:
    """
    campo_mostrar: qué bandera del mapeo filtra la lista --
    "mostrarGrafica" (listado/gráfica/descarga guardado) o
    "generaFTP" (generación real por extracción, ver /generar-categoria).
    """
    resultado = {}

    for tipo, entrada in ICONOS_INDICADORES.items():
        sub_indicadores = []

        try:
            with open(entrada["json"], "r", encoding="utf-8") as f:
                datos = json.load(f)
            sub_indicadores += [
                key for key, val in datos.items()
                if isinstance(val, dict) and val.get(campo_mostrar, True)
            ]
        except Exception:
            pass

        # Indicadores que solo existen en el mapeo unificado (ej. EH 03,
        # DM 04 -- modulo "Extractor") -- se agregan los que no esten ya.
        try:
            with open(RUTA_MAPEO_UNIFICADO / f"{tipo}.json", "r", encoding="utf-8") as f:
                datos_uni = json.load(f)
            for key, val in datos_uni.items():
                if key not in sub_indicadores and isinstance(val, dict) and _pasa_filtro_unificado(val, campo_mostrar):
                    sub_indicadores.append(key)
        except Exception:
            pass

        if sub_indicadores:
            resultado[tipo] = {
                "icono":       entrada["icono"],
                "indicadores": sub_indicadores,
            }

    return resultado
