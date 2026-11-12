"""
Pone al dia el indice de estudios (ESTUDIOS/estudios.json) con lo que de verdad hay en las carpetas,
porque los Excel tambien se pueden poner o quitar a mano:
  - un estudio del indice cuyo archivo ya no esta -> sale del indice
  - un Excel en {año}/{unidad}/{mes}/ con el nombre de un registro -> entra al indice
  - un Excel cuyo nombre no es de ningun registro -> se avisa (no se toca)
Se corre al consultar Acciones (admin), asi la tabla siempre refleja la carpeta.
Usado en: services/ftp/consulta_extraccion_Services.py
"""
from compartido.auditoria_Services import registrar
from epidemiologia.datos.ftp.estudios_acciones_Datos import archivos_de_estudios, guardar_indice_estudios, leer_indice_estudios
from epidemiologia.datos.ftp.extracciones_ftp_Datos import leer_extraccion
from epidemiologia.modulos.ftp.id_registro import id_de_registro
from epidemiologia.modulos.ftp.ruta_estudio import ruta_de_estudio
from ..mapeo.mapeo_Services import ExtraerMapeoFTP


def _registros_por_ruta(archivo: str, rutas: list[str]) -> dict[str, str]:
    """
    {ruta del estudio sin extension: id del registro} de los registros de los meses que tocan esas
    rutas. Un registro puede venir en el reporte de su mes o en el del mes siguiente (el OC30 de
    octubre trae atenciones del 28 de septiembre), asi que se revisan los dos.
    """

    mapeo = ExtraerMapeoFTP(archivo)
    meses = set()

    for ruta in rutas:
        partes = ruta.split("/")
        # Solo los que estan en {año}/{unidad}/{mes}/archivo; uno puesto en otro nivel queda "sin registro"
        if len(partes) != 4:
            continue
        ano, _unidad, mes, _nombre = partes
        if ano.isdigit() and mes.isdigit():
            meses.add((int(ano), int(mes)))
            meses.add((int(ano) + int(mes) // 12, int(mes) % 12 + 1))

    por_ruta = {}

    for ano, mes in meses:
        for fila in (leer_extraccion(archivo, ano, f"{mes:02d}") or {"filas": []})["filas"]:
            por_ruta[ruta_de_estudio(fila, mapeo.columnaFecha, mapeo.nombreEstudio, ano, mes).as_posix()] = id_de_registro(fila)

    return por_ruta


##--------------------------------------

def sincronizar_estudios(archivo: str) -> dict:
    """@returns {quitados, agregados, sinRegistro} (listas de rutas); el indice queda guardado si cambio."""

    #1- Lo que dice el indice y lo que hay en disco
    indice = leer_indice_estudios(archivo)
    en_disco = archivos_de_estudios(archivo)

    #2- Del indice salen los que ya no estan en la carpeta
    quitados = [datos["ruta"] for id_registro, datos in indice.items() if datos["ruta"] not in en_disco]
    indice = {id_registro: datos for id_registro, datos in indice.items() if datos["ruta"] in en_disco}

    #3- Los Excel nuevos en la carpeta: se busca su registro por la misma regla con que se nombran
    anotados = {datos["ruta"] for datos in indice.values()}
    nuevos = [ruta for ruta in en_disco if ruta not in anotados]
    por_ruta = _registros_por_ruta(archivo, nuevos) if nuevos else {}
    agregados, sin_registro = [], []

    for ruta in nuevos:
        id_registro = por_ruta.get(ruta.rsplit(".", 1)[0])

        if id_registro and id_registro not in indice:
            indice[id_registro] = {"ruta": ruta, "nombreOriginal": ruta.split("/")[-1],
                                   "fecha": en_disco[ruta].isoformat(timespec="seconds"), "usuario": "agregado en la carpeta"}
            agregados.append(ruta)
        else:
            sin_registro.append(ruta)

    #4- Guardar solo si algo cambio, y dejarlo en la bitacora
    if quitados or agregados:
        guardar_indice_estudios(archivo, indice)
        registrar("SINCRONIZAR_ESTUDIOS", detalle=f"{archivo} quitados={quitados} agregados={agregados}")

    return {"quitados": quitados, "agregados": agregados, "sinRegistro": sin_registro}
