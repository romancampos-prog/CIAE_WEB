"""
Orquestador del motor Extractor: procesa el Excel mensual subido (SUI-13 + Egresos
opcional) para TODOS los indicadores del extractor a la vez -- ver
corte_extractor_Services.indicadores_extractor(). Cada indicador decide que hacer
segun la periodicidad de su mapeo:
  - de corte (Semestral Anualizado: EH 03, DM 04): guarda el numerador crudo del mes
    y genera el corte cuando ya esta completa su ventana de 12 meses.
  - mensual (MT 03): cuenta numerador y denominador del mismo archivo, calcula,
    semaforiza y guarda el mes completo (mismo formato que FTP/IAAS).
  - mensual con dos archivos (Neonatal 06): cada archivo guarda su lado y el mes se
    genera cuando ya estan los dos (ver _procesar_mes_por_partes).
  - mensual anualizado (Neonatal 06): cada mes se reporta con la suma de sus ultimos
    12 meses; se genera cuando la ventana esta completa (ver _procesar_anualizado).
El cruce con Egresos lo pide el mapeo (cruce.activa), no la periodicidad.
Usado en: Controller/extractor_Controller.py
"""
from schemas.model.generacion_ftp_Model import ResultadoUnidad
from schemas.model.reporte_mapeo_Model import FuenteExtractor, IndicadorExtractorMapeo
from services.bd_Ciae_Guardado_Services import guardar_mes_definitivo
from services.calculo_indicador_Services import CLAVE_TOTAL, agregar_total_ooad, calcular_resultado, semaforizar_unidades
from services.extractor.corte_extractor_Services import (
    archivo_denominador_aparte, archivos_del_indicador, indicadores_extractor, nombre_archivo, _ventanas_de_mes, intentar_generar_corte,
)
from services.extractor.extraccion_extractor_Services import (
    LectorExcel, contar_filtro_conteo_acumulado, contar_por_unidad, validar_candidatos_cruce,
)
from services.extractor.guardado_extractor_Services import (
    guardar_numerador_mes, guardar_parte_mes, guardar_pendiente_cruce, leer_partes, leer_pendiente_cruce, leer_reporte,
)
from services.indicadorMapeo_Services import cargar_indicador_extractor
from shared.MESES import MESES_ESTANDAR
from shared.reglas_periodicidad import clave_periodicidad, es_periodicidad_de_corte

# Lo que el Extractor sabe procesar hoy; otra periodicidad en un indicador
# "Extractor" es un error claro, no un guardado a medias.
PERIODICIDADES_CORTE_SOPORTADAS  = {"semestral anualizado"}   # ventana_corte solo arma Junio/Diciembre
PERIODICIDADES_MENSUAL_SOPORTADAS = {"mensual", "mensual mensual acumulado", "mensual anualizado"}
ANUALIZADO = "mensual anualizado"   # cada mes = ese mes + los 11 anteriores (Neonatal 06)


def _cruce_cfg(mapeo: IndicadorExtractorMapeo) -> dict | None:
    """El bloque 'cruce' del mapeo si el indicador lo tiene activo; None si no usa cruce."""
    cruce = (mapeo.reporte.numerador.model_extra or {}).get("cruce") or {}
    return cruce if cruce.get("activa") else None


def _sumar_validados(via1: dict, candidatos: list[dict], lector_cruce: LectorExcel, cruce_cfg: dict) -> tuple[dict, int]:
    """Via 1 + los candidatos que el archivo de cruce confirma (via 2). Regresa (conteo, cuantos se validaron)."""
    conteo = dict(via1)
    validados = validar_candidatos_cruce(candidatos, lector_cruce, cruce_cfg) if candidatos else {}
    for unidad, cantidad in validados.items():
        conteo[unidad] = conteo.get(unidad, 0) + cantidad
    return conteo, sum(validados.values())


def _guardar_y_cortar(indicador: str, anio: int, mes_nombre: str, conteo: dict, cruce_aplicado: bool | None) -> dict:
    """Guarda el numerador crudo del mes y genera/recalcula los cortes que lo incluyen."""
    guardar_numerador_mes(indicador, anio, mes_nombre, conteo, cruce_aplicado=cruce_aplicado)

    corte = intentar_generar_corte(indicador, anio, mes_nombre)

    # Si este mes ya pertenece a algun corte que YA estaba cerrado (ej. se
    # corrige Marzo despues de que el corte de Junio ya se genero), se
    # recalcula tambien -- intentar_generar_corte siempre relee los 12 meses
    # guardados y sobreescribe; si la ventana de ese otro corte todavia no esta
    # completa, no hace nada (regresa None).
    cortes_recalculados = []
    for mes_c, anio_c in _ventanas_de_mes(mes_nombre, anio):
        if (mes_c, anio_c) == (mes_nombre, anio):
            continue  # ese es el que ya se intento arriba
        if intentar_generar_corte(indicador, anio_c, mes_c) is not None:
            cortes_recalculados.append(f"{mes_c} {anio_c}")

    return {"corte_generado": corte is not None, "corte": corte, "cortes_recalculados": cortes_recalculados}


