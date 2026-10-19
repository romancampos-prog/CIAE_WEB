"""
Orquestador del motor Extractor (servicios de los endpoints de /Indicadores/extractor): el
Excel del mes de un archivo (SUI-13, Egresos TOCO...) se procesa para los indicadores que el
mapeo le asigna. Cada indicador decide segun la periodicidad de su mapeo:
  - de corte (Semestral Anualizado: EH 03, DM 04): guarda el numerador crudo del mes y genera
    el corte cuando ya esta completa su ventana de 12 meses.
  - mensual (MT 03): numerador y denominador del mismo archivo -> resultado y semaforo del mes.
  - mensual con dos archivos (Neonatal 06): cada archivo guarda su lado y el mes se genera
    cuando ya estan los dos.
  - mensual anualizado (Neonatal 06): cada mes se reporta con la suma de sus ultimos 12 meses.
El cruce con Egresos lo pide el mapeo (cruce.activa), no la periodicidad.
Usado en: Controller/extractor_Controller.py
"""
from fastapi import HTTPException

from schemas.model.generacion_Model import ArchivoIndicadorExtractor, IndicadorGenerarExtractor
from schemas.model.reporte_mapeo_Model import FuenteExtractor, IndicadorExtractorMapeo
from services.bd_Ciae_Guardado_Services import (
    guardar_mes_definitivo, guardar_numerador_mes, guardar_parte_mes, guardar_pendiente_cruce, leer_partes,
    leer_pendiente_cruce, leer_reporte_extractor,
)
from services.calculo_indicador_Services import CLAVE_TOTAL, calcular_unidades
from services.extractor.corte_extractor_Services import (
    archivo_denominador_aparte, archivos_del_indicador, es_indicador_de_corte, indicadores_extractor, intentar_generar_corte,
    nombre_archivo,
)
from services.extractor.extraccion_extractor_Services import contar_filtro_conteo_acumulado, contar_por_unidad, validar_candidatos_cruce
from services.indicadorMapeo_Services import cargar_indicador_extractor, indicadores_del_modulo
from shared.auditoria_service import registrar
from shared.MESES import MESES_ESTANDAR
from shared.reglas_periodicidad import clave_periodicidad, es_periodicidad_de_corte
from shared.semaforo_service import semaforizar_unidades
from shared.UNIDADES import NOMBRE_AGRUPACION
from shared.validarArchivo_service import LectorExcel, validar_archivo_subido

# Lo que el Extractor sabe procesar hoy; otra periodicidad en un indicador
# "Extractor" es un error claro, no un guardado a medias.
PERIODICIDADES_CORTE_SOPORTADAS  = {"semestral anualizado"}   # ventana_corte solo arma Junio/Diciembre
PERIODICIDADES_MENSUAL_SOPORTADAS = {"mensual", "mensual mensual acumulado", "mensual anualizado"}
ANUALIZADO = "mensual anualizado"   # cada mes = ese mes + los 11 anteriores (Neonatal 06)


def _cruce_cfg(mapeo: IndicadorExtractorMapeo) -> dict | None:
    """El bloque 'cruce' del mapeo si el indicador lo tiene activo; None si no usa cruce."""
    cruce = (mapeo.reporte.numerador.model_extra or {}).get("cruce") or {}
    return cruce if cruce.get("activa") else None


##--------------------------------------

def indicadores_para_generar() -> list[IndicadorGenerarExtractor]:
    """Lo comun del mapeo mas lo propio del Extractor: de corte o mensual, como agrupa, de donde sale el denominador y que archivos usa."""
    lista = []
    for base in indicadores_del_modulo("extractor"):
        mapeo = cargar_indicador_extractor(base.indicador)
        numerador = mapeo.reporte.numerador
        denominador_del_archivo = getattr(mapeo.reporte.denominador, "fuente", None) == "extractor"
        archivo_denominador = archivo_denominador_aparte(base.indicador)

        archivos = [ArchivoIndicadorExtractor(
            archivo=nombre_archivo(numerador.archivo),
            requerido=True,
            uso="Numerador y denominador" if denominador_del_archivo and not archivo_denominador else "Numerador",
        )]
        if archivo_denominador:
            archivos.append(ArchivoIndicadorExtractor(archivo=nombre_archivo(archivo_denominador), requerido=True, uso="Denominador"))
        cruce = _cruce_cfg(mapeo)
        if cruce:
            archivos.append(ArchivoIndicadorExtractor(archivo=nombre_archivo(cruce.get("archivoCruce")), requerido=False, uso="Cruce para validar la vía 2"))

        lista.append(IndicadorGenerarExtractor(
            **base.model_dump(),
            tipo="corte" if es_indicador_de_corte(base.indicador) else "mensual",
            agrupacion=NOMBRE_AGRUPACION.get(numerador.catalogoUnidades, NOMBRE_AGRUPACION[None]),
            denominador=nombre_archivo(mapeo.reporte.denominador.archivo) if denominador_del_archivo else mapeo.informacion.descDen,
            archivos=archivos,
        ))
    return lista


