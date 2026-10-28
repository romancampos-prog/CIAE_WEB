# Backend: Epidemiología

Análisis de dengue. El usuario sube dos Excel (`.xlsx`): la **base operativa** (SINAVE) y la
**base SisCep** (resultados de laboratorio). Un pipeline los procesa en segundo plano y deja
los resultados por sección (canal endémico, mapas de brotes, alertas SisCep, duplicados) en
`BD_CIAE/EPIDEMIOLOGIA/Dengue/resultados/`, de donde los leen los endpoints de reportes.

Mismo estilo que indicadores: **un archivo por responsabilidad**, el controller llama a un solo
servicio y los servicios orquestan con pasos numerados.

## Estructura

```
epidemiologia/
├── Routes/
│   └── epidemiologia_Route.py      — junta los controllers (/archivos, /pipeline, /reportes, /ftp); main.py lo monta bajo /epidemiologia
├── config.py                       — AÑO_ACTUAL y rutas (BD_CIAE/EPIDEMIOLOGIA/Dengue y mapeo/dengue/)
├── Controller/
│   ├── archivos_Controller.py      — subir base operativa / SisCep            (ApiResponse)
│   ├── pipeline_Controller.py      — estado y ejecutar el pipeline            (ApiResponse)
│   ├── reportes_Controller.py      — resultados por sección                   (dato DIRECTO)
│   └── epiFTP.py                   — Acciones: extraer el OC30 del FTP y consultar lo guardado (ApiResponse)
├── services/                       — orquestan: leen con datos/, calculan con modulos/
│   └── dengue/
│       ├── subir_bases_Services.py  — validar .xlsx y peso, guardar, auditar
│       ├── pipeline/
│       │   ├── estado_pipeline_Services.py   — ESTADO y RESULTADOS en memoria (estado_del_pipeline, resultado_guardado)
│       │   ├── iniciar_pipeline_Services.py  — 409 si ya corre, 400 si falta una base; arranca el hilo
│       │   └── pasos_pipeline_Services.py    — los pasos en orden (ver abajo)
│       ├── depuracion_Services.py   — los 7 pasos de la depuración
│       ├── duplicados_Services.py   — detectar + tabla de eliminados con datos del paciente
│       ├── canal_Services.py        — canal endémico (histórico vs año actual)
│       ├── alertas_Services.py      — alertas SisCep para el front
│       ├── clustering_Services.py   — conteos, coordenadas, brotes y GeoJSON
│       └── mapa_Services.py         — GeoJSON con casos por municipio para Leaflet
│   ├── ftp/
│   │   ├── ftpExtraer.py                     — baja el reporte de cada unidad, aplica el modo del mapeo y guarda
│   │   ├── consulta_extraccion_Services.py   — lee el definitivo del mes o, si no hay, su última semana; recorta a la unidad del usuario, errores solo admin, + estadísticas (404 si no hay nada)
│   │   └── periodos_extraccion_Services.py   — meses del año con extracción (definitivo / última semana)
│   └── mapeo/mapeo_Services.py      — lee y valida mapeo/ftp/{archivo}.json (schemas/model/accionesAchivo_Dto.py)
├── datos/                          — lo ÚNICO que lee y escribe archivos
│   └── dengue/
│       ├── bases_dengue_Datos.py   — leer/guardar base operativa y SisCep
│       ├── historico_Datos.py      — histórico {año}.xlsx con su semana epidemiológica
│       ├── catalogos_geo_Datos.py  — CPs con lat/lon y GeoJSON de Guanajuato (de mapeo/dengue/)
│       ├── resultados_pipeline_Datos.py — resultados/{clave}.json y fecha del último reporte
│       └── modelo_duplicados_Datos.py   — el modelo entrenado de duplicados (hoy no existe)
│   └── ftp/extracciones_ftp_Datos.py — guardar/leer FTP/{extraccion}/{año}/{extraccion}_{año}{mes}[_S{semana}].json
├── modulos/                        — algoritmos puros: reciben y regresan DataFrames, sin archivos
│   └── dengue/
│       ├── fechas.py               — semana epidemiológica SUIVE (semana_epidemiologica)
│       ├── depuracion/             — filtrar_imss, limpiar_texto, ubicacion_geografica,
│       │                             cruce_siscep, asignar_semana, clasificacion_caso
│       ├── duplicados/             — campos_registro, excepciones, reglas_resolucion, similitud,
│       │                             candidatos, formato_posibles, deteccion
│       ├── clustering/             — municipios_y_ventanas, conteo_casos, coordenadas_cp,
│       │                             brotes_espaciales, brotes_temporales
│       ├── canal_endemico.py       — canal por cuartiles, zonas y semanas anómalas
│       └── alertas.py              — las 5 alertas SisCep y negativos por unidad
│   └── ftp/filtro_seleccion.py     — modo FILTRO_SELECCION: filas que pasan filtroColumna, columnas de 'seleccionar'
│       ftp/estadisticas_extraccion.py — conteos de las filas: total, por columna del filtroColumna (ej. Clave de la Acción) y por unidad
│       ftp/errores_por_tipo.py     — errores guardados {tipo, unidad, reporte, detalle} agrupados por tipo con la misma forma que las restricciones de indicadores FTP (el front usa el mismo ModalRestricciones), nombre/descripción de compartido/ftp_imss/catalogo_errores_ftp.py (el mismo catálogo que indicadores FTP)
├── entrenamiento/
│   └── entrenar_duplicados.py      — se corre a mano: MLP vs Random Forest -> modelos/mlp_duplicados.pkl
└── mapeo/
    ├── dengue/
    │   ├── gto_normalizado.json    — GeoJSON de los municipios de Guanajuato
    │   └── cp_coordenadas.csv      — código postal -> LAT, LON (fuera de git: *.csv en .gitignore)
    └── ftp/
        └── AccionesOC30.json       — un archivo por extracción: del OC30, las claves de acción del filtro + columnas a guardar

Cada tema tiene su carpeta en services/, modulos/, datos/ y mapeo/ (hoy dengue/; lo nuevo, ej.
ftp/, va en su propia carpeta). El FTP en sí (conectar, navegar, catálogo SIAIS) es compartido
con indicadores y vive en BackEnd/compartido/ftp_imss/.
```

