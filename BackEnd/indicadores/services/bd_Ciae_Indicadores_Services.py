#librerias
import logging
import json

#mis archivos
from indicadores.schemas.model.indicador_Model import ReporteIndicador,ReportePrevio,UnidadDatos,MesReporte
from configs.settings import DATA_INDICADORES
from shared.MESES import MESES_ESTANDAR
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from shared.MESES_ACUMULADOS import MensualAcumulado
from shared.UNIDADES import nombre_canonico_iaas
from services.extractor.corte_extractor_Services import indicadores_extractor

#ruta  a la BD_CIAE 


#REGLA: cada indicador para ser enconbtrado debe llegar asi CACU 01 , par ahacer split y solo encontrar CAMA
#ExisteIndicador? true , no existe false
def IndicadorExiste(indicador: str, ano: str, rutaprevio: bool) -> str:
    """
    Verifica si existe el archivo JSON de un indicador para un año dado.
    Parámetros:
        indicador: nombre de familia + número separados por espacio, ej. "CACU 01".
        ano: año a buscar, ej. "2026".
        previo: si es previo sacamos ruta del reporte previo del indicador

    Retorna:
        dict con ("encontrado": False si el archivo no existe.
        dict con {"encontrado": True, "ruta": Path} si sí existe.
    """
    
    indicadorBuscar = indicador.split()
    indicadorPadre = indicadorBuscar[0]  #CAMA
    numeroIndicador = indicadorBuscar[1] #01
    
    if(not rutaprevio):
        rutaIndicador = DATA_INDICADORES / ano / indicadorPadre
        nombreJsonIndicador = f"{indicadorPadre}_{numeroIndicador}.json"
        rutaArchivo = rutaIndicador / nombreJsonIndicador
    
    elif (rutaprevio): 
        rutaIndicador = DATA_INDICADORES / ano / "SEMANAL"
                
        nombreJsonIndicador = f"{indicadorPadre}_{numeroIndicador}_2026_semana.json"
        rutaArchivo = rutaIndicador / nombreJsonIndicador
    
    if (not rutaArchivo.exists()):
        logging.error(f"Ruta incorrecta o archivo incorrecto del indicador=  {indicador} del año= {ano}")
        return None

    return rutaArchivo

#-----------------------------------------------------------------------------------------------------------------------------------------------------#
def _normalizar_semaforo(bloque_meses: dict) -> dict:
    """
    El pipeline de FTP guarda el semaforo de cada unidad como "color" (ver
    services/calculo_indicador_Services.py); IAAS y Extractor ya lo guardan como
    "desempeno" (shared/semaforizado_service.py). El modelo unificado
    (UnidadDatos) siempre exige "desempeno" -- se traduce aqui, en la
    lectura, para no tener que igualar el formato de guardado en cada modulo.
    Cada mes viene envuelto como {"Poblacion": ..., "Reporte": {unidad: datos}}
    (ver MesReporte) -- se normaliza el "Reporte" y se conserva "Poblacion" tal cual.
    """
    return {
        mes: {
            "Poblacion": mes_reporte.get("Poblacion"),
            "Reporte": {
                unidad: (
                    {**vals, "desempeno": vals["color"]}
                    if isinstance(vals, dict) and "color" in vals and "desempeno" not in vals
                    else vals
                )
                for unidad, vals in mes_reporte.get("Reporte", {}).items()
            },
        }
        for mes, mes_reporte in bloque_meses.items()
    }


def _normalizar_y_envolver_plano(bloque_meses: dict) -> dict:
    """
    Igual que _normalizar_semaforo, pero para el MESES crudo de Extractor -- ese
    NUNCA se guarda envuelto en {"Poblacion", "Reporte"} (es solo numerador, nunca
    usa poblacion, ver guardado_extractor_Services.guardar_numerador_mes), asi que
    aqui se envuelve nada mas para la lectura, en memoria, sin tocar el archivo.
    """
    return {
        mes: {
            "Poblacion": None,
            "Reporte": {
                unidad: (
                    {**vals, "desempeno": vals["color"]}
                    if isinstance(vals, dict) and "color" in vals and "desempeno" not in vals
                    else vals
                )
                for unidad, vals in unidades.items()
            },
        }
        for mes, unidades in bloque_meses.items()
    }


