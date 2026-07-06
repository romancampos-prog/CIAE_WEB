"""
Módulo  : editar_service.py
Carpeta : reportes/services/
Qué hace: Edita campos del JSON de un indicador FTP (título, semáforo, etc.).
Usado en: reportes/controllers/edicion_controller.py
"""
import json
from configs.settings import ICONOS_INDICADORES


def editar_general(data) -> dict:
    tipo    = data.id_indicador.split()[0]
    entrada = ICONOS_INDICADORES.get(tipo)

    if not entrada:
        return {"status": "error", "message": f"No se encontró ruta para {tipo}"}

    ruta = entrada["json"]
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            base_datos = json.load(f)

        if data.id_indicador not in base_datos:
            return {"status": "error", "message": "El indicador no existe en el archivo"}

        base_datos[data.id_indicador]["titulo"]                 = data.titulo
        base_datos[data.id_indicador]["descripcionNumerador"]   = data.descripcionNumerador
        base_datos[data.id_indicador]["descripcionDenominador"] = data.descripcionDenominador
        base_datos[data.id_indicador]["nombreArchivoFinal"]     = data.nombreArchivoFinal

        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(base_datos, f, ensure_ascii=False, indent=4)

        return {"status": "success", "message": "Información actualizada correctamente"}

    except Exception as e:
        return {"status": "error", "message": str(e)}


def editar_semaforo(data) -> dict:
    tipo    = data.id_indicador.split()[0]
    entrada = ICONOS_INDICADORES.get(tipo)

    if not entrada:
        return {"status": "error", "message": f"No se encontró ruta para {tipo}"}

    ruta = entrada["json"]
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            base_datos = json.load(f)

        if data.id_indicador not in base_datos:
            return {"status": "error", "message": "El indicador no existe en el archivo"}

        base_datos[data.id_indicador]["semaforo"] = data.semaforo

        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(base_datos, f, ensure_ascii=False, indent=2, separators=(',', ': '))

        return {"status": "success", "message": "Semáforo actualizado correctamente"}

    except Exception as e:
        return {"status": "error", "message": str(e)}
