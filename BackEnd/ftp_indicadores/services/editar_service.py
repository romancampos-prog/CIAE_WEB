"""
Edita campos del JSON de un indicador FTP (título, semáforo, etc.).
Usado en: ftp_indicadores/controllers/edicion_controller.py
"""
import json
from ftp_indicadores.config import ICONOS_INDICADORES


def editar_general(data) -> dict:
    tipo    = data.id_indicador.split()[0]
    entrada = ICONOS_INDICADORES.get(tipo)

    if not entrada:
        return {"status": "error", "message": f"No se encontró ruta para {tipo}"}

    ruta = entrada["json"]
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            datos = json.load(f)
    except Exception as e:
        return {"status": "error", "message": f"No se pudo leer el archivo: {e}"}

    indicador = datos.get(data.id_indicador)
    if not indicador:
        return {"status": "error", "message": f"Indicador {data.id_indicador} no encontrado"}

    indicador["titulo"] = data.titulo
    if data.descripcionNumerador is not None:
        indicador["descripcionNumerador"] = data.descripcionNumerador
    if data.descripcionDenominador is not None:
        indicador["descripcionDenominador"] = data.descripcionDenominador
    if data.nombreArchivoFinal is not None:
        indicador["nombreArchivoFinal"] = data.nombreArchivoFinal

    try:
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": f"No se pudo guardar: {e}"}


def editar_semaforo(data) -> dict:
    tipo    = data.id_indicador.split()[0]
    entrada = ICONOS_INDICADORES.get(tipo)

    if not entrada:
        return {"status": "error", "message": f"No se encontró ruta para {tipo}"}

    ruta = entrada["json"]
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            datos = json.load(f)
    except Exception as e:
        return {"status": "error", "message": f"No se pudo leer el archivo: {e}"}

    indicador = datos.get(data.id_indicador)
    if not indicador:
        return {"status": "error", "message": f"Indicador {data.id_indicador} no encontrado"}

    indicador["semaforo"] = data.semaforo

    try:
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": f"No se pudo guardar: {e}"}
