"""
Edita campos de un indicador FTP directamente en el mapeo unificado
(indicadores/mapeo/{familia}.json): titulo, descripciones, nombre del archivo
y semaforo.
Usado en: ftp/controllers/edicion_controller.py
"""
import json

from ftp.services.mapeo_ftp import ruta_familia


def _editar_bloque(indicador: str, cambios) -> dict:
    """Lee la familia, aplica cambios(bloque_del_indicador) y la guarda de vuelta."""
    ruta = ruta_familia(indicador)
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            datos = json.load(f)
    except Exception as e:
        return {"status": "error", "message": f"No se pudo leer el archivo: {e}"}

    bloque = datos.get(indicador)
    if not bloque:
        return {"status": "error", "message": f"Indicador {indicador} no encontrado"}

    cambios(bloque)

    try:
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=4)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": f"No se pudo guardar: {e}"}


def editar_general(data) -> dict:
    def aplicar(bloque: dict) -> None:
        bloque.setdefault("informacion", {})["titulo"] = data.titulo
        if data.descripcionNumerador is not None:
            bloque["informacion"]["descNum"] = data.descripcionNumerador
        if data.descripcionDenominador is not None:
            bloque["informacion"]["descDen"] = data.descripcionDenominador
        if data.nombreArchivoFinal is not None:
            bloque["nombreArchivoFinal"] = data.nombreArchivoFinal

    return _editar_bloque(data.id_indicador, aplicar)


def editar_semaforo(data) -> dict:
    def aplicar(bloque: dict) -> None:
        bloque["semaforo"] = data.semaforo

    return _editar_bloque(data.id_indicador, aplicar)
