#librerias
import logging
import json

#mis archivos
from indicadores.schemas.model.indicador_Model import ReporteIndicador,ReportePrevio,UnidadDatos
from configs.settings import DATA_INDICADORES
from shared.MESES import MESES_ESTANDAR
from schemas.DTO.Indicador_ViewModel import IndicadorRequest
from shared.MESES_ACUMULADOS import MensualAcumulado
from shared.UNIDADES import nombre_canonico_iaas

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
    ftp/services/semaforizado.py); IAAS y Extractor ya lo guardan como
    "desempeno" (shared/semaforizado_service.py). El modelo unificado
    (UnidadDatos) siempre exige "desempeno" -- se traduce aqui, en la
    lectura, para no tener que igualar el formato de guardado en cada modulo.
    """
    return {
        mes: {
            unidad: (
                {**vals, "desempeno": vals["color"]}
                if isinstance(vals, dict) and "color" in vals and "desempeno" not in vals
                else vals
            )
            for unidad, vals in unidades.items()
        }
        for mes, unidades in bloque_meses.items()
    }


def IndicadorConsultarReporte(payload: IndicadorRequest) -> ReporteIndicador:
    rutaIndicador = IndicadorExiste(payload.indicador, payload.ano, False)
    if (not rutaIndicador): return None

    with open(rutaIndicador, "r", encoding = "utf-8") as archivoJson:
        datosJson = json.load(archivoJson) #todo el json leido
        datosJson["MESES"] = _normalizar_semaforo(datosJson.get("MESES", {}))
        # Extractor guarda el corte ya cerrado aparte, en CORTES.MESES (ver
        # extractor_service.intentar_generar_corte) -- MESES ahi solo trae el
        # numerador crudo de cada mes, nunca el acumulado. Se guarda aparte
        # porque model_validate no lo valida (no es parte de ReporteIndicador).
        cortesMes = _normalizar_semaforo(datosJson.get("CORTES", {}).get("MESES", {}))
        reporte = ReporteIndicador.model_validate(datosJson)
    
    if (not reporte): return None
    if ((not reporte.INDICADOR == payload.indicador) and (not reporte.ANIO == payload.ano)): 
        logging.error(f"El json y reporte existen, pero no coincide con el indicador o año solicitado")
        return None
        
    # IAAS: el dato guardado a veces trae el alias HGSZ de una unidad HGS -- se unifica al
    # nombre del catalogo para que la unidad no aparezca duplicada ni "sin datos".
    modulo = (payload.modulo or "").lower()  # la ficha trae "IAAS"/"Extractor", el front a veces manda "iaas"

    if (modulo == "iaas"):
        reporte.MESES = {
            mes: {nombre_canonico_iaas(unidad): datos for unidad, datos in unidades.items()}
            for mes, unidades in reporte.MESES.items()
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
        reporte.MESES = {
            ultimoMesCorte: {
                unidad: UnidadDatos.model_validate(datos)
                for unidad, datos in cortesMes[ultimoMesCorte].items()
            }
        }
        return reporte

    return reporte
    
        
   
            
                
                
       
              
