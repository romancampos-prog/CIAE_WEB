#librerias
import logging
import json

#mis archivos
from indicadores.schemas.model.indicador_Model import ReporteIndicador,ReportePrevio 
from configs.settings import DATA_INDICADORES
from shared.MESES import MESES_ESTANDAR
from schemas.DTO.Indicador_ViewModel import IndicadorRequest

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
def IndicadorConsultarReporte(payload: IndicadorRequest) -> ReporteIndicador:
    rutaIndicador = IndicadorExiste(payload.indicador, payload.ano, False)
    if (not rutaIndicador): return None    
    
    with open(rutaIndicador, "r", encoding = "utf-8") as archivoJson:
        datosJson = json.load(archivoJson) #todo el json leido 
        reporte = ReporteIndicador.model_validate(datosJson)
    
    if (not reporte): return None
    if ((not reporte.INDICADOR == payload.indicador) and (not reporte.ANIO == payload.ano)): 
        logging.error(f"El json y reporte existen, pero no coincide con el indicador o año solicitado")
        return None
        
    if (payload.previos):
        rutaIndicadorPrevio = IndicadorExiste(payload.indicador, payload.ano, payload.previos) #en payload previos si el indicador si contiene reportes semanales ´previos debria estar en true 
        if (not rutaIndicadorPrevio):return reporte #si no existe el reporte previo, retornamos el reporte normal sin previo
        with open(rutaIndicadorPrevio, "r", encoding = "utf-8") as archivoJsonPrevio:
            datosJsonPrevio = json.load(archivoJsonPrevio) #todo el json leido 
            reportePrevio = ReportePrevio.model_validate(datosJsonPrevio)
            
        ultimoMesReporte = MESES_ESTANDAR.index(list(reporte.MESES.keys())[-1]) + 1
        mesPrevio = MESES_ESTANDAR.index(list(reportePrevio.MES)[-1]) + 1
        
        #el reporte previo solo peude ser del mes siguiente no peude ser de dos mese siguientes
        if(  ultimoMesReporte + 2 > mesPrevio > ultimoMesReporte): 
            reporte.SEMANA = reportePrevio
    
    return reporte    
    
        
   
            
                
                
       
              