def _procesar_corte(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                    lector: LectorExcel, lector_cruce: LectorExcel | None) -> dict:
    """
    Indicador por corte: numerador crudo del mes y, si aplica, el corte. Si usa cruce,
    deja guardados via 1 + candidatos para que el Egresos se pueda subir despues
    (aplicar_cruce_mes); si el Egresos vino junto, el cruce se hace de una vez.
    """
    config_numerador = mapeo.reporte.numerador.model_dump()
    via1, candidatos = contar_filtro_conteo_acumulado(lector, config_numerador, anio=anio, mes_nombre=mes_nombre)

    cruce_cfg = _cruce_cfg(mapeo)
    conteo, validados = via1, 0
    if cruce_cfg:
        guardar_pendiente_cruce(indicador, anio, mes_nombre, via1, candidatos)
        if lector_cruce is not None:
            conteo, validados = _sumar_validados(via1, candidatos, lector_cruce, cruce_cfg)

    cruce_aplicado = (lector_cruce is not None) if cruce_cfg else None
    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "corte",
        "numerador_por_unidad": conteo,
        "candidatos_via2": len(candidatos),
        "validados_via2": validados,
        "cruce_pendiente": cruce_aplicado is False,
        **_guardar_y_cortar(indicador, anio, mes_nombre, conteo, cruce_aplicado),
    }


def _procesar_mes_completo(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                           lector: LectorExcel) -> dict:
    """Indicador mensual: numerador y denominador del mismo archivo -> resultado y semaforo del mes."""
    if not isinstance(mapeo.reporte.denominador, FuenteExtractor):
        raise ValueError(f"{indicador}: un indicador mensual del Extractor necesita el denominador del mismo archivo (fuente 'extractor').")

    numerador   = contar_por_unidad(lector, mapeo.reporte.numerador.model_dump(), anio, mes_nombre)
    denominador = contar_por_unidad(lector, mapeo.reporte.denominador.model_dump(), anio, mes_nombre)
    return _calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, numerador, denominador)


def _procesar_mes_por_partes(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                             lector: LectorExcel, archivo: str) -> dict:
    """
    Indicador mensual con numerador y denominador en archivos distintos (Neonatal 06:
    Defunciones / Nacimientos): cuenta el lado que trae este archivo, lo guarda y, si
    el otro archivo del mes ya se habia subido, genera el mes. Da igual cual se suba primero.
    """
    partes = {}
    for lado in ("numerador", "denominador"):
        fuente = getattr(mapeo.reporte, lado)
        if fuente.archivo == archivo:
            conteo = contar_por_unidad(lector, fuente.model_dump(), anio, mes_nombre)
            partes = guardar_parte_mes(indicador, anio, mes_nombre, lado, conteo)

    if clave_periodicidad(mapeo.periodicidad) == ANUALIZADO:
        return _procesar_anualizado(indicador, mapeo, anio, mes_nombre, partes)

    aviso = _aviso_lado_faltante(mapeo, partes, mes_nombre)
    if aviso:
        return _resultado_pendiente(indicador, anio, mes_nombre, partes, aviso)
    return _calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, partes["numerador"], partes["denominador"])


def _aviso_lado_faltante(mapeo: IndicadorExtractorMapeo, partes_del_mes: dict, mes_nombre: str) -> str | None:
    faltan = [lado for lado in ("numerador", "denominador") if lado not in partes_del_mes]
    if not faltan:
        return None
    archivo_faltante = nombre_archivo(getattr(mapeo.reporte, faltan[0]).archivo)
    return (f"Se guardó el {'denominador' if faltan == ['numerador'] else 'numerador'} de {mes_nombre}. "
            f"Falta subir el {archivo_faltante} de {mes_nombre} para generar el mes.")


