"""
La ficha de un indicador para el front (titulo, objetivo, semaforo...) y la ficha tecnica
completa (ademas, como se calcula).
Usado en: Controller/informacion_Controller.py, services/grafica/grafica_indicador_Services.py
"""
from datos.lectura_mapeo.mapeo_indicadores_Datos import bloque_mapeo, catalogo_archivos_extractor
from schemas.model.ficha_indicador_Model import FichaTecnicaCompleta, FuenteCalculo, InfoIndicador, ReporteFicha
from services.compartido.semaforo.umbrales_semaforo_Services import es_agrupado
from shared.UNIDADES import UNIDAD_TIPO_IAAS01


def obtener_ficha_indicador(indicador: str) -> InfoIndicador | None:
    """Lo visual del indicador: titulo, objetivo, descripcion de numerador y denominador, semaforo..."""
    datoIndicadorJson = bloque_mapeo(indicador)

    if datoIndicadorJson is None:
        return None

    fichaIndicador = InfoIndicador.model_validate(datoIndicadorJson)

    # Semaforo agrupado (hoy solo IAAS 01, por tipo de hospital) -- el front necesita
    # saber a que grupo pertenece cada unidad para pintar el umbral que le toca.
    # es_agrupado necesita el dict CRUDO (fichaIndicador.semaforo ya viene tipado a
    # Semaforo, sus valores dejaron de ser dict). UNIDAD_TIPO_IAAS01 es el unico
    # catalogo de grupos que existe por ahora; si algun dia otro indicador usa un
    # semaforo agrupado con otras unidades, esto hay que generalizarlo a un catalogo
    # por indicador.
    if es_agrupado(datoIndicadorJson.get("semaforo", {})):
        fichaIndicador.grupoDeUnidad = UNIDAD_TIPO_IAAS01

    return fichaIndicador


##--------------------------------------

def obtener_ficha_tecnica_completa(indicador: str) -> FichaTecnicaCompleta | None:
    """
    Ficha técnica completa (para el panel compartido FichaTecnicaBoton, usado
    en FTP/IAAS/Extractor): igual que obtener_ficha_indicador pero además
    incluye reporte.numerador/denominador/operacion -- lo que necesita la
    pestaña "Cálculo" para explicar cómo se saca el indicador.
    reporte queda en None cuando el indicador no está automatizado todavía
    (mostrarGenerar=false, ej. CACU 02 -- su bloque "reporte" viene vacío {}
    en el mapeo).
    """

    dato = bloque_mapeo(indicador)

    if not dato:
        return None

    repCrudo = dato.get("reporte") or {}
    reporte = None

    if repCrudo:
        # Extractor ya no dice hoja (se busca por encabezados): la ficha muestra el nombre del archivo.
        archivos = catalogo_archivos_extractor()
        con_nombre = lambda f: {**f, "nombreArchivo": archivos.get(f.get("archivo"), {}).get("nombre", f.get("archivo"))} if f.get("fuente") == "extractor" else f
        num = con_nombre(repCrudo["numerador"])
        den = con_nombre(repCrudo["denominador"])
        reporte = ReporteFicha(
            numerador=FuenteCalculo(fuente=num.get("fuente", ""), modoExtraccion=num.get("modoExtraccion"), detalle=num),
            denominador=FuenteCalculo(fuente=den.get("fuente", ""), modoExtraccion=den.get("modoExtraccion"), detalle=den),
            operacion=repCrudo["operacion"],
        )

    return FichaTecnicaCompleta(
        modulo=dato.get("modulo", ""),
        fechaModificacion=dato["fechaModificacion"],
        periodicidad=dato["periodicidad"],
        automatizado=bool(repCrudo),
        informacion=dato["informacion"],
        reporte=reporte,
        semaforo=dato["semaforo"],
        columnasPorMes={
            **({"MESES_CIP01": dato["MESES_CIP01"]} if dato.get("MESES_CIP01") else {}),
            **dato.get("COLUMNAS_POR_MES", {}),
        },
    )