##--------------------------------------

def _sumar_validados(via1: dict, candidatos: list[dict], lector_cruce: LectorExcel, cruce_cfg: dict) -> tuple[dict, int]:
    """Via 1 + los candidatos que el archivo de cruce confirma (via 2). Regresa (conteo, cuantos se validaron)."""
    conteo = dict(via1)
    validados = validar_candidatos_cruce(candidatos, lector_cruce, cruce_cfg) if candidatos else {}
    for unidad, cantidad in validados.items():
        conteo[unidad] = conteo.get(unidad, 0) + cantidad
    return conteo, sum(validados.values())


##--------------------------------------

def _guardar_mes_de_corte(indicador: str, anio: int, mes_nombre: str, conteo: dict, candidatos: int, validados: int,
                          cruce_aplicado: bool | None) -> dict:
    """Guarda el numerador crudo del mes, genera/recalcula los cortes que lo incluyen y arma el resultado del indicador."""
    guardar_numerador_mes(indicador, anio, mes_nombre, conteo, cruce_aplicado=cruce_aplicado)
    corte = intentar_generar_corte(indicador, anio, mes_nombre)

    # Si este mes ya pertenece a otro corte que YA estaba cerrado (ej. se corrige Marzo despues
    # de generar Junio) se recalcula tambien; si la ventana de ese corte no esta completa, no
    # hace nada. Los cortes que incluyen al mes: su Junio (de este año o del siguiente) y su Diciembre.
    anio_junio = anio if MESES_ESTANDAR.index(mes_nombre) < 6 else anio + 1
    cortes_recalculados = []
    for mes_corte, anio_corte in [("Junio", anio_junio), ("Diciembre", anio)]:
        if (mes_corte, anio_corte) == (mes_nombre, anio):
            continue   # ese ya se intento arriba
        if intentar_generar_corte(indicador, anio_corte, mes_corte) is not None:
            cortes_recalculados.append(f"{mes_corte} {anio_corte}")
    return {
        "indicador": indicador,
        "anio": anio,
        "mes": mes_nombre,
        "tipo": "corte",
        "numerador_por_unidad": conteo,
        "candidatos_via2": candidatos,
        "validados_via2": validados,
        "cruce_pendiente": cruce_aplicado is False,
        "corte_generado": corte is not None,
        "corte": corte,
        "cortes_recalculados": cortes_recalculados,
    }


##--------------------------------------

def _procesar_corte(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                    lector: LectorExcel, lector_cruce: LectorExcel | None) -> dict:
    """
    Indicador por corte: numerador crudo del mes y, si aplica, el corte. Si usa cruce, deja
    guardados via 1 + candidatos para que el Egresos se pueda subir despues; si el Egresos
    vino junto, el cruce se hace de una vez.
    """
    via1, candidatos = contar_filtro_conteo_acumulado(lector, mapeo.reporte.numerador.model_dump(), anio, mes_nombre)

    cruce_cfg = _cruce_cfg(mapeo)
    conteo, validados = via1, 0
    if cruce_cfg:
        guardar_pendiente_cruce(indicador, anio, mes_nombre, via1, candidatos)
        if lector_cruce is not None:
            conteo, validados = _sumar_validados(via1, candidatos, lector_cruce, cruce_cfg)

    cruce_aplicado = (lector_cruce is not None) if cruce_cfg else None
    return _guardar_mes_de_corte(indicador, anio, mes_nombre, conteo, len(candidatos), validados, cruce_aplicado)


##--------------------------------------

def _calcular_y_guardar_mes(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                            numerador: dict, denominador: dict) -> dict:
    """Indicador mensual: resultado y semaforo del mes con los conteos ya hechos, guardado como FTP/IAAS."""
    resultados = calcular_unidades(
        numerador, denominador, mapeo.reporte.operacion.resultado,
        cero_es_sin_dato=bool((mapeo.reporte.denominador.model_extra or {}).get("ceroEsSinDato")),
    )
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


