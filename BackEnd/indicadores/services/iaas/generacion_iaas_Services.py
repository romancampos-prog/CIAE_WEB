"""
Generacion de los 6 indicadores de IAAS de un mes (servicios de los endpoints de
/Indicadores/iaas): numerador de un Excel por unidad, denominador del Excel global (IAAS 01)
o capturado a mano (IAAS 02-06); calcula y guarda. Ademas el estado del mes (que unidades
quedaron pendientes) para completarlas despues sin resubir todo. El Excel se pide aparte a
/Indicadores/excel.
Usado en: Controller/iaas_Controller.py
"""
import json

from fastapi import HTTPException

from schemas.model.generacion_Model import DenominadoresCapturados, IndicadorGenerarIAAS, ResultadoUnidad, SesionIAAS, UnidadSemaforizada
from services.bd_Ciae_Guardado_Services import guardar_mes_definitivo, leer_historico_indicador, meses_con_datos, nombre_del_mes
from services.calculo_indicador_Services import CLAVE_TOTAL, calcular_unidades
from services.iaas.extraccion_excel_iaas_Services import (
    obtener_denominador_iaas01, obtener_denominador_iaas01_unidad, obtener_numerador, validar_excel_unidad,
)
from services.indicadorMapeo_Services import cargar_indicador_iaas, indicadores_del_modulo
from shared.auditoria_service import registrar
from shared.semaforo_service import semaforizar_unidades
from shared.UNIDADES import ORDEN_DEMAS_IAAS, ORDEN_IAAS01, UNIDADES_SIN_OOAD_IAAS
from shared.validarArchivo_service import exigir_contrasena, validar_archivo_subido

INDICADORES_IAAS = [f"IAAS 0{n}" for n in range(1, 7)]


def indicadores_para_generar() -> list[IndicadorGenerarIAAS]:
    """Lo comun del mapeo mas los rotulos de columnas del Excel que se sube."""
    lista = []
    for base in indicadores_del_modulo("iaas"):
        excel = cargar_indicador_iaas(base.indicador).excel
        lista.append(IndicadorGenerarIAAS(
            **base.model_dump(), columnaNumerador=excel.columnaNumerador, columnaDenominador=excel.columnaDenominador,
        ))
    return lista


##--------------------------------------

def leer_mes_guardado_iaas(anio: str, mes_nombre: str) -> dict[str, dict[str, UnidadSemaforizada]]:
    """{indicador: {unidad: UnidadSemaforizada}} de lo ya guardado ese mes; {} por indicador si no hay nada."""
    datos: dict[str, dict[str, UnidadSemaforizada]] = {}
    for indicador in INDICADORES_IAAS:
        mes_data = leer_historico_indicador(indicador, anio).get("MESES", {}).get(mes_nombre, {})
        datos[indicador] = {
            unidad: UnidadSemaforizada(
                numerador=valores.get("numerador"), denominador=valores.get("denominador"),
                resultado=valores.get("%"), color=valores.get("desempeno") or "Gris",
            )
            for unidad, valores in mes_data.get("Reporte", {}).items()
        }
    return datos


##--------------------------------------

def pendientes_del_mes(datos_mes: dict[str, dict[str, UnidadSemaforizada]]) -> tuple[list[str], dict[str, list[str]]]:
    """
    Unidades con algun indicador sin denominador ese mes: el numerador puede faltar porque la
    unidad no subio su Excel, pero el denominador en None es la señal real de "faltó algo".
    Regresa (unidades, {unidad: [indicadores pendientes]}).
    """
    if not any(datos_mes.values()):
        return [], {}

    pendientes: dict[str, list[str]] = {}
    for unidad in ORDEN_DEMAS_IAAS:
        faltan = []
        for indicador in INDICADORES_IAAS:
            dato = datos_mes.get(indicador, {}).get(unidad)
            if dato is None or dato.denominador is None:
                faltan.append(indicador)
        if faltan:
            pendientes[unidad] = faltan
    return list(pendientes), pendientes


##--------------------------------------

def meses_generados_iaas(anio: str) -> list[str]:
    """
    Meses con reporte guardado ese año ("01".."12"): los 6 indicadores siempre se generan
    juntos, asi que basta con el primero que tenga datos.
    """
    for indicador in INDICADORES_IAAS:
        meses = meses_con_datos(indicador, anio)
        if meses:
            return sorted(meses, key=int)
    return []


##--------------------------------------

