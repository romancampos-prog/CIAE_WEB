"""
Módulo  : roles_Services.py
Carpeta : auth/services/
Qué hace: Los roles del sistema y qué grupo de roles puede hacer cada cosa. Los controllers
          importan de aquí el grupo que pide su endpoint: cambiar un permiso es cambiarlo aquí.
Usado en: controllers de indicadores y epidemiología (con solo_roles)
"""

ADMIN               = "admin"                # todo
EDITA_INDICADORES   = "edita_indicadores"    # genera indicadores (FTP, IAAS, Extractor); Epidemiología solo la ve
EDITA_EPIDEMIOLOGIA = "edita_epidemiologia"  # edita Epidemiología (Dengue, Acciones); Indicadores solo los ve
EDITA_IAAS          = "edita_iaas"           # genera solo IAAS; lo demás solo lo ve
UNIDAD              = "unidad"               # hospital/UMF: sus gráficas y sus Acciones, nada más

INTERNOS = (ADMIN, EDITA_INDICADORES, EDITA_EPIDEMIOLOGIA, EDITA_IAAS)

# Indicadores
VEN_GRAFICAS        = (*INTERNOS, UNIDAD)
VEN_PAGINAS_GENERAR = INTERNOS                     # listas y estados que leen las páginas de Generar
DESCARGAN_EXCEL     = INTERNOS                     # el Excel trae todas las unidades
GENERAN_INDICADORES = (ADMIN, EDITA_INDICADORES)   # FTP, Extractor, población y censo DM
GENERAN_IAAS        = (ADMIN, EDITA_INDICADORES, EDITA_IAAS)

# Epidemiología
VEN_ACCIONES          = (*INTERNOS, UNIDAD)        # a la unidad el backend le recorta sus filas
VEN_DENGUE            = INTERNOS
EDITAN_EPIDEMIOLOGIA  = (ADMIN, EDITA_EPIDEMIOLOGIA)
