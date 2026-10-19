"""
/Indicadores/excel: Excel de uno o varios indicadores (FTP, IAAS o Extractor), armado desde
lo que ya esta guardado en BD_CIAE.
"""
import logging

from fastapi import APIRouter, HTTPException, Query, status

from configs.response import ApiResponse
from services.excel_Services import ExcelSinDatosError, generar_excel

excelApi = APIRouter()


#Get Indicadores/excel?indicadores=EH 03&indicadores=DM 04&ano=2026&mes=Junio (mes es opcional)
@excelApi.get("")
async def excel_de_indicadores(ano: int, indicadores: list[str] = Query(...), mes: str | None = None):
    try:
        mensaje, datos = generar_excel(indicadores, ano, mes)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))
    except ExcelSinDatosError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except Exception as error:
        logging.exception(f"Ocurrio un Error al generar el Excel: {error}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo generar el Excel")
    return ApiResponse(success=True, message=mensaje, data=datos)