def _resultado_pendiente(indicador: str, anio: int, mes_nombre: str, partes_del_mes: dict, aviso: str) -> dict:
    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "mensual",
        "numerador_por_unidad": partes_del_mes.get("numerador", {}),
        "denominador_por_unidad": partes_del_mes.get("denominador", {}),
        "pendiente": aviso,
        "corte_generado": False,
        "cortes_recalculados": [],
    }


def _ventana_anualizada(mes_nombre: str, anio: int) -> list[tuple[str, int]]:
    """El mes y sus 11 anteriores, del mas viejo al mas nuevo: Junio 2026 -> Julio 2025 .. Junio 2026."""
    i = MESES_ESTANDAR.index(mes_nombre)
    return [(MESES_ESTANDAR[(i - k) % 12], anio + (i - k) // 12) for k in range(11, -1, -1)]


def _generar_anualizado(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                        partes_de) -> tuple[dict | None, list[str]]:
    """Suma los 12 meses de la ventana y guarda el mes; (None, meses que faltan) si la ventana no esta completa."""
    ventana = _ventana_anualizada(mes_nombre, anio)
    faltan = [f"{m} {a}" for m, a in ventana if not {"numerador", "denominador"} <= partes_de(a).get(m, {}).keys()]
    if faltan:
        return None, faltan

    numerador, denominador = {}, {}
    for m, a in ventana:
        for suma, lado in ((numerador, "numerador"), (denominador, "denominador")):
            for unidad, cantidad in partes_de(a)[m][lado].items():
                suma[unidad] = suma.get(unidad, 0) + cantidad
    return _calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, numerador, denominador), []


def _procesar_anualizado(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str, partes_del_mes: dict) -> dict:
    """
    Mensual anualizado: el mes se reporta con sus ultimos 12 meses. Ademas, este mes
    entra en la ventana de los 11 siguientes: si ya estaban completos se recalculan, y
    si era el que les faltaba (ej. se suben al final los meses del año anterior) se generan.
    """
    leidas: dict[int, dict] = {}
    partes_de = lambda a: leidas.setdefault(a, leer_partes(indicador, a))

    resultado, faltan = _generar_anualizado(indicador, mapeo, anio, mes_nombre, partes_de)
    otros = [f"{m} {a}" for m, a in _meses_siguientes(mes_nombre, anio, 11) if _generar_anualizado(indicador, mapeo, a, m, partes_de)[0]]
    tambien = (f" También quedó generado {otros[0]}." if len(otros) == 1
               else f" También quedaron generados {', '.join(otros)}." if otros else "")

    if resultado:
        inicio = _ventana_anualizada(mes_nombre, anio)[0]
        return {**resultado, "detalle": f"Suma de {inicio[0]} {inicio[1]} a {mes_nombre} {anio}.{tambien}"}

    aviso = _aviso_lado_faltante(mapeo, partes_del_mes, mes_nombre) or (
        f"Se guardó {mes_nombre} {anio}. Para reportarlo "
        f"{'falta 1' if len(faltan) == 1 else f'faltan {len(faltan)}'} de sus 12 meses: {', '.join(faltan)}.")
    return _resultado_pendiente(indicador, anio, mes_nombre, partes_del_mes, aviso + tambien)


def _meses_siguientes(mes_nombre: str, anio: int, cuantos: int) -> list[tuple[str, int]]:
    i = MESES_ESTANDAR.index(mes_nombre)
    return [(MESES_ESTANDAR[(i + k) % 12], anio + (i + k) // 12) for k in range(1, cuantos + 1)]


def _calcular_y_guardar_mes(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                            numerador: dict, denominador: dict) -> dict:
    formula = mapeo.reporte.operacion.resultado
    cero_es_sin_dato = bool((mapeo.reporte.denominador.model_extra or {}).get("ceroEsSinDato"))

    resultados: dict[str, ResultadoUnidad] = {}
    for unidad in dict.fromkeys([*numerador, *denominador]):
        num, den = numerador.get(unidad), denominador.get(unidad)
        sin_a_quien_medir = cero_es_sin_dato and den == 0
        resultados[unidad] = ResultadoUnidad(
            numerador=num, denominador=den,
            resultado=None if sin_a_quien_medir else calcular_resultado(num, den, formula),
        )
    resultados[CLAVE_TOTAL] = agregar_total_ooad(resultados, formula)

    mes_num = MESES_ESTANDAR.index(mes_nombre) + 1
    semaforizadas = semaforizar_unidades(resultados, mapeo.semaforo, mes=mes_num)
    guardar_mes_definitivo(indicador, str(anio), f"{mes_num:02d}", semaforizadas)

    total = semaforizadas[CLAVE_TOTAL]
    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "mensual",
        "numerador_por_unidad": numerador,
        "denominador_por_unidad": denominador,
        "total": {"numerador": total.numerador, "denominador": total.denominador, "%": total.resultado, "desempeno": total.color},
        "corte_generado": False,
        "cortes_recalculados": [],
    }


def _procesar_indicador(indicador: str, anio: int, mes_nombre: str, lector: LectorExcel, lector_cruce: LectorExcel | None,
                        archivo: str) -> dict:
    mapeo = cargar_indicador_extractor(indicador)
    periodicidad = clave_periodicidad(mapeo.periodicidad)

    if es_periodicidad_de_corte(mapeo.periodicidad):
        if periodicidad not in PERIODICIDADES_CORTE_SOPORTADAS:
            raise ValueError(f"{indicador}: la periodicidad '{mapeo.periodicidad}' no está soportada por el Extractor.")
        return _procesar_corte(indicador, mapeo, anio, mes_nombre, lector, lector_cruce)

    if periodicidad not in PERIODICIDADES_MENSUAL_SOPORTADAS:
        raise ValueError(f"{indicador}: la periodicidad '{mapeo.periodicidad}' no está soportada por el Extractor.")
    # Anualizado necesita guardar los conteos de cada mes para sumar la ventana, aunque salgan del mismo archivo.
    if archivo_denominador_aparte(indicador) or periodicidad == ANUALIZADO:
        return _procesar_mes_por_partes(indicador, mapeo, anio, mes_nombre, lector, archivo)
    return _procesar_mes_completo(indicador, mapeo, anio, mes_nombre, lector)


def indicadores_con_cruce() -> list[str]:
    """Indicadores del Extractor cuyo mapeo pide cruce (cruce.activa) -- los que usan el Egresos."""
    return [ind for ind in indicadores_extractor() if _cruce_cfg(cargar_indicador_extractor(ind))]


def aplicar_cruce_mes(anio: int, mes_nombre: str, contenido_cruce_bytes: bytes) -> dict:
    """
    Egresos subido por separado: para cada indicador con cruce, toma la via 1 y los
    candidatos que dejo el SUI-13 de ese mes, los cruza contra este archivo, guarda el
    mes completo y genera/recalcula el corte. Si un indicador falla, los demas siguen.
    """
    lector_cruce = LectorExcel(contenido_cruce_bytes)
    resultados = {}
    for indicador in indicadores_con_cruce():
        try:
            pendiente = leer_pendiente_cruce(indicador, anio, mes_nombre)
            if pendiente is None:
                raise ValueError(f"No hay SUI-13 de {mes_nombre} {anio} procesado para {indicador}: súbelo primero.")
            mapeo = cargar_indicador_extractor(indicador)
            conteo, validados = _sumar_validados(pendiente["via1"], pendiente["candidatos"], lector_cruce, _cruce_cfg(mapeo))
            resultados[indicador] = {
                "indicador": indicador,
                "anio": anio,
                "mes": mes_nombre,
                "tipo": "corte",
                "numerador_por_unidad": conteo,
                "candidatos_via2": len(pendiente["candidatos"]),
                "validados_via2": validados,
                "cruce_pendiente": False,
                **_guardar_y_cortar(indicador, anio, mes_nombre, conteo, True),
            }
        except (FileNotFoundError, KeyError, ValueError) as exc:
            resultados[indicador] = {"indicador": indicador, "anio": anio, "mes": mes_nombre, "error": str(exc)}
    return resultados


def estado_archivos(anio: int) -> dict:
    """
    Por cada archivo que usa el Extractor y cada mes del año, si ya esta subido:
      - SUI-13 (principal): "completo" si el mes esta en TODOS los indicadores,
        "parcial" si falta en alguno (ej. un indicador nuevo que no se ha reprocesado),
        "pendiente" si no esta en ninguno. 'faltan' dice en cuales falta.
      - archivo de cruce (Egresos): "completo" si ya se cruzo en todos sus indicadores,
        "pendiente" si el SUI-13 esta pero falta el cruce, "sin_principal" si ni el
        SUI-13 se ha subido, "sin_registro" si el mes se subio antes de que existiera
        la marca CRUCE (no se sabe si llevaba Egresos).
    """
    todos = indicadores_extractor()
    reportes = {ind: leer_reporte(ind, anio) for ind in todos}
    partes = {
        ind: leer_partes(ind, anio) for ind in todos
        if archivo_denominador_aparte(ind) or clave_periodicidad(cargar_indicador_extractor(ind).periodicidad) == ANUALIZADO
    }

    def subido(ind: str, clave: str, mes: str) -> bool:
        # Con dos archivos o anualizado (Neonatal 06), cada archivo se marca por SU lado, no por
        # el mes generado: un anualizado puede tener el archivo subido y aun no su ventana completa.
        if ind not in partes:
            return mes in reportes[ind].get("MESES", {})
        fuentes = cargar_indicador_extractor(ind).reporte
        lados = [lado for lado in ("numerador", "denominador") if getattr(fuentes, lado).archivo == clave]
        return all(lado in partes[ind].get(mes, {}) for lado in lados)

    # Un bloque por archivo base (SUI-13, Egresos TOCO...): cada uno solo con los
    # indicadores que el mapeo le asigna (incluido el denominador que venga de otro archivo).
    por_base: dict[str, list[str]] = {}
    for ind in todos:
        for clave in archivos_del_indicador(ind):
            por_base.setdefault(clave, []).append(ind)

    archivos = []
    for clave, inds in por_base.items():
        meses = []
        for mes in MESES_ESTANDAR:
            faltan = [ind for ind in inds if not subido(ind, clave, mes)]
            estado = "pendiente" if len(faltan) == len(inds) else "parcial" if faltan else "completo"
            meses.append({"mes": mes, "estado": estado, "faltan": faltan})
        archivos.append({
            "archivo": nombre_archivo(clave), "prefijoArchivo": clave, "tipo": "principal", "requerido": True,
            "uso": f"Base de {', '.join(inds)}", "indicadores": inds, "meses": meses,
        })

    # Un bloque por archivo de cruce distinto (hoy solo Egresos); si mañana un
    # indicador pide otro, aparece solo porque sale del mapeo.
    por_archivo: dict[str, list[str]] = {}
    for ind in todos:
        cruce = _cruce_cfg(cargar_indicador_extractor(ind))
        if cruce:
            por_archivo.setdefault(cruce.get("archivoCruce"), []).append(ind)

    for archivo_cruce, inds in por_archivo.items():
        meses = []
        for mes in MESES_ESTANDAR:
            marcas = [reportes[i].get("CRUCE", {}).get(mes) for i in inds]
            con_principal = [mes in reportes[i].get("MESES", {}) for i in inds]
            if not all(con_principal):
                estado = "sin_principal"
            elif all(m is True for m in marcas):
                estado = "completo"
            elif any(m is False for m in marcas):
                estado = "pendiente"
            else:
                estado = "sin_registro"
            meses.append({"mes": mes, "estado": estado})
        archivos.append({
            "archivo": nombre_archivo(archivo_cruce), "prefijoArchivo": archivo_cruce, "tipo": "cruce", "requerido": False,
            "uso": "Cruce para validar la vía 2", "indicadores": inds, "meses": meses,
        })

    return {"anio": anio, "archivos": archivos}


def archivos_base() -> list[str]:
    """Claves de los archivos base que piden los indicadores del Extractor (SUI_13, EGRESOS_TOCO...)."""
    return list(dict.fromkeys(clave for ind in indicadores_extractor() for clave in archivos_del_indicador(ind)))


def procesar_archivo_mensual(anio: int, mes_nombre: str, contenido_bytes: bytes, contenido_cruce_bytes: bytes | None = None,
                              indicadores: list[str] | None = None, archivo: str = "SUI_13") -> dict:
    """
    Punto de entrada del controller: el Excel del mes de un archivo base (+ su
    cruce) se procesa para los indicadores que el mapeo le asigna a ESE archivo,
    leyendo cada hoja una sola vez. Si uno falla, los demas se guardan igual: su
    resultado trae {"indicador", "error"} en vez de los conteos.
    """
    if archivo not in archivos_base():
        raise ValueError(f"'{archivo}' no es un archivo del Extractor -- opciones: {archivos_base()}")
    indicadores = indicadores or [ind for ind in indicadores_extractor() if archivo in archivos_del_indicador(ind)]
    lector = LectorExcel(contenido_bytes)
    lector_cruce = LectorExcel(contenido_cruce_bytes) if contenido_cruce_bytes else None

    resultados = {}
    for indicador in indicadores:
        try:
            resultados[indicador] = _procesar_indicador(indicador, anio, mes_nombre, lector, lector_cruce, archivo)
        except (FileNotFoundError, KeyError, ValueError) as exc:
            resultados[indicador] = {"indicador": indicador, "anio": anio, "mes": mes_nombre, "error": str(exc)}
    return resultados
