"""
Completar una unidad de IAAS que entrego tarde: sobrescribe lo guardado de esa unidad en los
indicadores elegidos y recalcula el mes (pide contraseña).
Usado en: Controller/iaas_Controller.py
"""
import json

from fastapi import HTTPException

from compartido.auditoria_Services import registrar
from compartido.validar_archivo_Services import exigir_contrasena, validar_archivo_subido
from datos.bd_ciae.guardar_mes_Datos import guardar_mes_definitivo
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_iaas
from schemas.model.unidad_resultado_Model import ResultadoUnidad
from services.calculo.resultado_unidades_Services import CLAVE_TOTAL, calcular_unidades
from services.iaas.catalogo_iaas_Services import unidades_del_indicador
from services.iaas.estado_mes_iaas_Services import leer_mes_guardado_iaas, pendientes_del_mes
from services.iaas.leer_excel_iaas_Services import validar_excel_unidad
from services.iaas.numerador_denominador_iaas_Services import obtener_denominador_iaas01_unidad, obtener_numerador
from services.semaforo.color_semaforo_Services import semaforizar_unidades
from shared.MESES import nombre_del_mes
from shared.UNIDADES import UNIDADES_SIN_OOAD_IAAS


def completar_unidad_tardia(
    usuario: str | None, password: str, anio: str, mes: str, unidad: str, indicadores: str, denominadores: str,
    excel_unidad: bytes | None, peso_excel_unidad: int | None, excel_denominador_iaas01: bytes | None, peso_denominador_iaas01: int | None,
) -> tuple[str, dict]:
    """Endpoint de completar una unidad que entrego tarde (sobrescribe lo guardado); regresa (mensaje, datos)."""

    # 1. Validar lo recibido: contraseña, lo capturado, los archivos y que el mes ya este generado
    exigir_contrasena(usuario, password)
    indicadores_seleccionados: list[str] = json.loads(indicadores)
    denominadores_capturados: dict = json.loads(denominadores)

    if excel_unidad is not None:
        validar_archivo_subido(excel_unidad, peso_excel_unidad, etiqueta="Archivo de la unidad")
    if excel_denominador_iaas01 is not None:
        validar_archivo_subido(excel_denominador_iaas01, peso_denominador_iaas01, etiqueta="Archivo del denominador")

    mes_nombre   = nombre_del_mes(mes)
    datos_sesion = leer_mes_guardado_iaas(anio, mes_nombre)

    if not any(datos_sesion.values()):
        raise HTTPException(status_code=400, detail=f"No hay sesión guardada para {mes_nombre} {anio}. Genera el reporte completo primero.")
    if excel_unidad is not None and indicadores_seleccionados:
        validar_excel_unidad(excel_unidad, unidad, indicadores_seleccionados[0])

    # 3. Extracción: nuevo numerador/denominador de la unidad en cada indicador elegido (si no
    #    se manda, se queda el guardado). Todos antes de guardar: si un archivo esta mal no se guarda nada.
    for indicador in indicadores_seleccionados:
        anterior = datos_sesion.get(indicador, {}).get(unidad)
        numerador_anterior = anterior.numerador if anterior else None
        denominador_anterior = anterior.denominador if anterior else None

        if excel_unidad is not None:
            numeros = obtener_numerador({unidad: excel_unidad}, indicador)
            numerador = numeros.get(unidad) if indicador == "IAAS 01" else numeros.get(unidad, 0)
        else:
            numerador = numerador_anterior

        if indicador == "IAAS 01":
            denominador = (obtener_denominador_iaas01_unidad(excel_denominador_iaas01, unidad)
                           if excel_denominador_iaas01 is not None else denominador_anterior)
        elif indicador in denominadores_capturados:
            # None explicito = el usuario lo marco 'sin dato' a proposito (no se reutiliza lo guardado)
            nuevo = denominadores_capturados[indicador]
            texto = None if nuevo is None else str(nuevo).strip()
            denominador = None if texto is None else int(texto) if texto.isdigit() else denominador_anterior
        else:
            denominador = denominador_anterior

        if indicador not in datos_sesion:
            datos_sesion[indicador] = {}

        datos_sesion[indicador][unidad] = ResultadoUnidad(numerador=numerador, denominador=denominador)

    for indicador in indicadores_seleccionados:
        # 4. Cálculo del resultado del mes con la unidad ya completada (formula del mapeo)
        mapeo = cargar_indicador_iaas(indicador)
        numerador_ind, denominador_ind = {}, {}

        for unidad_guardada, dato in datos_sesion.get(indicador, {}).items():
            if unidad_guardada == CLAVE_TOTAL:
                continue
            if dato.numerador is not None:
                numerador_ind[unidad_guardada] = dato.numerador
            if dato.denominador is not None:
                denominador_ind[unidad_guardada] = dato.denominador

        unidades = unidades_del_indicador(indicador, numerador_ind, denominador_ind)
        resultados = calcular_unidades(numerador_ind, denominador_ind, mapeo.reporte.operacion.resultado,
                                       unidades=unidades, excluidas_del_total=UNIDADES_SIN_OOAD_IAAS)

        # 5. Semaforización
        semaforizadas = semaforizar_unidades(resultados, mapeo.semaforo)

        # 6. Guardado en BD_CIAE
        guardar_mes_definitivo(indicador, anio, mes, semaforizadas)

    # 7. Auditoría y respuesta
    pendientes, _ = pendientes_del_mes(leer_mes_guardado_iaas(anio, mes_nombre))
    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"IAAS/completar-unidad unidad={unidad} anio={anio} mes={mes}")

    return f"Unidad {unidad} actualizada en {mes_nombre} {anio}", {"unidades_pendientes": pendientes}
