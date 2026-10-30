# Backend: Indicadores Médicos

Este módulo genera, guarda y consulta los indicadores médicos. Hay tres formas de generar
(los **módulos**): **FTP**, **IAAS** y **Extractor**. Las tres terminan igual: el resultado
queda guardado en `BD_CIAE` y de ahí lo leen las gráficas y el Excel.

> Las reglas de cada indicador (qué archivo, qué celdas, qué fórmula, qué semáforo) no están
> en el código: están en el **mapeo**. Su formato, campo por campo, está en
> [mapeo/README.md](mapeo/README.md).

## Índice

1. [Cómo se conecta con `main.py`](#1-cómo-se-conecta-con-mainpy)
2. [Mapa de archivos](#2-mapa-de-archivos)
3. [Endpoints](#3-endpoints)
4. [El flujo común de generación](#4-el-flujo-común-de-generación)
5. [Cómo se guarda en BD_CIAE](#5-cómo-se-guarda-en-bd_ciae)
6. [Proceso FTP](#6-proceso-ftp)
7. [Proceso IAAS](#7-proceso-iaas)
8. [Proceso Extractor](#8-proceso-extractor)
9. [Gráficas](#9-gráficas)
10. [Excel](#10-excel)
11. [Excepciones y casos especiales](#excepciones-y-casos-especiales)
12. [Cómo escribir un endpoint nuevo](#12-cómo-escribir-un-endpoint-nuevo)

---

## 1. Cómo se conecta con `main.py`

```
main.py
 ├─ sys.path.insert(0, "indicadores/")      ← por eso aquí los imports son "planos"
 └─ app.include_router(indicadores_Route.routesIndicadores, prefix="/Indicadores")
        Routes/indicadores_Route.py
         ├─ /ftp            → Controller/ftp_Controller.py
         ├─ /ftp/poblacion  → Controller/poblacion_Controller.py
         ├─ /iaas           → Controller/iaas_Controller.py
         ├─ /extractor      → Controller/extractor_Controller.py
         ├─ /censo-dm       → Controller/censo_dm_Controller.py
         ├─ /reportes       → Controller/reportes_Controller.py
         ├─ /informacion    → Controller/informacion_Controller.py
         └─ /excel          → Controller/excel_Controller.py
```

Como `indicadores/` está en `sys.path`, dentro de este módulo se importa así:
`from services.calculo.formulas_Services import ...`, `from datos.bd_ciae.guardar_mes_Datos import ...`,
`from shared.UNIDADES import ...` (sin `indicadores.` adelante).

**Un archivo por responsabilidad:** cada archivo hace una sola cosa y se llama como lo que hace;
adentro trae su función pública y, si las necesita, sus auxiliares privadas (`_algo`).

Las capas:

| Carpeta | Qué va | Regla |
|---|---|---|
| `Controller/` | Endpoints (`nombre_Controller.py`) | Delgados: reciben, llaman a **un** servicio y responden. Sin lógica |
| `services/ftp/`, `iaas/`, `extractor/` | Lógica exclusiva de ese módulo (`nombre_Services.py`) | El servicio de cada endpoint orquesta con pasos numerados y regresa `(mensaje, datos)` |
| `services/calculo/`, `semaforo/`, `reporte_guardado/` | Lo que usan los tres módulos: fórmulas, semáforo, lectura tipada de lo guardado | No sabe de qué módulo vienen los datos |
| `services/informacion/`, `poblacion/`, `grafica/`, `excel/` | Fichas y listas del mapeo, población, gráficas y Excel | Compartidos por todos los módulos |
| `datos/` | **Lo único** que lee y escribe: BD_CIAE, el mapeo JSON, el FTP y los Excel subidos (`nombre_Datos.py`) | Sin reglas de negocio |
| `shared/` | Utilidades internas de indicadores | Meses, unidades, periodicidad (lo que comparte con auth y epidemiología está en `BackEnd/compartido/`) |
| `schemas/DTO/` | Lo que reciben los endpoints | Pydantic |
| `schemas/model/` | Modelos internos | Pydantic |
| `mapeo/` | Configuración (JSON) | Ver [mapeo/README.md](mapeo/README.md) |

---

## 2. Mapa de archivos

### Controller/ y Routes/

| Archivo | Qué hace |
|---|---|
| `Routes/indicadores_Route.py` | Junta los 7 controllers bajo `/Indicadores/<prefijo>` |
| `Controller/ftp_Controller.py` | Indicadores y meses generados de FTP, generar/regenerar (indicador o categoría) |
| `Controller/poblacion_Controller.py` | Población InfoSalud: archivo cargado, subir, recalcular (sigue bajo `/ftp/poblacion`) |
| `Controller/censo_dm_Controller.py` | Censo de pacientes con DM (denominador de DM 05): censos subidos y subir uno |
| `Controller/iaas_Controller.py` | Unidades e indicadores IAAS, estado del mes, generar el mes, completar una unidad tardía |
| `Controller/extractor_Controller.py` | Indicadores del Extractor, estado de cortes y archivos, subir el Excel del mes, completar el cruce con Egresos |
| `Controller/reportes_Controller.py` | Datos de la gráfica de un indicador |
| `Controller/informacion_Controller.py` | Lista de indicadores, ficha y ficha técnica (sale del mapeo) |
| `Controller/excel_Controller.py` | Excel de uno o varios indicadores |

### datos/ (leer y escribir)

| Archivo | Qué hace |
|---|---|
| `bd_ciae/archivos_bd_ciae_Datos.py` | **Único** que arma rutas de `BD_CIAE/INDICADORES` y lee/escribe sus JSON |
| `bd_ciae/historico_indicador_Datos.py` | Meses guardados de un indicador, su histórico crudo y sus numeradores |
| `bd_ciae/guardar_mes_Datos.py` | Guardar el mes definitivo (formato de disco: `%` y `desempeno`) |
| `bd_ciae/semanal_Datos.py` | Semanal de FTP: guardar, leer y borrar el mes al llegar el definitivo |
| `bd_ciae/extractor_Datos.py` | JSON del Extractor: el reporte (numerador crudo del mes), `EXTRACTOR_PARTES` (conteo de cada archivo, Neonatal 04 y 06) y `EXTRACTOR_CRUCE` (vía 1 + candidatos que dejó el SUI-13) |
| `bd_ciae/poblacion_Datos.py` | `POBLACION_{año}.json`: leer, su periodo y guardar |
| `bd_ciae/censo_dm_Datos.py` | `BD_CIAE/CENSO_DM/CENSO_DM_{año}.json`: leer, guardar y qué años hay |
| `lectura_mapeo/mapeo_indicadores_Datos.py` | **Único** lector del mapeo: `bloque_mapeo`, catálogos de familias y de archivos del Extractor |
| `lectura_mapeo/mapeo_por_modulo_Datos.py` | El mapeo tipado de cada módulo: `cargar_indicador_ftp`, `cargar_indicador_iaas`, `cargar_indicador_extractor` |
| `lectura_mapeo/mapeo_poblacion_Datos.py` | `mapeo/POBLACION.json` (cómo viene el Excel nacional) |
| `lectura_mapeo/mapeo_censo_dm_Datos.py` | `mapeo/CENSO_DM.json` (cómo viene el Excel del censo) |
| `excel_subido/lector_excel_Datos.py` | `LectorExcel` (busca la hoja por su contenido), validar encabezados, números escritos como texto |
| `excel_subido/excel_poblacion_Datos.py` | Lee el Excel nacional de población, filtra Guanajuato y lo guarda |
| `excel_subido/excel_censo_dm_Datos.py` | Lee el Excel del Censo DM por unidad de adscripción (Guanajuato, sexo y grupo de edad) |

La extracción de Excel (motor, modos y `letra_a_numero`) vive en `BackEnd/compartido/extraccion_excel/`, un archivo por
modo (`modos_por_posicion/`, `modos_por_filtro/`), compartida con epidemiología.

El FTP ya no está en `datos/`: vive en `BackEnd/compartido/ftp_imss/` porque también lo usa epidemiología
(`conexion_ftp_Datos`, `navegacion_ftp_Datos` con el diagnóstico de rutas, `catalogo_reportes_ftp_Datos`
que lee `catalogo_ftp.json` y `reportes_siais_ftp_Datos`: rutas de cada unidad, listar y elegir el del periodo).

### services/calculo/, semaforo/, reporte_guardado/ (lo que usan los tres módulos)

| Archivo | Qué hace |
|---|---|
| `calculo/formulas_Services.py` | Evalúa las fórmulas del mapeo y el redondeo propio (≥ 0.60) |
| `calculo/resultado_unidades_Services.py` | Reglas de Gris, resultado por unidad, `TOTAL_OOAD` (`calcular_unidades`) |
| `calculo/mensual_acumulado_Services.py` | Mensual acumulado sumando meses (gráfica y Excel) |
| `semaforo/umbrales_semaforo_Services.py` | Leer los umbrales del mapeo (legado/explícito, por mes, por grupo, rangos) |
| `semaforo/color_semaforo_Services.py` | Color de un resultado y semaforizar unidades/reportes |
| `reporte_guardado/reporte_guardado_Services.py` | Lectura tipada del reporte y del semanal para gráficas y Excel |

### services/informacion/, poblacion/, grafica/, excel/

| Archivo | Qué hace |
|---|---|
| `informacion/lista_indicadores_Services.py` | Indicadores por familia y por módulo (lo común de las páginas de Generar) |
| `informacion/ficha_indicador_Services.py` | Ficha y ficha técnica completa |
| `poblacion/archivo_poblacion_Services.py` | Archivo de población cargado y subir uno nuevo |
| `poblacion/denominador_poblacion_Services.py` | Denominador de población por unidad con la fórmula del mapeo |
| `poblacion/recalcular_poblacion_Services.py` | Recalcular FTP y los cortes del Extractor con la población nueva |
| `censo_dm/archivo_censo_dm_Services.py` | Censos DM subidos y subir uno nuevo |
| `censo_dm/denominador_censo_dm_Services.py` | Qué censo le toca a un mes (ene-nov: año anterior; dic: el del año) y el denominador por unidad |
| `censo_dm/recalcular_censo_dm_Services.py` | Al subir un censo, generar o recalcular los meses que lo usan |
| `grafica/grafica_indicador_Services.py` | Arma la respuesta de la gráfica (reglas de cada módulo) |
| `grafica/estadisticas_grafica_Services.py` | Resumen por mes (del mes y del acumulado) y mapa de calor |
| `grafica/perfil_indicador_Services.py` | Perfil: tipo de meta, niveles, unidad de medida... |
| `grafica/metas_semaforo_Services.py` | La meta (Esperado) leída para la gráfica |
| `grafica/franjas_semaforo_Services.py` | Las franjas del semáforo en números `[{desde, hasta, nivel}]` (con el mismo `evaluar_color`): el fondo de las gráficas |
| `grafica/resumen_por_mes_Services.py` | Resumen de cada mes (Total OOAD con num/den, meta, unidades por semáforo); del mes y del acumulado |
| `grafica/serie_cortes_Services.py` | Cortes y casos por mes del Extractor de corte |
| `excel/generar_excel_Services.py` | Orquesta el Excel genérico y su nombre de archivo |
| `excel/leer_hoja_excel_Services.py` | Lee de la BD lo de cada pestaña con la regla de su módulo |
| `excel/hoja_estandar_excel_Services.py` | Libro estándar (FTP y Extractor): prepara histórico y acumulado |
| `excel/escribir_hoja_indicador_Services.py` | Dibuja la pestaña estándar |
| `excel/estilos_excel_Services.py`, `excel/leyendas_semaforo_excel_Services.py` | Estilos y leyendas del semáforo del Excel estándar |
| `excel/excel_iaas_Services.py` | Excel propio de IAAS (orquesta), con `excel_iaas_calculo_Services.py` (datos) y `excel_iaas_dibujo_Services.py` (formato) |

### services/ftp/, iaas/, extractor/

| Archivo | Qué hace |
|---|---|
| `ftp/pagina_generar_ftp_Services.py` | Indicadores de la página Generar FTP y meses ya generados |
| `ftp/extraer_indicador_ftp_Services.py` | Agrupa por reporte, conecta y junta lo leído + población |
| `ftp/extraer_reporte_ftp_Services.py` | Recorre las 46 unidades, baja cada reporte una vez y extrae los dos lados |
| `ftp/errores_extraccion_ftp_Services.py` | Registrar un error ("restricción"); el catálogo está en `compartido/ftp_imss/catalogo_errores_ftp.py` (también lo usa epidemiología) |
| `ftp/calcular_indicador_ftp_Services.py` | Fórmulas por unidad + `TOTAL_OOAD` |
| `ftp/generar_indicador_ftp_Services.py` | Generar / regenerar un indicador |
| `ftp/generar_categoria_ftp_Services.py` | Generar / regenerar una categoría |
| `iaas/catalogo_iaas_Services.py` | Los 6 indicadores IAAS y qué unidades lleva cada uno |
| `iaas/pagina_generar_iaas_Services.py` | Indicadores y unidades de la página Generar IAAS |
| `iaas/leer_excel_iaas_Services.py` | Lee y valida el Excel de una unidad (hoja, encabezados, columna E) |
| `iaas/numerador_denominador_iaas_Services.py` | Numerador por unidad y denominador de IAAS 01 |
| `iaas/estado_mes_iaas_Services.py` | Lo guardado del mes, pendientes y meses generados |
| `iaas/generar_mes_iaas_Services.py` | Generar los 6 IAAS del mes |
| `iaas/completar_unidad_iaas_Services.py` | Completar una unidad tardía |
| `extractor/catalogo_extractor_Services.py` | Qué indicadores y archivos tiene el Extractor, cuáles van por corte, cruce y desfase |
| `extractor/pagina_generar_extractor_Services.py` | Indicadores de la página Generar Extractor |
| `extractor/leer_archivo_extractor_Services.py` | Hoja del Excel, mes/año del archivo, filas que cuentan y fechas |
| `extractor/conteo_por_unidad_Services.py` | Conteo por unidad (y por mes de nacimiento, Neonatal 04, o de una fecha de la fila, DM 05) |
| `extractor/conteo_con_cruce_Services.py` | Vía 1 / vía 2 y el cruce con Egresos (EH 03, DM 04) |
| `extractor/subir_archivo_extractor_Services.py` | Subir un archivo del mes: decide el flujo de cada indicador |
| `extractor/generar_corte_Services.py` | Mes de un indicador de corte (+ cortes que lo incluyen) |
| `extractor/corte_semestral_Services.py` | Corte Semestral Anualizado y su recálculo con población |
| `extractor/generar_mensual_Services.py` | Resultado mensual (calcular, semaforizar, guardar) |
| `extractor/generar_por_partes_Services.py` | Dos archivos y anualizado (Neonatal 06) |
| `extractor/generar_con_desfase_Services.py` | Sobrevida con desfase (Neonatal 04) |
| `extractor/generar_anualizado_censo_Services.py` | Subir el SUI-13 de un indicador anualizado con el Censo DM (DM 05) |
| `extractor/mes_anualizado_censo_Services.py` | Un mes de DM 05: ingresos dentro de la ventana de 12 meses / censo del mes |
| `extractor/completar_cruce_Services.py` | Subir el Egresos después del SUI-13 |
| `extractor/estado_archivos_Services.py`, `estado_cortes_Services.py` | Tablas de archivos subidos y de meses por corte |

### shared/ y schemas/

| Archivo | Qué hace |
|---|---|
| `shared/MESES.py` | `MESES_ESTANDAR`, `nombre_del_mes`, `mes_desplazado` |
| `shared/UNIDADES.py` | Carga `mapeo/unidades/*.json` (listas de unidades, claves, grupos IAAS, alias HGSZ) |
| `shared/reglas_periodicidad.py` | Qué meses muestra cada periodicidad, su clave normalizada y su texto de ayuda |
| `schemas/DTO/*_ViewModel.py` | Peticiones de FTP, población e IAAS (`comun_ViewModel.TextoObligatorio`) |
| `schemas/model/mapeo_{comun,ftp,iaas,extractor}_Model.py` | Forma del mapeo que lee cada módulo (`IndicadorFTPMapeo`, `IndicadorIAASMapeo`, `IndicadorExtractorMapeo`) |
| `schemas/model/reporte_guardado_Model.py` | Lo guardado en BD_CIAE (`UnidadDatos`, `MesReporte`, `ReporteIndicador`) |
| `schemas/model/ficha_indicador_Model.py` | Fichas y lista por familia |
| `schemas/model/unidad_resultado_Model.py` | Valores por unidad (extraído → calculado → semaforizado) |
| `schemas/model/pagina_generar_Model.py`, `generacion_ftp_Model.py`, `iaas_Model.py`, `poblacion_Model.py`, `excel_Model.py` | Lo propio de cada página o proceso |

---

## 3. Endpoints

Todos bajo `/Indicadores`. Responden `ApiResponse(success, message, data)` (el front lee
`response.data.data`), **salvo** `/informacion/*`, que responde el dato directo.

Roles: consulta = `admin`, `trabajador_ftp`, `trabajador_IAAS`, `visitante` (el Extractor no
incluye `trabajador_IAAS`); generar FTP/Extractor = `admin`, `trabajador_ftp`; generar IAAS =
`admin`, `trabajador_IAAS`.

| Método y ruta | Para qué | Servicio |
|---|---|---|
| `GET /ftp/indicadores` | Indicadores de la página Generar FTP | `ftp/pagina_generar_ftp_Services.indicadores_para_generar` |
| `GET /ftp/meses-generados?indicador=&ano=` | Meses ya guardados (`"01".."12"`) | `ftp/pagina_generar_ftp_Services.meses_generados_ftp` |
| `GET /ftp/generar?indicador=&ano=&mes=&semana=` | Generar un indicador (semanal si trae `semana`) | `ftp/generar_indicador_ftp_Services.generar_indicador` |
| `POST /ftp/regenerar` | Igual, pidiendo contraseña | `regenerar_indicador` |
| `POST /ftp/generar-categoria` | Todos los indicadores FTP de una familia | `ftp/generar_categoria_ftp_Services.generar_categoria` |
| `POST /ftp/regenerar-categoria` | Igual, pidiendo contraseña | `regenerar_categoria` |
| `GET /ftp/poblacion/archivo-actual?anio=` | Qué población está cargada | `poblacion/archivo_poblacion_Services.archivo_poblacion_actual` |
| `POST /ftp/poblacion/subir` | Subir el Excel de población | `poblacion/archivo_poblacion_Services.subir_poblacion` |
| `POST /ftp/poblacion/recalcular` | Recalcular con la población nueva | `poblacion/recalcular_poblacion_Services.recalcular_poblacion` |
| `GET /censo-dm/subidos` | Censos DM subidos | `censo_dm/archivo_censo_dm_Services.censos_dm_subidos` |
| `POST /censo-dm/subir` | Subir el Censo DM (genera/recalcula DM 05) | `censo_dm/archivo_censo_dm_Services.subir_censo_dm` |
| `GET /iaas/unidades` | Hospitales de IAAS | `iaas/pagina_generar_iaas_Services.unidades_iaas` |
| `GET /iaas/indicadores` | Indicadores de la página Generar IAAS | `iaas/pagina_generar_iaas_Services.indicadores_para_generar` |
| `GET /iaas/meses-generados?anio=` | Meses ya guardados | `iaas/estado_mes_iaas_Services.meses_generados_iaas` |
| `GET /iaas/estado-mes?anio=&mes=` | Lo guardado y las unidades pendientes | `iaas/estado_mes_iaas_Services.estado_del_mes` |
| `POST /iaas/generar` | Generar los 6 IAAS del mes | `iaas/generar_mes_iaas_Services.generar_iaas` |
| `POST /iaas/completar-unidad` | Completar una unidad que entregó tarde | `iaas/completar_unidad_iaas_Services.completar_unidad_tardia` |
| `GET /extractor/indicadores` | Indicadores de la página Generar Extractor | `extractor/pagina_generar_extractor_Services.indicadores_para_generar` |
| `GET /extractor/estado-cortes?anio=` | Cuántos de los 12 meses de cada corte van | `extractor/estado_cortes_Services.estado_ventanas` |
| `GET /extractor/estado-archivos?anio=` | Por archivo y mes: completo / parcial / pendiente | `extractor/estado_archivos_Services.estado_archivos` |
| `POST /extractor/generar` | Subir el Excel de un mes de un archivo | `extractor/subir_archivo_extractor_Services.generar_archivo_mensual` |
| `POST /extractor/completar-cruce` | Subir el Egresos después del SUI-13 | `extractor/completar_cruce_Services.completar_cruce` |
| `GET /reportes/{indicador}/grafica?ano=` | Ficha + reporte + estadísticas | `grafica/grafica_indicador_Services.consultar_grafica_indicador` |
| `GET /informacion/indicadores?campo=&modulo=` | Familias con sus indicadores | `informacion/lista_indicadores_Services.todos_los_indicadores` |
| `GET /informacion/ficha/{indicador}` | Título, objetivo, semáforo, periodicidad | `informacion/ficha_indicador_Services.obtener_ficha_indicador` |
| `GET /informacion/ficha-tecnica/{indicador}` | La ficha + cómo se calcula | `obtener_ficha_tecnica_completa` |
| `GET /excel?indicadores=&indicadores=&ano=&mes=` | Excel en base64 | `excel/generar_excel_Services.generar_excel` |

> `GET /excel` hoy **no** tiene `Depends(solo_roles(...))`: cualquiera que llegue al servidor
> puede pedir el Excel sin sesión. **Por confirmar** si es intencional.

---

## 4. El flujo común de generación

Los servicios de los tres módulos siguen los mismos pasos y los marcan con comentarios
`# 1.`, `# 2.`... en el código:

| Paso | Qué pasa | Dónde |
|---|---|---|
| 1. Validar | Mes/año, peso y tipo de archivo, contraseña si se sobrescribe | `BackEnd/compartido/validar_archivo_Services.py` |
| 2. Mapeo | Se lee el bloque del indicador | `datos/lectura_mapeo/mapeo_por_modulo_Datos.cargar_indicador_*` |
| 3. Extracción | Se cargan los Excel y se sacan numerador y denominador por unidad | capa 1 en `services/<modulo>/` (+ `compartido/ftp_imss/`, `datos/excel_subido/`), capa 2 en `compartido/extraccion_excel/` |
| 4. Cálculo | Fórmulas del mapeo por unidad + `TOTAL_OOAD` | `services/calculo/` |
| 5. Semáforo | Color de cada unidad | `services/semaforo/color_semaforo_Services.py` |
| 6. Guardado | En `BD_CIAE/INDICADORES/...` | `datos/bd_ciae/` |
| 7. Auditoría y respuesta | `auditoria.log` + mensaje | `BackEnd/compartido/auditoria_Services.py` |

"Capa 1" = cómo llega el archivo (bajarlo del FTP, leer el Excel subido, elegir la hoja,
validar que sea el correcto). "Capa 2" = qué sacar de una hoja ya cargada (es igual para
los tres módulos).

**Generar no devuelve el Excel.** Guarda en BD_CIAE y responde un resumen. El Excel se pide
aparte a `/Indicadores/excel`.

---

## 5. Cómo se guarda en BD_CIAE

`BD_CIAE` es carpeta hermana del repositorio (la calcula `configs/settings.py`). Nunca se
escribe a mano: todo pasa por `datos/bd_ciae/`.

```
BD_CIAE/
├── INDICADORES/{año}/
│   ├── {FAMILIA}/{FAMILIA}_{NN}.json     definitivo (ej. CAMA/CAMA_40-49.json, S_Ob/S_Ob_01.json)
│   ├── SEMANAL/{IND}_{año}_semana.json   semanal de FTP (solo meses sin definitivo)
│   ├── EXTRACTOR_CRUCE/{IND}.json        vía 1 + candidatos de la vía 2 (EH 03, DM 04)
│   └── EXTRACTOR_PARTES/{IND}.json       conteo de cada archivo por mes (Neonatal 04 y 06)
├── POBLACION_INFOSALUD/POBLACION_{año}.json
└── auditoria.log
```

### Definitivo (FTP, IAAS y Extractor mensual)

```json
{
  "INDICADOR": "CAMA 01",
  "ANIO": "2026",
  "MESES": {
    "Enero": {
      "Poblacion": null,
      "Reporte": {
        "UMF 46 GUANAJUATO": { "numerador": 12, "denominador": 900, "%": 1.33, "desempeno": "Esperado" },
        "...": "...",
        "TOTAL_OOAD":        { "numerador": 480, "denominador": 41000, "%": 1.17, "desempeno": "Medio" }
      }
    }
  }
}
```

- `%` es el resultado; `desempeno` es el color (`Esperado`, `Medio`, `Bajo`, `Gris`).
- `Poblacion` = `"Mes Año"` de la población con la que se calculó ese mes (`null` si el
  indicador no usa población).
- Meses viejos de FTP traen `color` en vez de `desempeno`; al leer se normaliza
  (`normalizar_meses`).

### Semanal (FTP)

`{"INDICADOR", "ANIO", "SEMANA": 3, "MES": {"Julio": {"Poblacion", "Reporte"}}}`. Al generar
el definitivo de un mes, ese mes se borra del semanal (y el archivo, si se queda vacío).

### Extractor de corte (EH 03, DM 04)

```json
{
  "INDICADOR": "EH 03",
  "ANIO": 2026,
  "MESES": {
    "Enero": { "UMF 46 GUANAJUATO": { "numerador": 3, "desempeno": "Gris" }, "...": "..." }
  },
  "CRUCE":  { "Enero": true, "Febrero": false },
  "CORTES": {
    "MESES": {
      "Junio": { "Poblacion": "Julio 2025", "Reporte": { "UMF 46 GUANAJUATO": { "numerador": 40, "denominador": 25000, "%": 160.0, "desempeno": "Bajo" } } }
    }
  }
}
```
*(valores de ejemplo)*

- `MESES` es **siempre el numerador crudo** de cada mes, con las 46 unidades (0 si no hubo
  casos) y **sin** el envoltorio `Reporte`. Ni Junio ni Diciembre se sobrescriben con el
  corte.
- `CORTES.MESES` tiene, a lo más, `Junio` y `Diciembre`: el corte ya calculado.
- `CRUCE` dice por mes si ya se cruzó con Egresos (`true`) o falta (`false`).

### EXTRACTOR_CRUCE y EXTRACTOR_PARTES

- `EXTRACTOR_CRUCE/{IND}.json`: `{Mes: {"via1": {unidad: n}, "candidatos": [{"unidad", "llave"}]}}`.
  `llave` es el número de afiliación del paciente tal como viene en el SUI-13 (el comentario
  del código dice "cifrada"; **por confirmar** si el archivo de origen ya la trae cifrada). Por
  eso este archivo va aparte del reporte y no debe compartirse.
- `EXTRACTOR_PARTES/{IND}.json`: `{Mes: {"numerador": {unidad: n}, "denominador": {unidad: n}}}`.
  Se conserva aunque el mes ya se haya generado, para poder corregir un solo archivo.

### Población

`POBLACION_{año}.json` = `{"ARCHIVO", "MES_DETECTADO", "ANIO_DETECTADO", "POBLACION": {unidad: {"Todos"|"Hombres"|"Mujeres": {"20 a 24": n, ...}}}}`.

---

## 6. Proceso FTP

**Endpoint:** `GET /Indicadores/ftp/generar?indicador=CAMA 01&ano=2026&mes=07[&semana=3]`.
**Servicio:** `services/ftp/generar_indicador_ftp_Services.py` → `generar_indicador_ftp`.
Los endpoints que generan son `def` (no `async`): FastAPI los corre en otro hilo y la descarga
del FTP no congela el servidor.

1. **Validar.** `semana` vacía, `"None"` o ausente = mes definitivo.
2. **Mapeo.** `cargar_indicador_ftp(indicador)`.
3. **Extracción** (`extraer_indicador_ftp_Services.extraer_indicador`, que recorre las unidades con `extraer_reporte_ftp_Services`):
   - Agrupa lo que pide el mapeo **por reporte real** (`IN33_MF` e `IN33_40` son el mismo
     `IN33`): cada archivo se baja **una sola vez** por unidad, aunque lo usen numerador y
     denominador o dos hojas.
   - Para cada una de las 46 unidades arma la ruta:
     - definitivo: `01. DATAMARTEM/ArchsDataMart_{año}/{año}{mes}/{carpeta}/1.SIAIS_Reportes/{subcarpeta}`
     - semanal: `01. DATAMARTEM/ArchsData_Previos_{año}/{año}{mes}/{carpeta}/1.SIAIS_Reportes/Semana_{n}/{subcarpeta}_S{n}`
     - PB02: `01. DATAMARTEM/ArchsDataMart_{año}/Piramides para {año} por unidades`, archivo
       `PB02U{clave}...` (no depende del mes ni de la semana).

     Las plantillas de ruta y la carpeta de cada reporte (con los nombres que tiene de verdad en el
     FTP, ej. `Planificacion Familiar` sin acento en el semanal) salen de `compartido/ftp_imss/catalogo_ftp.json`;
     la carpeta de la unidad, de `UNIDADES_FINALES` (o `UNIDADES_PREVIOS` si es semanal).
   - Entra carpeta por carpeta; si una falla, `diagnosticar_segmento` explica por qué
     (espacios de más, mayúsculas, carpeta parecida...).
   - Busca el Excel cuyo nombre **empieza** con el código, lo baja a memoria (no se guarda en
     disco) y lee la `hoja` de cada lado con el motor de extracción.
   - Si el denominador es `poblacionInfoSalud`, lo lee de `POBLACION_{año}.json`.
   - Un error en una unidad no detiene a las demás: esa unidad queda sin dato (Gris) y el error
     se anota.
4. **Cálculo.** `calcular_indicador` (`calcular_indicador_ftp_Services`): fórmulas del mapeo por unidad + `TOTAL_OOAD`. Si una
   fórmula truena, la unidad queda Gris y se agrega el error `CALCULO_FALLIDO`.
5. **Semáforo.** `semaforizar_unidades(resultados, semaforo, mes)` (el mes elige el umbral en
   los semáforos por mes).
6. **Guardado.** Definitivo → `guardar_mes_definitivo` + `borrar_mes_semanal`. Semanal →
   `guardar_mes_semanal`.
7. **Respuesta.** `{"restricciones": {tipo de error: {nombreError, descripcionError, unidades: {unidad: [{reportes, ruta}]}}}}`.
   FTP hoy **no** escribe en `auditoria.log` (los otros módulos sí).

Tipos de error ("restricciones") que puede devolver: `RUTA_INVALIDA`, `ARCHIVO_NO_ENCONTRADO`,
`ARCHIVO_DUPLICADO`, `HOJA_NO_ENCONTRADA`, `ETIQUETA_NO_ENCONTRADA`, `SERVICIO_NO_APLICA`,
`ARCHIVO_VACIO`, `VALOR_NULO` (se usó 0), `DESCARGA_FALLIDA`, `PB_JSON_ERROR`,
`CALCULO_FALLIDO`, y `CONEXION` si no se pudo entrar al FTP.

### Categoría, regenerar

- `generar-categoria`: corre `generar_indicador_ftp` para cada indicador FTP de la familia. Si
  uno falla, los demás siguen; las restricciones se juntan por tipo con la unidad marcada
  `"INDICADOR / unidad"`.
- `regenerar` / `regenerar-categoria`: lo mismo pero primero `exigir_contrasena`. El backend
  no impide **generar** un mes ya guardado (lo sobrescribe); la diferencia es solo la
  contraseña. El front usa `/meses-generados` para decidir cuál llamar.

### Población y recálculo

1. `POST /ftp/poblacion/subir` (`poblacion/archivo_poblacion_Services.subir_poblacion`, que lee con `datos/excel_subido/excel_poblacion_Datos.py`): lee el Excel nacional
   con `mapeo/POBLACION.json`, se queda con las filas de **Guanajuato**, valida que las
   columnas de edad sean las esperadas, traduce nombres de unidad con `alias`, detecta
   "Mes Año" del título y guarda `POBLACION_{año}.json` (año del formulario o el actual).
   Responde unidades no encontradas, sobrantes, celdas vacías y alias sugeridos.
2. `POST /ftp/poblacion/recalcular` (`poblacion/recalcular_poblacion_Services.recalcular_poblacion`): **no se dispara solo** al subir.
   - Indicadores FTP con denominador de población: recalcula los meses guardados **desde el
     mes detectado de la población hacia adelante** (si la población es de Julio 2026, solo
     Julio–Diciembre 2026; si no se detectó el mes, todos). El numerador es el guardado, no se
     va al FTP. Hoy ningún indicador de FTP usa población, así que esta parte no cambia nada.
   - Cortes del Extractor: `recalcular_cortes_con_poblacion(año)` rehace **Diciembre de ese
     año** y **Junio del año siguiente**, solo si ya estaban generados.

---

## 7. Proceso IAAS

Seis indicadores fijos (`IAAS 01`..`IAAS 06`, en `INDICADORES_IAAS`) que siempre se generan
juntos (`services/iaas/catalogo_iaas_Services.py`). **Servicio:** `services/iaas/generar_mes_iaas_Services.py`.

**Endpoint:** `POST /Indicadores/iaas/generar` (multipart):
- `numerador[]`: un Excel **por hospital**; el **nombre del archivo es el nombre de la
  unidad** (así lo manda el front). `pesoNumerador[]`: el peso de cada uno.
- `denominador`: JSON `{"IAAS 02": {"HGZ 4 CELAYA": "125", ...}, ...}` (captura manual).
- `excel_denominador_IAAS_01`: Excel global de días paciente (opcional).

1. **Validar** peso de cada archivo (`validar_archivo_subido`).
2. Para cada indicador: **mapeo** (`cargar_indicador_iaas`).
3. **Extracción** (`iaas/leer_excel_iaas_Services.py` y `iaas/numerador_denominador_iaas_Services.py`):
   - Numerador: de cada Excel elige la hoja por sus encabezados, confirma que la **columna E**
     sea de la unidad declarada y cuenta filas con `FILTRO_CONTEO`. Si cualquier archivo está
     mal, responde 400 con **todos** los mensajes.
   - Denominador IAAS 01: del Excel global, `FILTRO_UNIDAD_VALOR` por cada hospital de
     `ORDEN_IAAS01`.
   - Denominador IAAS 02-06: lo capturado. Vacío o 0 = "no capturado".
4. **Cálculo:** `calcular_unidades` con la lista de unidades esperadas
   (`ORDEN_IAAS01` o `ORDEN_DEMAS_IAAS`) y sin sumar al total las de
   `UNIDADES_SIN_OOAD_IAAS`.
5. **Semáforo:** sin mes (fijo, o por tipo de hospital en IAAS 01).
6. **Guardado:** `guardar_mes_definitivo` (sin población).
7. **Auditoría** (`SUBIDA_ARCHIVO`) y respuesta con `unidades_pendientes`: hospitales a los
   que les falta el **denominador** en algún indicador.

Si un indicador falla a la mitad (por ejemplo, un Excel no trae una columna que solo pide
IAAS 02), los indicadores anteriores de la lista ya quedaron guardados. **Por confirmar** si
eso es lo deseado.

### Estado del mes y unidad tardía

- `GET /iaas/estado-mes`: lo guardado (numeradores y denominadores por unidad) y lo
  pendiente; `data: null` si el mes no tiene nada.
- `POST /iaas/completar-unidad` (`completar_unidad_tardia`): pide **contraseña**. Para la
  unidad y los indicadores elegidos toma el Excel nuevo (si se manda), el denominador
  capturado o el Excel de días paciente; lo que no se mande se queda como estaba. Un
  denominador enviado como `null` se guarda como "sin dato" a propósito. Después **recalcula
  el mes completo** de esos indicadores (incluido el `TOTAL_OOAD`) y guarda. Si el mes no se
  había generado, responde 400.

---

## 8. Proceso Extractor

Excel crudos mensuales (una fila por paciente o evento) que el usuario descarga, convierte a
Excel y sube **un archivo a la vez**. **Servicio:** `services/extractor/subir_archivo_extractor_Services.py`.

**Endpoint:** `POST /Indicadores/extractor/generar` (multipart): `anio`, `mes` (`"Enero"`..),
`archivo` + `pesoArchivo`, `archivoBase` (clave del archivo: `SUI_13`, `EGRESOS_TOCO`,
`EGRESOS_NACIMIENTO_TOCO`, `DEFUNCIONES`) y, opcional, `archivoCruce` (Egresos Pacientes).

1. **Validar** el mes, que sea `.xlsx`/`.xls` y el peso.
2. **Qué indicadores alimenta** ese archivo: los que tienen ese `archivo` en el numerador o en
   el denominador (`archivos_del_indicador`). Si la clave no existe, error.
3. **Cada indicador por su cuenta** (`_procesar_indicador`). Si uno falla, los demás se
   guardan igual y su resultado trae `"error"`. Si fallan todos, responde 422. Cada hoja se lee
   una sola vez aunque la usen varios indicadores (`LectorExcel`). Antes de contar se valida
   que el mes/año más repetido en las columnas `columnasPeriodo` sea el declarado.
4. **Auditoría** y mensaje (`"Junio 2026 procesado para EH 03, DM 04 (corte generado)"`).

Lo que pasa en el paso 3 depende de la **periodicidad** del mapeo:

| Caso | Indicadores | Qué se hace |
|---|---|---|
| De corte (`Semestral Anualizado`) | EH 03, DM 04 | Guarda el numerador crudo del mes y genera el corte si ya está la ventana |
| Mensual, mismo archivo | MT 03, MT 04, MT 05, Neonatal 02, Neonatal 03 | Cuenta numerador y denominador del archivo, calcula, semaforiza y guarda como FTP/IAAS |
| Mensual con el denominador en otro archivo | Neonatal 06 | Guarda el lado que trae este archivo; genera cuando están los dos |
| `Mensual Anualizado` | Neonatal 06 | Además, cada mes se reporta con la suma de sus últimos 12 meses |
| `Mensual Anualizado` con el Censo DM | DM 05 | Cuenta por fecha de ingreso; el denominador es el censo, no se suma por mes |

### Mensual (mismo archivo)

`contar_por_unidad` para numerador y denominador (por hospital, con `catalogoUnidades`) →
`calcular_unidades` (con `ceroEsSinDato` si el mapeo lo pide) → `semaforizar_unidades` con el
mes → `guardar_mes_definitivo`. El acumulado se arma al leer (gráfica y Excel), porque estos
indicadores tienen `mensual` y `mensualAcumulado` en `peridocidadGenerada`.

### De corte: EH 03 y DM 04

- Conteo (`contar_filtro_conteo_acumulado`): unidad = primeros 6 caracteres de
  `undadAdscripcion` en `CLAVE_UNIDADES_F`; filas de unidades fuera del catálogo no cuentan.
  - **Vía 1:** cumple edad, tipo de ingreso y diagnóstico principal → cuenta.
  - **Vía 2:** cumple todo menos el diagnóstico y su diagnóstico principal está en
    `codigosCandidatos` → candidato.
- Si el indicador tiene `cruce` activo, guarda vía 1 + candidatos en `EXTRACTOR_CRUCE`. Si el
  Egresos vino junto, cruza de una vez (`validar_candidatos_cruce`): un candidato cuenta si,
  en el Egresos, alguna fila del mismo paciente (`numeroAfiliacion` = `AFILIACION`) trae un
  código válido en las columnas de diagnóstico. Si no vino, el mes queda con `CRUCE: false`
  (solo vía 1) hasta subir el Egresos con `POST /extractor/completar-cruce`.
- `guardar_numerador_mes` → `MESES.<Mes>` (crudo, 46 unidades).
- `intentar_generar_corte`: si el mes es Junio o Diciembre y están los 12 meses de su ventana,
  suma los numeradores, trae el denominador de población, calcula, semaforiza y guarda en
  `CORTES.MESES.<Junio|Diciembre>`.

| Corte | Ventana (12 meses) | Población usada |
|---|---|---|
| Junio {año} | Julio {año-1} – Junio {año} | la de {año-1} |
| Diciembre {año} | Enero – Diciembre {año} | la de {año} |

- Si se vuelve a subir un mes que pertenece a un corte **ya cerrado** (ej. se corrige Marzo
  después de generar Junio), ese corte se recalcula solo (`cortes_recalculados`).
- `GET /extractor/estado-cortes?anio=` muestra Junio {año}, Diciembre {año} y Junio {año+1},
  cada una solo si la anterior ya se generó; un mes cuenta como subido si está en **todos**
  los indicadores de corte.

### Dos archivos y anualizado: Neonatal 06

- Numerador = `DEFUNCIONES`, denominador = `EGRESOS_NACIMIENTO_TOCO`. Cada subida guarda su
  lado en `EXTRACTOR_PARTES` (`guardar_parte_mes`). Da igual cuál se sube primero; si falta
  uno, la respuesta trae `"pendiente"` con el aviso de qué archivo falta.
- Como es `Mensual Anualizado`, el mes **N** se reporta con la suma de N-11..N (puede cruzar al
  año anterior). Si falta algún mes de la ventana, no se genera y se dice cuáles faltan.
- Al subir un mes, también se revisan los **11 meses siguientes**: si ese mes era el que les
  faltaba, se generan; si ya estaban, se recalculan ("También quedaron generados ...").
- `GET /extractor/estado-archivos?anio=` marca cada archivo por **su** lado (puede estar
  subido aunque el mes todavía no se pueda reportar).

### Anualizado con el Censo DM: DM 05

- Numerador = SUI-13 (amputación 84.13-84.19 en intervención/procedimientos, ≥20 años, ingreso
  1/2, sin traumáticas ni dx principal no relacionado: todo en el mapeo). Cada fila se cuenta
  en el mes de su `fechaIngreso` (`columnaMesDeConteo`): la parte del archivo se guarda como
  `{"AAAA-MM": {unidad: n}}` en `EXTRACTOR_PARTES`.
- El mes **N** suma, de los SUI-13 de N-11..N, solo los ingresos de N-11..N (así cuadra con el
  oficial: jul 2025-jun 2026 = 246). Sin `catalogoUnidades` se agrupa por la UMF de adscripción
  (6 primeras cifras de `undadAdscripcion`); los casos sin UMF de Guanajuato no tienen
  resultado propio pero suman al `TOTAL_OOAD` (`FUERA_DE_UNIDADES`).
- Denominador = `fuente: "censoDM"` (`BD_CIAE/CENSO_DM/CENSO_DM_{año}.json`, se sube en la
  página del Extractor): enero-noviembre usan el censo del año anterior y diciembre el del año.
  Si falta el censo el mes queda pendiente; al subirlo se generan los meses que ya tenían su
  ventana. La leyenda del Excel dice qué censo se usó ("Censo DM 2025").
- El censo publicado no es el mismo corte que usa el oficial (queda ~4-5% abajo), así que la
  tasa sale un poco más alta que la oficial; el numerador sí coincide.

---

## 9. Gráficas

1. La página pide la lista con `GET /Indicadores/informacion/indicadores` (por defecto los de
   `mostrarGrafica`).
2. Por indicador: `GET /Indicadores/reportes/{indicador}/grafica?ano=2026`
   (`consultar_grafica_indicador`). El **módulo lo decide el backend** con la carpeta del
   mapeo. Devuelve:
   - `ficha`: lo de `obtener_ficha_indicador` (en IAAS 01 incluye `grupoDeUnidad`).
   - `reporte`: `MESES` y, según el caso:
     - IAAS: si el dato guardado trae `HGSZ...`/`HGSZMF...`, se cambia al nombre del catálogo.
     - FTP: `SEMANA` = el semanal, solo si es del mes **siguiente** al último definitivo.
     - `mensual` + `mensualAcumulado`: `MENSUAL_ACUMULADO` sumando meses seguidos desde enero
       (se detiene en el primer mes que falte).
     - Extractor de corte: `MESES` se reemplaza por **el último corte cerrado** (no los
       numeradores crudos).
   - `estadisticas` (`grafica/estadisticas_grafica_Services.py`, con el semáforo del mapeo):
     `resumenPorMes` y `resumenAcumuladoPorMes` (`grafica/resumen_por_mes_Services.py`: Total OOAD
     con num/den, meta, unidades por color) y
     `mapaCalor` (resultado y color de cada unidad en cada mes). `null` si no hay datos.

   - `perfil` (`grafica/perfil_indicador_Services.py`): tipo de meta, niveles del semáforo, meta
     por mes, `franjasPorMes` (y `franjasDeUnidad` cuando el semáforo va por grupo, IAAS 01),
     unidad de medida, si es por corte y, en el Extractor de corte, `serieCortes`. El front dibuja
     todos los indicadores igual, sobre esas franjas: la periodicidad solo cambia las etiquetas.

---

## 10. Excel

`GET /Indicadores/excel?indicadores=EH 03&indicadores=DM 04&ano=2026&mes=Junio`
(`services/excel/generar_excel_Services.py`). `mes` es opcional (`"06"` o `"Junio"`); sin mes, cada
indicador usa su último mes con datos.

1. **Leer** cada indicador de BD_CIAE (`excel/leer_hoja_excel_Services.leer_hoja`), con la regla de su módulo:
   - Extractor de corte: sus meses son los cortes (`CORTES.MESES`).
   - FTP: si el mes más reciente solo existe como semanal, se usa ese (y su semana).
   - IAAS y Extractor mensual: los meses guardados.
   Un indicador sin datos no detiene a los demás: va en `errores`.
2. **Dibujar:**
   - FTP y Extractor → hoja estándar (`excel/escribir_hoja_indicador_Services.escribir_hoja_indicador`): una
     pestaña por indicador, histórico de meses, leyenda de población por mes, leyendas del
     semáforo y, si aplica, bloque de mensual acumulado. Las periodicidades de corte solo
     muestran sus meses de corte.
   - Solo IAAS → su propio libro (`excel/excel_iaas_Services.excel_iaas`): matriz por mes,
     acumulado desde febrero y anual. Un indicador → su hoja; varios → los 6.
   - IAAS mezclado con FTP/Extractor → error 400 (todavía no se puede).
3. **Responder** `{archivo_b64, nombre_archivo, completados, errores}`. El nombre lleva la
   familia o `nombreArchivoFinal`, el mes y la semana si todas las pestañas coinciden.

---

## Excepciones y casos especiales

Lo que se sale de la regla general, con el indicador concreto. Lo que dice "por confirmar" no
está claro en el código y conviene revisarlo.

### Cálculo y semáforo

| Caso | Indicadores | Qué pasa | Dónde |
|---|---|---|---|
| Semáforo por tipo de hospital | IAAS 01 | Umbral distinto para HGS / HGZ / HGR / HGO / HGP; el total usa `OOAD`. La ficha manda `grupoDeUnidad` al front | `umbrales_semaforo_Services.umbrales_para`, `UNIDADES.UNIDAD_TIPO_IAAS01` |
| Semáforo por mes | CACU 01, CAMA 01/40-49/50-69, CUPN 01, DM 01, EH 01, S_Ob 01 | La meta crece mes a mes (acumulado desde enero) | mapeo |
| Sin nivel Medio | EH 03, DM 04 | `"Medio": null`: solo verde o rojo; el Excel no imprime leyenda Medio | mapeo, `leyendas_semaforo_excel_Services._texto_medio` |
| Metas en rango | IAAS, MT 03 | `">= 4 a <= 7"`, `"< 1 o > 7"`. En gráficas se dibujan con fondo de color | `umbrales_semaforo_Services.condicion_de_umbral` |
| Promedios, no porcentajes | CE 01, CE 02, CUPN 05, CUPN 07 | `resultado` sin `* 100`. En CUPN 05/07 el acumulado suma numeradores y denominadores (promedio ponderado) | mapeo |
| Tasas | IAAS 01/03-06, Neonatal 06 (x1,000); EH 03, DM 04 (x100,000) | Solo cambia la fórmula | mapeo |
| Redondeo propio | FTP y población | Numerador y denominador suben de entero solo con decimal ≥ 0.60 | `formulas_Services.redondeo_personalizado` |
| Denominador 0 = sin dato | Neonatal 04 y 06 (`ceroEsSinDato`) | Un hospital sin nacimientos sale **Gris**, no "0 = Esperado" (HGZMF 21) | `calcular_unidades(cero_es_sin_dato=...)` |
| Fuera del TOTAL_OOAD | IAAS: HGSMF 7, HGSMF 15, HGSMF 20 (menos de 20 camas) | Se calculan y se muestran, pero no suman al total | `iaas.json → UNIDADES_SIN_OOAD_IAAS` |
| Unidades sin PAMF en el corte | EH 03, DM 04 | Una unidad sin denominador de población no aparece en el corte | `intentar_generar_corte` |

### Periodicidad y acumulados

| Caso | Indicadores | Qué pasa |
|---|---|---|
| El archivo ya viene acumulado | CACU 01, CAMA, CUPN 01, DM 01, EH 01, MT 01, S_Ob 01 (`mensual: false, mensualAcumulado: true`) | No se suma nada: el reporte SIAIS ya trae el acumulado |
| Acumulado sumando meses | IAAS, MT 03-05, Neonatal 02/03, CUPN 05/07 (`mensual` y `mensualAcumulado` en `true`) | Se arma al leer (gráfica y Excel); se detiene en el primer mes que falte |
| Periodicidad dice acumulado pero no se suma | EH 02 (`"Mensual - Mensual Acumulado"` con `mensualAcumulado: false`) | No se arma acumulado. **Por confirmar** cuál de los dos campos está bien |
| Anualizado que ya viene del FTP | DM 02, S_Ob 04 | Se lee tal cual (el reporte ya trae los 12 meses) |
| Anualizado que suma el Extractor | Neonatal 06 | Ver [8](#dos-archivos-y-anualizado-neonatal-06). Los primeros meses del año necesitan el año anterior subido |
| Por corte | EH 03, DM 04 | Ventanas Junio/Diciembre; Junio usa la población del año anterior; corregir un mes recalcula el corte cerrado |

### Extracción

| Caso | Indicadores | Qué pasa |
|---|---|---|
| Columna que cambia según el mes | CUPN 01 | `MESES_CIP01` (numerador) y `POBLACION_CIP01` (denominador: columna C de enero a junio, R de julio a diciembre) |
| Dos hojas del mismo reporte | DM 03 (`IN33_MF`, `IN33_40`), S_Ob 01 (`CP03_A`, `CP03_B`) | El archivo se baja una vez; el sufijo solo distingue la fuente en la fórmula |
| Unidades sin el servicio | CE 01, CE 02, CUPN 07 (`unidadesSinServicio`) | La etiqueta faltante se reporta como "No se encontró tal servicio" en vez de error; la unidad queda Gris |
| "o" entre condiciones | MT 04 (`filtroAlternativas`) | Parto con método **o** aborto con método; además excluye régimen `ND` con `SUFIJO` |
| Código en cualquier diagnóstico / exclusión | MT 03, Neonatal 06 (`filtroGrupoColumnas`) | `CUALQUIERA` para incluir, `NINGUNA` para excluir (códigos O00-O08 en MT 03; P36-P39 en Neonatal 06) |
| Vía 2 con Egresos | EH 03, DM 04 (`cruce`) | Ver [8](#de-corte-eh-03-y-dm-04). El Egresos puede subirse después |
| Número escrito como texto | Extractor e IAAS | Las columnas de un `RANGO` se convierten a número; si no traen ninguno, se rechaza el archivo |
| Archivo de otro mes | Extractor | Se compara el mes/año más repetido de `columnasPeriodo` contra lo declarado |
| Excel de otra unidad | IAAS | La columna E debe ser la unidad declarada (acepta `HGSZ` = `HGS`) |
| Unidad que no aparece en el Excel de días paciente | IAAS 01 | Al generar el mes = 0 (el Excel global sí se subió); al completar una unidad tardía = sin dato (Gris) |
| Unidad sin Excel / Excel sin casos | IAAS | Sin Excel = Gris; con Excel y ninguna fila que cumpla = 0 real |
| Denominador capturado vacío o 0 | IAAS 02-06 | Se toma como "no capturado" (Gris) y la unidad aparece en pendientes |

### Denominadores y unidades

| Caso | Qué pasa |
|---|---|
| Los denominadores siguen la ficha aunque el dato oficial difiera | DM 01 y CACU 01 toman la población de la pirámide `PB02`; EH 01, CAMA 01, CAMA 40-49 y CAMA 50-69 toman columnas de `CP02`/`CP03` con un descuento por grupo de edad escrito en la fórmula. Es criterio del proyecto: si el número oficial no cuadra, se sigue la ficha |
| Carpeta del FTP ≠ clave de la unidad | Salvatierra: carpeta `11130220 UMFH 08` (empieza con 111302) pero su clave en `CLAVE_UNIDADES_F` es `111303`. Por eso PB02 se busca con la clave del catálogo, no con la carpeta (`_CLAVE_POR_UNIDAD`) |
| Carpeta semanal ≠ carpeta definitiva | `UNIDADES_PREVIOS` usa `11050602 HGSMF 2` y `11090220 UMFH 6`; `UNIDADES_FINALES` usa `HGZMF 02` y `UMFH 06` |
| Nombres distintos entre fuentes | Población: `alias` en `POBLACION.json` (ej. `"hgzmf 2 irapuato"` → `"HGSMF 2 IRAPUATO"`). IAAS: `HGSZ`/`HGSZMF` se unifica a `HGS`/`HGSMF` (`UNIDADES.alias_hgsz`) |
| Archivo duplicado en el FTP | Si hay más de un archivo con el mismo prefijo, se usa el que termina con el **periodo del mes** (`periodoEnNombre` de `compartido/ftp_imss/catalogo_ftp.json`: junio 2026 → `...052026062026`); si ninguno lo trae, el primero que lista el servidor. Igual se avisa `ARCHIVO_DUPLICADO` |
| Población solo para el Extractor | Hoy ningún indicador de FTP tiene `poblacionInfoSalud`; el recálculo por población solo cambia los cortes de EH 03/DM 04 |

### Pendientes que no están en el mapeo

- **CUPN 03**: el numerador sale del FTP (PF06, F42/T42) pero la meta POA del denominador no viene en
  el FTP (la celda META del PF06 llega en 0) ni en el Extractor: hay que capturarla.
- **Neonatal 05** no existe todavía en ninguna carpeta del mapeo.

---

## 12. Cómo escribir un endpoint nuevo

```python
# Controller/ejemplo_Controller.py
from fastapi import APIRouter, Depends

from auth.services.jwt_Services import solo_roles
from configs.response import ApiResponse
from services.ftp.pagina_generar_ftp_Services import meses_generados_ftp

ejemploApi = APIRouter()

ROLES_CONSULTA = ("admin", "trabajador_ftp", "trabajador_IAAS", "visitante")


#Get Indicadores/ejemplo/meses?indicador=CAMA 01&ano=2026
@ejemploApi.get("/meses")
async def meses(indicador: str, ano: str, payload: dict = Depends(solo_roles(*ROLES_CONSULTA))):
    return ApiResponse(success=True, message="Meses con datos", data=meses_generados_ftp(indicador, ano))
```

Y registrarlo en `Routes/indicadores_Route.py`:

```python
from ..Controller import ejemplo_Controller
routesIndicadores.include_router(ejemplo_Controller.ejemploApi, prefix="/ejemplo")
```

Reglas:
- El controller no tiene lógica: llama a **un** servicio (nunca a `datos/` directo).
- Siempre `Depends(solo_roles(...))`.
- Siempre `ApiResponse(success, message, data)` (salvo `/informacion`, que ya responde directo,
  y epidemiología, que es otro módulo).
- Los servicios regresan `(mensaje, datos)` y el controller los envuelve.
- Archivos: `nombre_Controller.py`, `nombre_Services.py`, `nombre_Datos.py`; un archivo por responsabilidad, nombres en español y descriptivos.
- Endpoints que tardan (FTP) se declaran con `def`, no `async def`.
