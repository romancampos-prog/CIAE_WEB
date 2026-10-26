"""
Generar (o regenerar) todos los indicadores de FTP de una categoria, uno tras otro, juntando
sus restricciones.
Usado en: Controller/ftp_Controller.py
"""
from fastapi import HTTPException

from schemas.model.generacion_ftp_Model import ResultadoCategoria, ResultadoGeneracion
from services.ftp.generar_indicador_ftp_Services import generar_indicador_ftp
from services.informacion.lista_indicadores_Services import todos_los_indicadores
from shared.validarArchivo_service import exigir_contrasena


def generar_categoria(categoria: str, ano: str, mes: str, semana: str | None = None) -> tuple[bool, str, dict]:
    """Endpoint de generar todos los indicadores de una categoria, uno tras otro; regresa (exito, mensaje, datos)."""

    # 2. Leer el mapeo: los indicadores de FTP de la categoria
    categoria_ftp = None

    for familia in todos_los_indicadores("mostrarGenerar", "ftp"):
        if familia.categoriaIndicador == categoria:
            categoria_ftp = familia
            break

    if not categoria_ftp:
        raise HTTPException(status_code=404, detail=f"Categoría '{categoria}' no encontrada")

    # Pasos 3 a 6 de cada indicador en generar_indicador_ftp; si uno falla los demas siguen
    resultados: dict[str, ResultadoGeneracion | str] = {}

    for indicador in categoria_ftp.indicadores:
        try:
            resultados[indicador] = generar_indicador_ftp(indicador, ano, mes, semana)
        except Exception as error:
            resultados[indicador] = str(error)

    # 7. Auditoría y respuesta: las restricciones de todos se agrupan por tipo, con la unidad
    #    marcada "indicador / unidad"
    generada = ResultadoCategoria(completados=[])

    for indicador, resultado in resultados.items():
        if isinstance(resultado, str):
            generada.errores[indicador] = resultado
            continue

        generada.completados.append(indicador)

        if not resultado.errores:
            continue

        generada.errores[indicador] = resultado.errores

        for tipo, error in resultado.errores.items():
            if tipo not in generada.restricciones:
                generada.restricciones[tipo] = error.model_copy(update={"unidades": {}})
            for unidad, rutas in error.unidades.items():
                generada.restricciones[tipo].unidades[f"{indicador} / {unidad}"] = rutas

    if not generada.completados:
        return False, "Ningún indicador pudo generarse", {"errores": generada.errores}

    return True, "Categoría generada", generada.model_dump()


##--------------------------------------

def regenerar_categoria(usuario: str | None, password: str, categoria: str, ano: str, mes: str) -> tuple[bool, str, dict]:
    """Endpoint de regenerar el mes definitivo de una categoria ya generada; regresa (exito, mensaje, datos)."""

    # 1. Validar lo recibido: pide la contraseña
    exigir_contrasena(usuario, password)

    # Pasos 2 a 7 iguales que generar la categoria
    return generar_categoria(categoria, ano, mes, None)
