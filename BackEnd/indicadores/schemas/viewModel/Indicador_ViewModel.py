from pydantic import BaseModel, Field
from typing import Dict, List
    
class IndicadorRequest(BaseModel):
    indicador: str
    ano: str