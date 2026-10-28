"""
Generar los 6 indicadores de IAAS de un mes: numerador de un Excel por unidad, denominador del
Excel global (IAAS 01) o capturado a mano (IAAS 02-06); calcula, semaforiza y guarda.
Usado en: Controller/iaas_Controller.py
"""
import json

from fastapi import HTTPException

from compartido.auditoria_Services import registrar
from compartido.validar_archivo_Services import validar_archivo_subido
from datos.bd_ciae.guardar_mes_Datos import guardar_mes_definitivo
from datos.lectura_mapeo.mapeo_por_modulo_Datos import cargar_indicador_iaas
from schemas.model.iaas_Model import DenominadoresCapturados
from services.calculo.resultado_unidades_Services import calcular_unidades
from services.iaas.catalogo_iaas_Services import INDICADORES_IAAS, unidades_del_indicador
from services.iaas.estado_mes_iaas_Services import leer_mes_guardado_iaas, pendientes_del_mes
from services.iaas.numerador_denominador_iaas_Services import obtener_denominador_iaas01, obtener_numerador
from services.semaforo.color_semaforo_Services import semaforizar_unidades
from shared.MESES import nombre_del_mes
from shared.UNIDADES import UNIDADES_SIN_OOAD_IAAS


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
        unidades = unidades_del_indicador(indicador, numerador, denominador_ind)
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