##--------------------------------------

def _aviso_lado_faltante(mapeo: IndicadorExtractorMapeo, partes_del_mes: dict, mes_nombre: str) -> str | None:
    faltan = [lado for lado in ("numerador", "denominador") if lado not in partes_del_mes]
    if not faltan:
        return None
    fuente_faltante = mapeo.reporte.numerador if faltan[0] == "numerador" else mapeo.reporte.denominador
    archivo_faltante = nombre_archivo(fuente_faltante.archivo)
    return (f"Se guardó el {'denominador' if faltan == ['numerador'] else 'numerador'} de {mes_nombre}. "
            f"Falta subir el {archivo_faltante} de {mes_nombre} para generar el mes.")


##--------------------------------------

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


##--------------------------------------

def _mes_desplazado(mes_nombre: str, anio: int, desplazamiento: int) -> tuple[str, int]:
    """(mes, año) a 'desplazamiento' meses de distancia: (Junio, 2026, -11) -> (Julio, 2025)."""
    i = MESES_ESTANDAR.index(mes_nombre) + desplazamiento
    return MESES_ESTANDAR[i % 12], anio + i // 12


##--------------------------------------

def _generar_anualizado(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                        partes_por_anio: dict) -> tuple[dict | None, list[str]]:
    """Suma los 12 meses de la ventana y guarda el mes; (None, meses que faltan) si la ventana no esta completa."""
    ventana = [_mes_desplazado(mes_nombre, anio, -k) for k in range(11, -1, -1)]
    faltan = []
    for mes, anio_mes in ventana:
        partes_del_mes = partes_por_anio[anio_mes].get(mes, {})
        if "numerador" not in partes_del_mes or "denominador" not in partes_del_mes:
            faltan.append(f"{mes} {anio_mes}")
    if faltan:
        return None, faltan

    numerador, denominador = {}, {}
    for mes, anio_mes in ventana:
        partes_del_mes = partes_por_anio[anio_mes][mes]
        for unidad, cantidad in partes_del_mes["numerador"].items():
            numerador[unidad] = numerador.get(unidad, 0) + cantidad
        for unidad, cantidad in partes_del_mes["denominador"].items():
            denominador[unidad] = denominador.get(unidad, 0) + cantidad
    return _calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, numerador, denominador), []


##--------------------------------------

def _procesar_mes_por_partes(indicador: str, mapeo: IndicadorExtractorMapeo, anio: int, mes_nombre: str,
                             lector: LectorExcel, archivo: str) -> dict:
    """
    Indicador mensual con numerador y denominador en archivos distintos (Neonatal 06:
    Defunciones / Nacimientos) o anualizado: cuenta el lado que trae este archivo, lo guarda
    y, si ya esta lo que falta, genera el mes. Da igual que archivo se suba primero.
    """
    partes = {}
    for lado, fuente in (("numerador", mapeo.reporte.numerador), ("denominador", mapeo.reporte.denominador)):
        if fuente.archivo == archivo:
            partes = guardar_parte_mes(indicador, anio, mes_nombre, lado, contar_por_unidad(lector, fuente.model_dump(), anio, mes_nombre))

    if clave_periodicidad(mapeo.periodicidad) != ANUALIZADO:
        aviso = _aviso_lado_faltante(mapeo, partes, mes_nombre)
        if aviso:
            return _resultado_pendiente(indicador, anio, mes_nombre, partes, aviso)
        return _calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, partes["numerador"], partes["denominador"])

    # Anualizado: el mes se reporta con sus ultimos 12 meses. Ademas entra en la ventana de los
    # 11 siguientes: si ya estaban completos se recalculan, y si era el que les faltaba se generan.
    # Las ventanas de este mes y de los 11 siguientes caen entre el año anterior y el siguiente.
    partes_por_anio = {anio_partes: leer_partes(indicador, anio_partes) for anio_partes in (anio - 1, anio, anio + 1)}

    resultado, faltan = _generar_anualizado(indicador, mapeo, anio, mes_nombre, partes_por_anio)
    otros = []
    for k in range(1, 12):
        mes_siguiente, anio_siguiente = _mes_desplazado(mes_nombre, anio, k)
        generado, _ = _generar_anualizado(indicador, mapeo, anio_siguiente, mes_siguiente, partes_por_anio)
        if generado:
            otros.append(f"{mes_siguiente} {anio_siguiente}")
    if len(otros) == 1:
        tambien = f" También quedó generado {otros[0]}."
    elif otros:
        tambien = f" También quedaron generados {', '.join(otros)}."
    else:
        tambien = ""

    if resultado:
        inicio = _mes_desplazado(mes_nombre, anio, -11)
        return {**resultado, "detalle": f"Suma de {inicio[0]} {inicio[1]} a {mes_nombre} {anio}.{tambien}"}

    aviso = _aviso_lado_faltante(mapeo, partes, mes_nombre) or (
        f"Se guardó {mes_nombre} {anio}. Para reportarlo "
        f"{'falta 1' if len(faltan) == 1 else f'faltan {len(faltan)}'} de sus 12 meses: {', '.join(faltan)}.")
    return _resultado_pendiente(indicador, anio, mes_nombre, partes, aviso + tambien)