## Respuestas: dos formatos

- `archivos_Controller` y `pipeline_Controller` responden **`ApiResponse(success, message, data)`**.
- `reportes_Controller` responde **el dato directo** (sin `ApiResponse`): el front de dengue lee
  `data` como el objeto mismo. Si se cambia, hay que cambiar el front al mismo tiempo.

## Endpoints

| Método y ruta | Para qué | Servicio |
|---|---|---|
| `POST /epidemiologia/archivos/operativa` | Subir la base operativa (`.xlsx`) | `dengue/subir_bases_Services.subir_base_operativa` |
| `POST /epidemiologia/archivos/siscep` | Subir la base SisCep (`.xlsx`) | `dengue/subir_bases_Services.subir_base_siscep` |
| `GET /epidemiologia/pipeline/estado` | `{corriendo, paso, completado, error, ultimo_reporte, archivos: {operativa, siscep}}` (polling) | `dengue/pipeline/estado_pipeline_Services.estado_del_pipeline` |
| `POST /epidemiologia/pipeline/ejecutar` | Arrancar el pipeline | `dengue/pipeline/iniciar_pipeline_Services.iniciar_pipeline` |
| `GET /epidemiologia/reportes/canal` | Canal endémico | `resultado_guardado("canal")` |
| `GET /epidemiologia/reportes/mapa/{situacion\|confirmados}` | Mapa de casos y brotes | `resultado_guardado("mapa")[tipo]` |
| `GET /epidemiologia/reportes/alertas-siscep` | Alertas SisCep | `resultado_guardado("alertas")` |
| `GET /epidemiologia/reportes/duplicados` | Registros eliminados por duplicado | `resultado_guardado("duplicados")` |
| `GET /epidemiologia/reportes/posibles-duplicados` | Pares parecidos no confirmados (revisión a mano) | `resultado_guardado("posibles_duplicados")` |
| `POST /epidemiologia/ftp/extraer/OC30?ano=&mes=[&semana=]` | Acciones: bajar el OC30 de las unidades, extraer y guardar en `BD_CIAE/EPIDEMIOLOGIA/FTP/AccionesOC30/` | `ftp/ftpExtraer.ftp_Extraer_Epidemeologia` |
| `GET /epidemiologia/ftp/extraccion/OC30?ano=&mes=` | Acciones (admin, unidad): el definitivo del mes o, mientras no hay, su última semana `{extraccion, ano, mes, semana, filas, errores, estadisticas}`; el rol `unidad` solo recibe sus filas y solo el admin recibe `errores` (`{tipo: {nombreError, descripcionError, unidades}}`, como las restricciones de FTP; `{}` si no es admin) (404 si no hay nada) | `ftp/consulta_extraccion_Services.consultar_extraccion` |
| `GET /epidemiologia/ftp/extraccion/OC30/periodos?ano=` | Acciones (admin, unidad): `[{mes, definitivo, ultimaSemana}]` de los meses con extracción | `ftp/periodos_extraccion_Services.periodos_de_extraccion` |