def estado_del_mes(anio: str, mes: str) -> SesionIAAS | None:
    """Lo guardado y lo pendiente del mes, para el modal de unidades tardias. None si no hay nada."""
    mes_nombre = nombre_del_mes(mes)
    datos_mes  = leer_mes_guardado_iaas(anio, mes_nombre)
    pendientes, indicadores_pendientes = pendientes_del_mes(datos_mes)

    numeradores_guardados:   dict[str, dict[str, float | None]] = {}
    denominadores_guardados: dict[str, dict[str, float | None]] = {}
    for indicador, unidades in datos_mes.items():
        for unidad, dato in unidades.items():
            if unidad == CLAVE_TOTAL:
                continue
            numeradores_guardados.setdefault(unidad, {})[indicador]   = dato.numerador
            denominadores_guardados.setdefault(unidad, {})[indicador] = dato.denominador

    if not numeradores_guardados and not pendientes:
        return None

    return SesionIAAS(
        anio=anio, mes=mes, mes_nombre=mes_nombre,
        unidades_pendientes=pendientes, indicadores_pendientes=indicadores_pendientes,
        denominadores_guardados=denominadores_guardados, numeradores_guardados=numeradores_guardados,
    )


##--------------------------------------

def _unidades_del_indicador(indicador: str, numerador: dict, denominador: dict) -> list[str]:
    """
    Las unidades esperadas del indicador mas las que traigan dato: una unidad esperada sin
    numerador o denominador queda Gris, no como un 0 que nunca se reporto.
    """
    unidades = list(ORDEN_IAAS01 if indicador == "IAAS 01" else ORDEN_DEMAS_IAAS)
    for unidad in [*numerador, *denominador]:
        if unidad not in unidades:
            unidades.append(unidad)
    return unidades


##--------------------------------------

def generar_iaas(
    usuario: str | None, anio: str, mes: str, archivos_numerador: list[tuple[str, bytes]], pesos_numerador: list[int],
    denominador: str | None, excel_denominador_iaas01: bytes | None, peso_denominador_iaas01: int | None,
) -> tuple[str, dict]:
    """Endpoint de generar el mes: un Excel por unidad (el nombre del archivo es la unidad) + denominadores; regresa (mensaje, datos)."""
    # 1. Validar lo recibido
    if len(archivos_numerador) != len(pesos_numerador):
        raise HTTPException(status_code=400, detail="Falta el peso declarado de alguno de los archivos")
    for (unidad, contenido), peso in zip(archivos_numerador, pesos_numerador):
        validar_archivo_subido(contenido, peso, etiqueta=unidad)
    if excel_denominador_iaas01 is not None:
        validar_archivo_subido(excel_denominador_iaas01, peso_denominador_iaas01, etiqueta="Archivo del denominador")
    numerador_por_unidad = dict(archivos_numerador)
    # {indicador: {unidad: valor}}; un denominador vacio/0 cuenta como "sin capturar", no como cero real
    denominador_capturado: DenominadoresCapturados = json.loads(denominador) if denominador else {}

    for indicador in INDICADORES_IAAS:
        # 2. Leer el mapeo
        mapeo = cargar_indicador_iaas(indicador)

        # 3. Extracción: el denominador de IAAS 01 sale del Excel global y el de 02-06 de lo
        #    capturado; el numerador cuenta las filas del Excel de cada unidad
        if indicador == "IAAS 01":
            denominador_ind = obtener_denominador_iaas01(excel_denominador_iaas01) if excel_denominador_iaas01 else {}
        else:
            denominador_ind = {}
            for unidad, valor in denominador_capturado.get(indicador, {}).items():
                if valor:
                    denominador_ind[unidad] = int(valor)
        numerador = obtener_numerador(numerador_por_unidad, indicador)

        # 4. Cálculo del resultado: las de menos de 20 camas se calculan pero no suman al TOTAL_OOAD
        unidades = _unidades_del_indicador(indicador, numerador, denominador_ind)
        resultados = calcular_unidades(numerador, denominador_ind, mapeo.reporte.operacion.resultado,
                                       unidades=unidades, excluidas_del_total=UNIDADES_SIN_OOAD_IAAS)

        # 5. Semaforización
        semaforizadas = semaforizar_unidades(resultados, mapeo.semaforo)

        # 6. Guardado en BD_CIAE
        guardar_mes_definitivo(indicador, anio, mes, semaforizadas)

    # 7. Auditoría y respuesta: con las unidades que quedaron pendientes
    pendientes, _ = pendientes_del_mes(leer_mes_guardado_iaas(anio, nombre_del_mes(mes)))
    registrar("SUBIDA_ARCHIVO", usuario=usuario, detalle=f"IAAS/generar anio={anio} mes={mes} archivos={len(numerador_por_unidad)}")
    return "Reporte IAAS generado", {"mensaje": "Reporte IAAS generado", "unidades_pendientes": pendientes}


##--------------------------------------

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
        unidades = _unidades_del_indicador(indicador, numerador_ind, denominador_ind)
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
