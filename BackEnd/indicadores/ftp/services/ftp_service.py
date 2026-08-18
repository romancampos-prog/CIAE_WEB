"""
Consulta información de indicadores desde los JSON de catálogo.
Usado en: ftp/controllers/ftp_controller.py
"""
import json
from ftp.config import ICONOS_INDICADORES


def obtenerInformacionIndicador(indicador: str) -> dict:
    tipo    = indicador.split()[0]
    entrada = ICONOS_INDICADORES.get(tipo)

    if not entrada:
        return {"error": f"No se encontró el tipo de indicador: {tipo}"}

    try:
        with open(entrada["json"], "r", encoding="utf-8") as f:
            datos = json.load(f)
            info  = datos.get(indicador)
            if info:
                return info
            return {"error": f"No se encontró el indicador: {indicador}"}
    except Exception as e:
        return {"error": str(e)}


def consultarTodosIndicadores(campo_mostrar: str = "mostrarGrafica") -> dict:
    """
    campo_mostrar: qué bandera del mapeo filtra la lista --
    "mostrarGrafica" (listado/gráfica/descarga guardado) o
    "generaFTP" (generación real por extracción, ver /generar-categoria).
    """
    resultado = {}

    for tipo, entrada in ICONOS_INDICADORES.items():
        try:
            with open(entrada["json"], "r", encoding="utf-8") as f:
                datos = json.load(f)

            sub_indicadores = [
                key for key, val in datos.items()
                if isinstance(val, dict) and val.get(campo_mostrar, True)
            ]

            if sub_indicadores:
                resultado[tipo] = {
                    "icono":       entrada["icono"],
                    "indicadores": sub_indicadores,
                }
        except Exception:
            continue

    return resultado