Todos piden rol `admin`. Los reportes responden 404 si el pipeline nunca ha corrido. Los de `/ftp` responden `ApiResponse`.

En el front, Acciones es la tarjeta junto a Dengue en la portada (`/CIAE/Epidemiologia/acciones`, `features/acciones`, `api/epidemiologia/ftpApi.ts`): el admin extrae el periodo y la tabla muestra las columnas tal cual llegan (Unidad + `seleccionar` del mapeo).

## El pipeline

`POST /pipeline/ejecutar` revisa que no esté corriendo y que existan las dos bases, y corre
`pasos_pipeline_Services.ejecutar_pasos` en un hilo. Cada paso actualiza `ESTADO["paso"]`:

1. **Depurar** (`depuracion_Services.depurar_base`): leer la base operativa, filtrar IMSS
   Guanajuato (institución 2, estado 11), limpiar texto, ubicación (colonia > CP > "Sin
   ubicación"), cruzar con SisCep (`VEC_ID` = `FOLIO SINAVE` → `ESTATUS_SISCEP`), semana
   epidemiológica y `CLASIFICACION_FINAL`.
2. **Duplicados** (`duplicados_Services.procesar_duplicados`): por cada par candidato (mismo
   Soundex del apellido paterno) → excepciones de negocio → modelo entrenado o umbral de
   similitud → reglas de resolución (cuál se elimina).
3. **Canal endémico** (`canal_Services`): histórico por cuartiles contra los casos del año.
4. **Alertas SisCep** (`alertas_Services`).
5. **Clustering y mapas** (`clustering_Services`, `mapa_Services`): situación y confirmados.
6. **Guardar** en `resultados/{clave}.json` y la fecha en `fecha_ultimo_repo/utimoReporte.json`.

Si un paso truena, `ESTADO.error` trae el mensaje y no se guarda nada de esa corrida.

## Modelo de duplicados (por confirmar)

La detección busca `epidemiologia/modelos/mlp_duplicados.pkl`. Ese archivo **no existe**, así
que hoy siempre se usa el **umbral de similitud** (apellido paterno ≥ 0.92, materno ≥ 0.85,
nombre ≥ 0.88). El entrenamiento quedó aparte en `entrenamiento/entrenar_duplicados.py` (se
corre a mano con un Excel etiquetado). **Por confirmar** si se va a entrenar el modelo o si se
quita el entrenamiento.

## Agregar una sección de análisis de dengue

1. El algoritmo en `modulos/dengue/` (recibe y regresa DataFrames, sin leer archivos).
2. Si necesita leer algo, su lectura en `datos/dengue/`.
3. Un servicio en `services/dengue/` que lo orqueste y arme la respuesta para el front.
4. Agregar el paso en `services/dengue/pipeline/pasos_pipeline_Services.py`, su clave en
   `CLAVES_RESULTADOS` (`datos/dengue/resultados_pipeline_Datos.py`) y el endpoint en
   `Controller/reportes_Controller.py` (dato directo).
5. En el front: la función en la API de dengue y su página.