def CargarReporteIndicador(indicador: str, ano: str) -> tuple[ReporteIndicador, dict[str, MesReporte]] | None:
    """
    Lee y valida el JSON de un indicador/año: regresa (reporte, cortes) o None si no existe.
    cortes es CORTES.MESES ya tipado -- solo Extractor lo trae (ver
    corte_extractor_Services.intentar_generar_corte); en los demas queda {}.
    Usado en: IndicadorConsultarReporte (graficas) y services/excel_Services.py (Excel).
    """
    rutaIndicador = IndicadorExiste(indicador, ano, False)
    if (not rutaIndicador): return None

    with open(rutaIndicador, "r", encoding = "utf-8") as archivoJson:
        datosJson = json.load(archivoJson) #todo el json leido
        # MESES en Extractor solo trae el numerador crudo de cada mes, guardado PLANO
        # (nunca envuelto en Poblacion/Reporte -- ver guardado_extractor_Services); el
        # corte ya cerrado vive aparte en CORTES.MESES y no es parte de ReporteIndicador.
        if datosJson.get("INDICADOR") in indicadores_extractor():
            datosJson["MESES"] = _normalizar_y_envolver_plano(datosJson.get("MESES", {}))
        else:
            datosJson["MESES"] = _normalizar_semaforo(datosJson.get("MESES", {}))
        cortesCrudos = _normalizar_semaforo(datosJson.get("CORTES", {}).get("MESES", {}))
        reporte = ReporteIndicador.model_validate(datosJson)

    if (not reporte): return None
    if ((not reporte.INDICADOR == indicador) and (not reporte.ANIO == ano)):
        logging.error(f"El json y reporte existen, pero no coincide con el indicador o año solicitado")
        return None

    cortes = {mes: MesReporte.model_validate(mes_reporte) for mes, mes_reporte in cortesCrudos.items()}
    return reporte, cortes


def IndicadorConsultarReporte(payload: IndicadorRequest) -> ReporteIndicador:
    cargado = CargarReporteIndicador(payload.indicador, payload.ano)
    if (not cargado): return None
    reporte, cortesMes = cargado

    # IAAS: el dato guardado a veces trae el alias HGSZ de una unidad HGS -- se unifica al
    # nombre del catalogo para que la unidad no aparezca duplicada ni "sin datos".
    modulo = (payload.modulo or "").lower()  # la ficha trae "IAAS"/"Extractor", el front a veces manda "iaas"

    if (modulo == "iaas"):
        reporte.MESES = {
            mes: MesReporte(
                Poblacion=mes_reporte.Poblacion,
                Reporte={nombre_canonico_iaas(unidad): datos for unidad, datos in mes_reporte.Reporte.items()},
            )
            for mes, mes_reporte in reporte.MESES.items()
        }

    #si previos true, cuneta con reporte semanal y si es ftp al mismo timepo 
    if (payload.previos and modulo == "ftp"):
        rutaIndicadorPrevio = IndicadorExiste(payload.indicador, payload.ano, payload.previos) #en payload previos si el indicador si contiene reportes semanales ´previos debria estar en true 
        if (not rutaIndicadorPrevio):return reporte #si no existe el reporte previo, retornamos el reporte normal sin previo
        with open(rutaIndicadorPrevio, "r", encoding = "utf-8") as archivoJsonPrevio:
            datosJsonPrevio = json.load(archivoJsonPrevio) #todo el json leido
            datosJsonPrevio["MES"] = _normalizar_semaforo(datosJsonPrevio.get("MES", {}))
            reportePrevio = ReportePrevio.model_validate(datosJsonPrevio)
            
        ultimoMesReporte = MESES_ESTANDAR.index(list(reporte.MESES.keys())[-1]) + 1
        mesPrevio = MESES_ESTANDAR.index(list(reportePrevio.MES)[-1]) + 1
        
        #el reporte previo solo peude ser del mes siguiente no peude ser de dos mese siguientes
        if(  ultimoMesReporte + 2 > mesPrevio > ultimoMesReporte): 
            reporte.SEMANA = reportePrevio
            
    
    # si el modulo tiene mensual acumualdo true y es del modulo de iaas
    if (payload.mensualAcumulado and modulo == "iaas"):
        reporteAcumulado = MensualAcumulado(reporte.MESES, payload.indicador)

        if(not reporteAcumulado):
            logging.error("El mensual acumulado no calculo nada")
            return reporte
        reporte.MENSUAL_ACUMULADO = reporteAcumulado
        return reporte

    # Modulo Extractor (EH 03, DM 04, periodicidad "Semestral Anualizado"):
    # MESES siempre trae solo el numerador crudo de cada mes (nunca se
    # sobreescribe al cerrar un corte); los cortes ya generados (con
    # TOTAL_OOAD) viven aparte en CORTES.MESES. Se muestra solo el ultimo corte
    # cerrado, para que la grafica muestre el ultimo resultado oficial en vez
    # de una linea plana en 0 o los numeradores crudos sueltos.
    if (modulo == "extractor"):
        if not cortesMes:
            reporte.MESES = {}
            return reporte
        ultimoMesCorte = max(cortesMes, key=lambda m: MESES_ESTANDAR.index(m))
        reporte.MESES = {ultimoMesCorte: cortesMes[ultimoMesCorte]}
        return reporte

    return reporte
    
        
   
            
                
                
       
              
