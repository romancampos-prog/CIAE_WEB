from ...config import _MAPEO_FTP
from ...schemas.model.accionesAchivo_Dto import Acciones


def ExtraerMapeoFTP (archivo: str) -> Acciones:
    #el nombre del archivo llega sin extension se lo agregamos
    _ARCHIVO_JSON = _MAPEO_FTP / (archivo + ".json")

    extraccion = _ARCHIVO_JSON.read_text(encoding="utf-8")

    datos_validados = Acciones.model_validate_json(extraccion)

    return datos_validados