##--------------------------------------

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

    if not isinstance(mapeo.reporte.denominador, FuenteExtractor):
        raise ValueError(f"{indicador}: un indicador mensual del Extractor necesita el denominador del mismo archivo (fuente 'extractor').")
    numerador   = contar_por_unidad(lector, mapeo.reporte.numerador.model_dump(), anio, mes_nombre)
    denominador = contar_por_unidad(lector, mapeo.reporte.denominador.model_dump(), anio, mes_nombre)
    return _calcular_y_guardar_mes(indicador, mapeo, anio, mes_nombre, numerador, denominador)


##--------------------------------------

def _respuesta_de_subida(resultados: dict, mes: str, anio: int, usuario: str | None, detalle_auditoria: str) -> tuple[str, dict]:
    """
    Cada indicador se procesa por separado: si todos fallaron (ej. el archivo es de otro mes)
    es un error de la subida; si solo algunos, los demas ya quedaron guardados.
    """
    fallidos = {ind: r["error"] for ind, r in resultados.items() if "error" in r}
    procesados = [ind for ind in resultados if ind not in fallidos]
    if not procesados:
        raise HTTPException(status_code=422, detail="\n".join(dict.fromkeys(fallidos.values())))

    cortes_recalc = sorted({c for r in resultados.values() for c in r.get("cortes_recalculados", [])})
    registrar(
        "SUBIDA_ARCHIVO",
        usuario=usuario,
        detalle=f"{detalle_auditoria} indicadores={procesados}"
                + (f" fallidos={list(fallidos)}" if fallidos else "")
                + (f" cortes_recalculados={cortes_recalc}" if cortes_recalc else ""),
    )

    mensaje = f"{mes} {anio} procesado para {', '.join(procesados)}"
    if any(r.get("corte_generado") for r in resultados.values()):
        mensaje += " (corte generado)"
    if cortes_recalc:
        mensaje += f" -- se recalculó también el corte de {', '.join(cortes_recalc)}, que ya estaba cerrado"
    if fallidos:
        mensaje += f" -- no se pudo procesar {', '.join(fallidos)}"
    return mensaje, resultados


##--------------------------------------

def _validar_mes(mes: str) -> None:
    if mes not in MESES_ESTANDAR:
        raise HTTPException(status_code=400, detail=f"Mes invalido: '{mes}' -- debe ser uno de {MESES_ESTANDAR}")


##--------------------------------------

