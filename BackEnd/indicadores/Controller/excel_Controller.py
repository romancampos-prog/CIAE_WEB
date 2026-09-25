from fastapi import APIRouter, HTTPException, Query, status
import logging

#mis archivos
from configs.response import ApiResponse
from indicadores.schemas.model.excel_Model import SolicitudExcel
from indicadores.services.excel_Services import generar_excel, ExcelSinDatosError

#/Indicadores/excel
excelApi = APIRouter()


#Get Indicadores/excel?indicadores=EH 03&indicadores=DM 04&ano=2026&mes=Junio (mes es opcional)
@excelApi.get("")
async def Obtener_Excel(
    ano: int,
    indicadores: list[str] = Query(...),
    mes: str | None = None,
):
    try:
        solicitud = SolicitudExcel(indicadores=indicadores, ano=ano, mes=mes)
        excel = generar_excel(solicitud)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    except ExcelSinDatosError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except Exception as error:
        logging.exception(f"Ocurrio un Error al generar el Excel: {error}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo generar el Excel")

    mensaje = f"Excel generado: {', '.join(excel.completados)}"
    if excel.errores:
        mensaje += f" -- sin datos: {', '.join(excel.errores)}"
    return ApiResponse(success=True, message=mensaje, data=excel.model_dump())
