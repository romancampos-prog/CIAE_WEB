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
├── __init__.py                     — ROUTERS (los 3 controllers bajo /epidemiologia)
├── config.py                       — AÑO_ACTUAL y rutas (BD_CIAE/EPIDEMIOLOGIA/Dengue y mapeo/)
├── controllers/
│   ├── archivos_controller.py      — subir base operativa / SisCep            (ApiResponse)
│   ├── pipeline_controller.py      — estado y ejecutar el pipeline            (ApiResponse)
│   └── reportes_controller.py      — resultados por sección                   (dato DIRECTO)
├── services/                       — orquestan: leen con datos/, calculan con modulos/
│   ├── subir_bases_service.py      — validar .xlsx y peso, guardar, auditar
│   ├── pipeline/
│   │   ├── estado_pipeline_service.py   — ESTADO y RESULTADOS en memoria (se cargan de disco al arrancar)
│   │   ├── iniciar_pipeline_service.py  — 409 si ya corre, 400 si falta una base; arranca el hilo
│   │   └── pasos_pipeline_service.py    — los pasos en orden (ver abajo)
│   ├── depuracion_service.py       — los 7 pasos de la depuración
│   ├── duplicados_service.py       — detectar + tabla de eliminados con datos del paciente
│   ├── canal_service.py            — canal endémico (histórico vs año actual)
│   ├── alertas_service.py          — alertas SisCep para el front
│   ├── clustering_service.py       — conteos, coordenadas, brotes y GeoJSON
│   └── mapa_service.py             — GeoJSON con casos por municipio para Leaflet
├── datos/                          — lo ÚNICO que lee y escribe archivos
│   ├── bases_dengue_datos.py       — leer/guardar base operativa y SisCep
│   ├── historico_datos.py          — histórico {año}.xlsx con su semana epidemiológica
│   ├── catalogos_geo_datos.py      — CPs con lat/lon y GeoJSON de Guanajuato (de mapeo/)
│   ├── resultados_pipeline_datos.py — resultados/{clave}.json y fecha del último reporte
│   └── modelo_duplicados_datos.py  — el modelo entrenado de duplicados (hoy no existe)
├── modulos/                        — algoritmos puros: reciben y regresan DataFrames, sin archivos
│   ├── fechas.py                   — semana epidemiológica SUIVE (semana_epidemiologica)
│   ├── depuracion/                 — filtrar_imss, limpiar_texto, ubicacion_geografica,
│   │                                 cruce_siscep, asignar_semana, clasificacion_caso
│   ├── duplicados/                 — campos_registro, excepciones, reglas_resolucion, similitud,
│   │                                 candidatos, formato_posibles, deteccion
│   ├── clustering/                 — municipios_y_ventanas, conteo_casos, coordenadas_cp,
│   │                                 brotes_espaciales, brotes_temporales
│   ├── canal_endemico.py           — canal por cuartiles, zonas y semanas anómalas
│   └── alertas.py                  — las 5 alertas SisCep y negativos por unidad
├── entrenamiento/
│   └── entrenar_duplicados.py      — se corre a mano: MLP vs Random Forest -> modelos/mlp_duplicados.pkl
└── mapeo/
    ├── gto_normalizado.json        — GeoJSON de los municipios de Guanajuato
    └── cp_coordenadas.csv          — código postal -> LAT, LON
```

## Respuestas: dos formatos

- `archivos_controller` y `pipeline_controller` responden **`ApiResponse(success, message, data)`**.
- `reportes_controller` responde **el dato directo** (sin `ApiResponse`): el front de dengue lee
  `data` como el objeto mismo. Si se cambia, hay que cambiar el front al mismo tiempo.

## Endpoints

| Método y ruta | Para qué | Servicio |
|---|---|---|
| `POST /epidemiologia/archivos/operativa` | Subir la base operativa (`.xlsx`) | `subir_bases_service.subir_base_operativa` |
| `POST /epidemiologia/archivos/siscep` | Subir la base SisCep (`.xlsx`) | `subir_bases_service.subir_base_siscep` |
| `GET /epidemiologia/pipeline/estado` | `{corriendo, paso, completado, error, ultimo_reporte, archivos: {operativa, siscep}}` (polling) | `estado_pipeline_service.get_estado` |
| `POST /epidemiologia/pipeline/ejecutar` | Arrancar el pipeline | `iniciar_pipeline_service.iniciar_pipeline` |
| `GET /epidemiologia/reportes/canal` | Canal endémico | `get_resultado("canal")` |
| `GET /epidemiologia/reportes/mapa/{situacion\|confirmados}` | Mapa de casos y brotes | `get_resultado("mapa")[tipo]` |
| `GET /epidemiologia/reportes/alertas-siscep` | Alertas SisCep | `get_resultado("alertas")` |
| `GET /epidemiologia/reportes/duplicados` | Registros eliminados por duplicado | `get_resultado("duplicados")` |
| `GET /epidemiologia/reportes/posibles-duplicados` | Pares parecidos no confirmados (revisión a mano) | `get_resultado("posibles_duplicados")` |

Todos piden rol `admin`. Los reportes responden 404 si el pipeline nunca ha corrido.

## El pipeline

`POST /pipeline/ejecutar` revisa que no esté corriendo y que existan las dos bases, y corre
`pasos_pipeline_service.ejecutar_pasos` en un hilo. Cada paso actualiza `ESTADO["paso"]`:

1. **Depurar** (`depuracion_service.depurar_base`): leer la base operativa, filtrar IMSS
   Guanajuato (institución 2, estado 11), limpiar texto, ubicación (colonia > CP > "Sin
   ubicación"), cruzar con SisCep (`VEC_ID` = `FOLIO SINAVE` → `ESTATUS_SISCEP`), semana
   epidemiológica y `CLASIFICACION_FINAL`.
2. **Duplicados** (`duplicados_service.procesar_duplicados`): por cada par candidato (mismo
   Soundex del apellido paterno) → excepciones de negocio → modelo entrenado o umbral de
   similitud → reglas de resolución (cuál se elimina).
3. **Canal endémico** (`canal_service`): histórico por cuartiles contra los casos del año.
4. **Alertas SisCep** (`alertas_service`).
5. **Clustering y mapas** (`clustering_service`, `mapa_service`): situación y confirmados.
6. **Guardar** en `resultados/{clave}.json` y la fecha en `fecha_ultimo_repo/utimoReporte.json`.

Si un paso truena, `ESTADO.error` trae el mensaje y no se guarda nada de esa corrida.

## Modelo de duplicados (por confirmar)

La detección busca `epidemiologia/modelos/mlp_duplicados.pkl`. Ese archivo **no existe**, así
que hoy siempre se usa el **umbral de similitud** (apellido paterno ≥ 0.92, materno ≥ 0.85,
nombre ≥ 0.88). El entrenamiento quedó aparte en `entrenamiento/entrenar_duplicados.py` (se
corre a mano con un Excel etiquetado). **Por confirmar** si se va a entrenar el modelo o si se
quita el entrenamiento.

## Agregar una sección de análisis

1. El algoritmo en `modulos/` (recibe y regresa DataFrames, sin leer archivos).
2. Si necesita leer algo, su lectura en `datos/`.
3. Un servicio en `services/` que lo orqueste y arme la respuesta para el front.
4. Agregar el paso en `services/pipeline/pasos_pipeline_service.py`, su clave en
   `CLAVES_RESULTADOS` (`datos/resultados_pipeline_datos.py`) y el endpoint en
   `controllers/reportes_controller.py` (dato directo).
5. En el front: la función en la API de dengue y su página.