def generar_archivo_mensual(usuario: str | None, anio: int, mes: str, nombre_archivo: str, contenido: bytes, peso: int,
                            archivo: str, nombre_cruce: str | None, contenido_cruce: bytes | None, peso_cruce: int | None) -> tuple[str, dict]:
    """
    Endpoint de subir el Excel de un mes de un archivo base (+ su cruce): se procesa para los
    indicadores que el mapeo le asigna a ESE archivo, leyendo cada hoja una sola vez. Si uno
    falla, los demas se guardan igual (su resultado trae "error" en vez de los conteos).
    """
    # 1. Validar el mes y los archivos subidos
    _validar_mes(mes)
    validar_archivo_subido(contenido, peso, nombre_archivo, archivo)
    if contenido_cruce is not None:
        validar_archivo_subido(contenido_cruce, peso_cruce, nombre_cruce, "Egresos Pacientes")

    # 2. Que indicadores alimenta el archivo (sale del mapeo)
    archivos_base = []
    indicadores = []
    for indicador in indicadores_extractor():
        archivos_del_ind = archivos_del_indicador(indicador)
        archivos_base += [clave for clave in archivos_del_ind if clave not in archivos_base]
        if archivo in archivos_del_ind:
            indicadores.append(indicador)
    if archivo not in archivos_base:
        raise ValueError(f"'{archivo}' no es un archivo del Extractor -- opciones: {archivos_base}")

    # 3. Procesar cada indicador por su cuenta
    lector = LectorExcel(contenido)
    lector_cruce = LectorExcel(contenido_cruce) if contenido_cruce else None
    resultados = {}
    for indicador in indicadores:
        try:
            resultados[indicador] = _procesar_indicador(indicador, anio, mes, lector, lector_cruce, archivo)
        except (FileNotFoundError, KeyError, ValueError) as exc:
            resultados[indicador] = {"indicador": indicador, "anio": anio, "mes": mes, "error": str(exc)}

    # 4. Auditar y armar el mensaje
    return _respuesta_de_subida(
        resultados, mes, anio, usuario,
        f"archivo=extractor-{archivo}({mes} {anio}, {nombre_archivo}) bytes={len(contenido)}"
        + (f" egresos={nombre_cruce}" if contenido_cruce is not None else ""),
    )


##--------------------------------------

def completar_cruce(usuario: str | None, anio: int, mes: str, nombre_archivo: str, contenido: bytes, peso: int) -> tuple[str, dict]:
    """
    Endpoint de subir el Egresos por separado: para cada indicador con cruce toma la via 1 y
    los candidatos que dejo el SUI-13 de ese mes, los cruza contra este archivo, guarda el mes
    completo y genera/recalcula el corte. Si un indicador falla, los demas siguen.
    """
    # 1. Validar el mes y el archivo
    _validar_mes(mes)
    validar_archivo_subido(contenido, peso, nombre_archivo, "Egresos Pacientes")

    # 2. Cruzar lo que dejo el SUI-13 de cada indicador con cruce
    lector_cruce = LectorExcel(contenido)
    resultados = {}
    for indicador in indicadores_extractor():
        mapeo = cargar_indicador_extractor(indicador)
        if not _cruce_cfg(mapeo):
            continue
        try:
            pendiente = leer_pendiente_cruce(indicador, anio, mes)
            if pendiente is None:
                raise ValueError(f"No hay SUI-13 de {mes} {anio} procesado para {indicador}: súbelo primero.")
            conteo, validados = _sumar_validados(pendiente["via1"], pendiente["candidatos"], lector_cruce, _cruce_cfg(mapeo))
            resultados[indicador] = _guardar_mes_de_corte(indicador, anio, mes, conteo, len(pendiente["candidatos"]), validados, True)
        except (FileNotFoundError, KeyError, ValueError) as exc:
            resultados[indicador] = {"indicador": indicador, "anio": anio, "mes": mes, "error": str(exc)}

    # 3. Auditar y armar el mensaje
    return _respuesta_de_subida(resultados, mes, anio, usuario, f"archivo=extractor-cruce({mes} {anio}, {nombre_archivo}) bytes={len(contenido)}")


##--------------------------------------

def estado_archivos(anio: int) -> dict:
    """
    Por cada archivo que usa el Extractor y cada mes del año, si ya esta subido:
      - archivo base: "completo" si el mes esta en TODOS sus indicadores, "parcial" si falta en
        alguno, "pendiente" si no esta en ninguno ('faltan' dice en cuales falta).
      - archivo de cruce (Egresos): "completo" si ya se cruzo en todos sus indicadores,
        "pendiente" si el SUI-13 esta pero falta el cruce, "sin_principal" si ni el SUI-13 se
        ha subido, "sin_registro" si el mes se subio antes de que existiera la marca CRUCE.
    """
    todos = indicadores_extractor()
    reportes = {ind: leer_reporte_extractor(ind, anio) for ind in todos}
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
        partes_del_mes = partes[ind].get(mes, {})
        if fuentes.numerador.archivo == clave and "numerador" not in partes_del_mes:
            return False
        return not (fuentes.denominador.archivo == clave and "denominador" not in partes_del_mes)

    # Un bloque por archivo base, cada uno con los indicadores que el mapeo le asigna
    # (incluido el denominador que venga de otro archivo).
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

    # Un bloque por archivo de cruce distinto (hoy solo Egresos); sale del mapeo.
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
