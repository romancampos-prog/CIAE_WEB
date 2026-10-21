# Mapeo de indicadores (los JSON de configuración)

El **mapeo** es la configuración de cada indicador: de qué archivo sale el numerador y el
denominador, qué celdas o filas se leen, con qué fórmula se calcula y con qué semáforo se
colorea. El código es el mismo para todos los indicadores; lo que cambia de uno a otro vive
aquí.

> Cómo se usa esta configuración paso a paso (generar, guardar, graficar) está en
> [../README.md](../README.md). Los casos raros de cada indicador están en
> [../README.md#excepciones-y-casos-especiales](../README.md#excepciones-y-casos-especiales).

**Regla de oro:** nunca abras estos JSON a mano desde el código. Se leen siempre con
`services/indicadorMapeo_Services.py` (`bloque_mapeo`, `cargar_indicador_mapeo`,
`cargar_indicador_iaas`, `cargar_indicador_extractor`, `todos_los_indicadores`,
`indicadores_del_modulo`). Es el único archivo que sabe en qué carpeta vive cada indicador.

---

## Índice

1. [Carpetas](#1-carpetas)
2. [El "sobre" de cada indicador](#2-el-sobre-de-cada-indicador)
3. [`reporte`: de dónde sale cada número](#3-reporte-de-dónde-sale-cada-número)
4. [Modos de extracción](#4-modos-de-extracción-modoextraccion)
5. [Filtros](#5-filtros-filtrocolumna-filtrogrupocolumnas-filtroalternativas)
6. [Campos propios del Extractor e IAAS](#6-campos-propios-del-extractor-e-iaas)
7. [`operacion`: las fórmulas](#7-operacion-las-fórmulas)
8. [`semaforo`](#8-semaforo)
9. [Por qué FTP lleva `hoja` y Extractor/IAAS no](#9-por-qué-ftp-lleva-hoja-y-extractoriaas-no)
10. [Cómo agregar un indicador nuevo](#10-cómo-agregar-un-indicador-nuevo)

---

## 1. Carpetas

```
mapeo/
├── ftp/          {FAMILIA}.json   se generan desde los reportes SIAIS del FTP
├── iaas/         IAAS.json        Excel que sube el usuario + captura manual
├── extractor/    {FAMILIA}.json   Excel crudo mensual (SUI-13, Egresos, Defunciones...)
├── sin_generar/  {FAMILIA}.json   todavía no se automatizan (solo ficha y semáforo)
├── catalogos/
│   ├── familias.json              nombre, ícono y color de cada familia
│   └── archivos_extractor.json    nombre legible de cada archivo del Extractor
├── unidades/
│   ├── ftp.json                   las 46 UMF: carpeta en el FTP, nombre y clave
│   ├── hospitales.json            hospitales de 2º nivel (MT y Neonatal del Extractor)
│   └── iaas.json                  hospitales de IAAS, su tipo y su orden
└── POBLACION.json                 cómo leer el Excel de población InfoSalud
```

- **La carpeta es el módulo.** Ningún indicador escribe `"modulo"`: el backend se lo pone
  al leer (`ftp`, `iaas`, `extractor`, o `""` si está en `sin_generar/`).
- **Una familia puede estar en varias carpetas.** Ejemplo: `ftp/EH.json` tiene EH 01 y
  EH 02, y `extractor/EH.json` tiene EH 03. La familia es la primera palabra del nombre del
  indicador (`"EH 03"` → `EH`).
- **`imagen` y `color` son de la familia**, no del indicador: viven una sola vez en
  `catalogos/familias.json` y el backend se los copia a cada indicador.

### `catalogos/familias.json`

```json
"EH": { "nombre": "Hipertensión arterial", "imagen": "icono_eh.png", "color": "#4e1224" }
```

`nombre` se muestra en las páginas de Generar (`nombreCategoria`); `imagen` y `color` los
pinta el front (ícono con `urlIcono`, color con la variable CSS `--ic`).

### `catalogos/archivos_extractor.json`

Una entrada por cada archivo que se sube en el Extractor. La **clave** (`SUI_13`,
`EGRESOS_TOCO`, `EGRESOS_NACIMIENTO_TOCO`, `EGRESOS_PACIENTES_DIARIA`, `DEFUNCIONES`) es la
que se escribe en el campo `archivo` del mapeo.

```json
"DEFUNCIONES": { "nombre": "Defunciones (unidad de atención)", "nombreSugerido": "DEFUNCIONES_{MM}_{AAAA}.xlsx" }
```

`nombre` es lo que ve el usuario; `nombreSugerido` es solo una sugerencia (el archivo se
valida por su **contenido**, no por su nombre).

### `unidades/`

Se leen en `shared/UNIDADES.py` **al arrancar el servidor** (si los cambias, reinicia).

| Archivo | Qué trae | Quién lo usa |
|---|---|---|
| `ftp.json` | `UNIDADES_FINALES` (carpeta de cada UMF en el FTP mensual), `UNIDADES_PREVIOS` (carpeta en el FTP semanal), `NOMBREUNIDADESARCHIVO` (nombre que se guarda), `CLAVE_UNIDADES_F` (`{clave de 6 dígitos: nombre}`), `nombreAgrupacion` | FTP, población, EH 03/DM 04 |
| `hospitales.json` | `CLAVE_HOSPITALES` (`{clave presupuestal de 12 dígitos: nombre}`), `nombreAgrupacion` | Extractor con `"catalogoUnidades": "hospitales"` (MT 03-05, Neonatal) |
| `iaas.json` | `ORDEN_IAAS01`, `ORDEN_DEMAS_IAAS`, unidades por tipo (`UNIDADES_HGS_IAAS01`, `_HGZ_`, `_HGR_`, `_HGO_`, `_HGP_`), `UNIDADES_SIN_OOAD_IAAS` | IAAS |

Las tres listas de `ftp.json` van **en el mismo orden**: la posición 5 de
`UNIDADES_FINALES` es la carpeta de la unidad que está en la posición 5 de
`NOMBREUNIDADESARCHIVO`.

### `POBLACION.json`

Dice cómo leer el Excel nacional de población InfoSalud: `hoja`, `fila_titulo` (de ahí sale
el mes/año del reporte), `fila_grupos`, `fila_encabezados`, `encabezados_edad` (los nombres
exactos de las columnas de edad, ej. `"20 a 24"`, `"25  a 29"` con doble espacio),
`bloques_edad` (`Todos`, `Hombres`, `Mujeres`) y `alias` (nombre en el Excel → nombre en el
sistema; `null` = ignorar esa fila). Lo usa `services/poblacion_Services.py`.

---

## 2. El "sobre" de cada indicador

Todos los indicadores, de cualquier carpeta, tienen la misma forma por fuera. Ejemplo real
(EH 03, recortado):

```json
"EH 03": {
    "nombreArchivoFinal": "EH_03",
    "fechaModificacion": "10/09/2026",
    "mostrarGenerar": true,
    "mostrarGrafica": true,
    "previos": false,
    "periodicidad": "Semestral Anualizado",
    "peridocidadGenerada": { "semstralAnualizado": true },
    "informacion": { "titulo": "...", "objetivo": "...", "descNum": "...", "descDen": "..." },
    "reporte":  { ... ver sección 3 ... },
    "semaforo": { "Esperado": "<= 17.38", "Medio": null, "Bajo": "> 17.38" }
}
```

| Campo | Qué es | Valores | Quién lo usa |
|---|---|---|---|
| `nombreArchivoFinal` | Nombre del indicador en el nombre del Excel descargado | texto | `excel_Services.py` |
| `fechaModificacion` | Fecha en que se cambió la ficha | `"dd/mm/aaaa"` | ficha técnica (`/informacion/ficha-tecnica`) |
| `mostrarGenerar` | Si aparece en la página de Generar de su módulo | `true` / `false` | `indicadores_del_modulo`, `todos_los_indicadores("mostrarGenerar")`. Si falta, `todos_los_indicadores` lo toma como `true` |
| `mostrarGrafica` | Si aparece en Gráficas / descargas | `true` / `false` | `todos_los_indicadores("mostrarGrafica")` (default de `/informacion/indicadores`) |
| `previos` | Si el indicador tiene reporte **semanal** en el FTP | `true` / `false` | Se manda al front en Generar (`IndicadorGenerar.previos`). El backend no lo valida: si llega `semana`, genera semanal |
| `periodicidad` | Cómo se publica el indicador (texto de la ficha) | ver tabla abajo | Excel (qué columnas de mes), Extractor (qué proceso sigue), texto de ayuda |
| `peridocidadGenerada` | Qué datos guarda/arma el sistema | `{"mensual": bool, "mensualAcumulado": bool}` | `acumula_sumando_meses` (gráfica y Excel) |
| `informacion` | Textos de la ficha | `titulo`, `objetivo`, `descNum`, `descDen` (los 4 obligatorios) | ficha, gráficas, Excel |
| `reporte` | Reglas de extracción y cálculo. `{}` en `sin_generar/` | ver sección 3 | generación |
| `semaforo` | Umbrales de color | ver sección 8 | generación, gráficas, Excel |

Campos que solo llevan algunos indicadores:

| Campo | Dónde | Para qué |
|---|---|---|
| `unidadesSinServicio` | FTP (CE 01, CE 02, CUPN 07) | Lista de unidades que no tienen ese servicio. Si en su Excel no aparece la etiqueta buscada, el error se reporta como "No se encontró tal servicio" (`SERVICIO_NO_APLICA`) en lugar de "Etiqueta no encontrada" |
| `MESES_CIP01`, `COLUMNAS_POR_MES` | FTP (CUPN 01) | Columnas que cambian según el mes. Ver [INTERSECCION_COLUMNA](#interseccion_columna) |
| `excel` | IAAS | `titulo`, `columnaNumerador`, `columnaDenominador`: textos que IAAS pone en su Excel y en la pantalla de captura. `codigo` existe pero hoy el código no lo lee (por confirmar si se puede quitar) |

### `periodicidad` y `peridocidadGenerada`

`periodicidad` se compara sin importar mayúsculas ni guiones (`shared/reglas_periodicidad.py`):
`"Mensual - Mensual Acumulado"` = `"mensual mensual acumulado"`.

| periodicidad | Significa | Ejemplos |
|---|---|---|
| `Mensual` | dato de cada mes | CE 01, CUPN 04, S_Ob 02 |
| `Mensual - Mensual Acumulado` | dato de cada mes **y** acumulado desde enero | IAAS, MT 03-05, CUPN 05/07 |
| `Mensual Acumulado` | cada mes ya viene acumulado desde enero | CACU 01, CAMA, DM 01, EH 01 |
| `Mensual Anualizado` | cada mes = últimos 12 meses | DM 02, S_Ob 04 (FTP, ya viene así), Neonatal 06 (el Extractor suma) |
| `Mensual Trimestralizado` / `Mensual Semestralizado` | cada mes = últimos 3 / 6 meses | DM 03; CACU 02 (sin generar) |
| `Trimestral Acumulado` | solo se publica en Marzo, Junio, Septiembre, Diciembre | CACU 04, CAMA 04 (sin generar) |
| `Semestral Anualizado` | solo Junio (jul–jun) y Diciembre (ene–dic) | EH 03, DM 04 |

Las dos últimas son **"de corte"**: el Excel solo muestra las columnas de los meses de corte
(`indices_de_meses`). Las demás muestran los 12 meses.

`peridocidadGenerada` (sí, con ese nombre) decide si el sistema **suma** meses:

| `mensual` | `mensualAcumulado` | Qué pasa |
|---|---|---|
| `true` | `true` | Se guarda el dato de cada mes y el acumulado se arma **sumando** numeradores y denominadores mes a mes (gráfica y Excel). IAAS, MT 03-05, Neonatal 02/03, CUPN 05/07 |
| `false` | `true` | El archivo **ya viene acumulado** (CACU 01, CAMA, DM 01, EH 01): no se suma nada |
| `true` | `false` | Solo el dato del mes |

---

## 3. `reporte`: de dónde sale cada número

```json
"reporte": {
    "numerador":   { "fuente": "...", ... },
    "denominador": { "fuente": "...", ... },
    "operacion":   { "numerador": "<fórmula>", "denominador": "<fórmula>", "resultado": "<fórmula>" }
}
```

`numerador` y `denominador` se escriben **por separado aunque salgan del mismo archivo**:
cada uno lleva solo las columnas que su fórmula necesita. Si los dos leen el mismo archivo,
FTP lo baja una sola vez y el Extractor lee cada hoja una sola vez.

### Valores de `fuente`

| fuente | De dónde sale | Módulo | Campos del bloque |
|---|---|---|---|
| `ftp` | Un reporte SIAIS que el sistema busca solo en el FTP | FTP | `archivo: {CODIGO: detalle}` |
| `poblacionInfoSalud` | `BD_CIAE/POBLACION_INFOSALUD/POBLACION_{año}.json` | Extractor (EH 03, DM 04). FTP también lo acepta, pero hoy ningún indicador de FTP lo usa | `sexo` |
| `xlsxWeb` | Un Excel que la persona sube por la web | IAAS | `modoExtraccion`, `encabezado`, `nombreArchivo`, filtros |
| `capturaWeb` | Un número que se escribe a mano en un formulario | IAAS 02-06 (denominador) | ninguno |
| `extractor` | Un Excel crudo mensual (una fila por paciente o evento) | Extractor | `archivo`, `modoExtraccion`, `agrupacion`, filtros... |

### `fuente: "ftp"`

`archivo` es un diccionario `{código del reporte: detalle}`. El **código** es el principio
del nombre del archivo en el FTP (`CP02` → busca `CP02U...xls`). Si un mismo reporte se
necesita leer de dos hojas, se le pone un sufijo con guion bajo: `IN33_MF` e `IN33_40`
(DM 03), `CP03_A` y `CP03_B` (S_Ob 01). Lo de antes del `_` es el reporte; el código completo
es el nombre que se usa en la fórmula.

```json
"numerador": {
    "fuente": "ftp",
    "archivo": {
        "CP02": { "hoja": "IMCPUM", "modoExtraccion": "INTERSECCION_COLUMNA",
                  "columna": "CO", "buscar": "TOTAL DE LA UNIDAD", "columna_dato": ["DF", "ET", "GD"] },
        "CP03": { "hoja": "04CobDM_HTA_COL", "modoExtraccion": "INTERSECCION_COLUMNA",
                  "columna": "A", "buscar": "TOTAL DE LA UNIDAD", "columna_dato": ["C", "G"] }
    }
}
```
*(DM 01)*

- La **subcarpeta** del FTP donde vive cada código (`Salud Pública`, `Indicadores`...) está en
  `REPORTES_POR_SUBCARPETA` de `services/ftp/navegacion_ftp_Services.py`. Si usas un reporte
  nuevo que no está ahí, hay que agregarlo en ese archivo.
- `PB02` es especial: no está en la carpeta de cada unidad sino en
  `ArchsDataMart_{año}/Piramides para {año} por unidades`, un archivo por unidad que se
  encuentra por su clave (`PB02U{clave}...`).
- Para saber qué hay en cada letra de un reporte: `WEB_CIAE/encabezados_reportes/{CODIGO}.json`.

### `fuente: "poblacionInfoSalud"`

`sexo` dice qué bloque (`Todos`, `Hombres`, `Mujeres`) y qué columnas de edad se leen. Cada
grupo se vuelve un nombre que se usa en la fórmula del denominador:

```json
"denominador": {
    "fuente": "poblacionInfoSalud",
    "sexo": { "Todos": ["20 a 24", "25  a 29", "30 a 34", "...", "70 a 74"] }
},
"operacion": { "denominador": "sum(Todos)", ... }
```
*(EH 03; los nombres de columna deben ser idénticos a `encabezados_edad` de `POBLACION.json`)*

### `fuente: "xlsxWeb"` (IAAS)

```json
"numerador": {
    "fuente": "xlsxWeb",
    "nombreArchivo": "Informe de infecciones y microorganismos (por unidad)",
    "modoExtraccion": "FILTRO_CONTEO",
    "encabezado": 5,
    "filtroColumna": {
        "R":  { "filtro": "NO",         "nombreColumna": "Infección importada de otro hospital" },
        "AF": { "filtro": "CONFIRMADA", "nombreColumna": "Clasificación de la infección" }
    }
}
```
*(IAAS 01)*

- `encabezado`: número de fila (empezando en 1) donde están los títulos de columna.
- `nombreArchivo`: solo es una etiqueta para la ficha técnica.
- **No lleva `hoja`** (ver [sección 9](#9-por-qué-ftp-lleva-hoja-y-extractoriaas-no)).

### `fuente: "capturaWeb"`

`{ "fuente": "capturaWeb" }` y nada más. El valor llega del formulario en el campo
`denominador` del POST.

### `fuente: "extractor"`

```json
"numerador": {
    "fuente": "extractor",
    "archivo": "EGRESOS_TOCO",
    "modoExtraccion": "FILTRO_CONTEO",
    "encabezado": 1,
    "agrupacion": "cvePresupuestal",
    "catalogoUnidades": "hospitales",
    "columnasPeriodo": { "mes": "mesm", "anio": "aniom" },
    "filtroColumna": {},
    "filtroGrupoColumnas": [ ... ],
    "filtroAlternativas":  [ ... ]
}
```
*(MT 04; cada campo está explicado en la [sección 6](#6-campos-propios-del-extractor-e-iaas))*

---

## 4. Modos de extracción (`modoExtraccion`)

El motor único es `services/metodos_extraccion_excel.py`. Recibe la hoja ya cargada y el
bloque del mapeo, lo **valida** contra un modelo (si al mapeo le falta un campo, falla con
`DETALLE_INVALIDO` antes de leer) y extrae.

Las **letras** son letras de columna de Excel (`"A"`, `"AC"`). Las **filas** se cuentan
desde 1, igual que en Excel.

| Modo | Qué hace | Campos | Devuelve |
|---|---|---|---|
| `INTERSECCION_COLUMNA` | Busca una fila por un texto y toma valores de esa fila | `columna`, `buscar`, `columna_dato` | lista de números |
| `INTERSECCION_FILA` | Toma valores de filas fijas | `fila`, `columna_dato` | lista de números |
| `ULTIMA_FILA` | Último número de cada columna | `columna_dato`, `encabezado` | lista de números |
| `FILTRO_CONTEO` | Cuenta filas que cumplen filtros | `filtroColumna`, `filtroGrupoColumnas`, `filtroAlternativas`, `encabezado` | un número (o, en el Extractor, uno por unidad) |
| `FILTRO_CONTEO_ACUMULADO` | Igual que `FILTRO_CONTEO` + vía 2 con cruce | lo de `FILTRO_CONTEO` + `cruce` | un número por unidad |
| `FILTRO_UNIDAD_VALOR` | Ubica la fila de una unidad y toma un valor | `columnaUnidad`, `tomarValor`, `filtroColumna` | un número |

Agregar un modo nuevo = un modelo `Detalle...` + una función + una entrada en `EXTRACTORES`
y en `MODELOS_DETALLE` (y en el `Literal ModoExtraccion` de `schemas/model/indicador_Model.py`).

### INTERSECCION_COLUMNA

Busca en la columna `columna` la **primera** fila cuyo texto **contiene** `buscar` (sin
importar mayúsculas; los saltos de línea de la celda cuentan como espacio). De esa fila toma
las columnas de `columna_dato`, en ese orden.

```json
"IAP03": { "hoja": "Prod_Enf_Mens_Serv80", "modoExtraccion": "INTERSECCION_COLUMNA",
           "columna": "G", "buscar": "TOTAL DEL SERVICIO  [ 80 ]", "columna_dato": ["L"] }
```
*(CE 01 numerador. Ojo: `buscar` respeta espacios dobles; debe ir igual que en el Excel)*

**Columnas que cambian según el mes** (solo CUPN 01): en `columna_dato` se escribe un
**marcador** en vez de una letra, y el indicador trae una tabla `{número de mes: letra}`:

```json
"columna_dato": ["MESES_CIP01"],
...
"MESES_CIP01": { "1": "D", "2": "F", "3": "H", ..., "12": "AC" },
"COLUMNAS_POR_MES": { "POBLACION_CIP01": { "1": "C", ..., "6": "C", "7": "R", ..., "12": "R" } }
```

`MESES_CIP01` es un marcador con nombre fijo; `COLUMNAS_POR_MES` permite marcadores con
cualquier nombre. Al generar Julio, `MESES_CIP01` se vuelve la columna `S` y `POBLACION_CIP01`
la `R`.

### INTERSECCION_FILA

Para cada fila de `fila`, toma cada columna de `columna_dato`. No busca texto: la fila es fija.

```json
"MT03": { "hoja": "Vigilancia Materna", "modoExtraccion": "INTERSECCION_FILA",
          "columna_dato": ["K", "L"], "fila": [69] }
```
*(MT 01 numerador → `MT03[0]` = K69, `MT03[1]` = L69)*

### ULTIMA_FILA

Desde la fila `encabezado` hacia abajo, toma el **último valor numérico** de cada columna de
`columna_dato` (sirve cuando el total está al final y el número de filas cambia).

```json
"CP04": { "hoja": "01Confirmacion_DM_HTA", "modoExtraccion": "ULTIMA_FILA",
          "columna_dato": ["G"], "encabezado": 8 }
```
*(DM 02 numerador)*

### FILTRO_CONTEO

Cuenta las filas que cumplen **todo** `filtroColumna`, **todos** los grupos de
`filtroGrupoColumnas` y, si hay `filtroAlternativas`, **al menos una** alternativa
(explicados en la [sección 5](#5-filtros-filtrocolumna-filtrogrupocolumnas-filtroalternativas)).

- En **IAAS** devuelve un solo número por Excel (un Excel por unidad).
- En el **Extractor** se cuenta **por unidad** (`contar_por_unidad`): la unidad sale de la
  columna `agrupacion` buscada en el catálogo `catalogoUnidades`.

```json
"numerador": {
    "fuente": "extractor", "archivo": "EGRESOS_NACIMIENTO_TOCO", "modoExtraccion": "FILTRO_CONTEO",
    "encabezado": 1, "agrupacion": "cvePresupuestal", "catalogoUnidades": "hospitales",
    "columnasPeriodo": { "mes": "mesm", "anio": "aniom" },
    "filtroColumna": {
        "U": { "tipo": "LISTA", "filtro": [1],       "nombreColumna": "ESTADORN" },
        "T": { "tipo": "RANGO", "filtro": [0, 36],   "nombreColumna": "SEMGES" },
        "O": { "tipo": "RANGO", "filtro": [0, 1000], "nombreColumna": "PESO" }
    }
}
```
*(Neonatal 03: recién nacidos vivos, menores de 37 semanas, de 1000 g o menos)*

### FILTRO_CONTEO_ACUMULADO

Solo EH 03 y DM 04 (Extractor, por corte). Cuenta igual que `FILTRO_CONTEO` pero con dos vías:

- **Vía 1:** la fila cumple todos los filtros, incluido el diagnóstico principal → cuenta.
- **Vía 2:** la fila cumple todo **menos** el diagnóstico, y su diagnóstico principal está en
  `cruce.codigosCandidatos` → queda como *candidato* y solo cuenta si el archivo de Egresos
  lo confirma (ver [`cruce`](#cruce)).

Diferencias con `FILTRO_CONTEO` (están en `services/extractor/extraccion_extractor_Services.py`,
`contar_filtro_conteo_acumulado`):
- La unidad sale de los **primeros 6 caracteres** de la columna `agrupacion`
  (`undadAdscripcion`) buscados en `CLAVE_UNIDADES_F` de `unidades/ftp.json` (las 46 UMF). No
  usa `catalogoUnidades`.
- El diagnóstico se reconoce porque su entrada de `filtroColumna` tiene
  `"nombreColumna": "diagnosticoPrincipal"` (ese texto está fijo en el código).
- No usa `filtroGrupoColumnas` ni `filtroAlternativas`.

### FILTRO_UNIDAD_VALOR

Solo el denominador de IAAS 01. Recorre las filas, se queda con la primera cuya columna de
`columnaUnidad` es la unidad buscada y que cumple `filtroColumna`, y toma el valor de la
columna de `tomarValor`.

```json
"denominador": {
    "fuente": "xlsxWeb", "nombreArchivo": "Días paciente (PARTE 2)",
    "modoExtraccion": "FILTRO_UNIDAD_VALOR", "encabezado": 1,
    "columnaUnidad": { "B": { "filtro": "UNIDADES_IAAS", "nombreColumna": "Denominacion Unidad" } },
    "filtroColumna": { "F": { "filtro": "Total Unidad", "nombreColumna": "Division" } },
    "tomarValor":    { "Z": "Dias Paciente" }
}
```

`"UNIDADES_IAAS"` es un **marcador**: no se compara contra ese texto, sino contra cada
hospital de `ORDEN_IAAS01`, uno por uno. La unidad se reconoce por su **número** (el segundo
pedazo del nombre: `"HGZMF 21 LEON SUR"` → `21`) como palabra completa, porque el Excel a
veces escribe distinto la ciudad.

---

## 5. Filtros: `filtroColumna`, `filtroGrupoColumnas`, `filtroAlternativas`

### `filtroColumna`

Diccionario `{letra: condición}`. La fila debe cumplir **todas**.

Cada condición tiene `filtro`, `tipo` (opcional) y `nombreColumna` (opcional pero
recomendado). **`nombreColumna` no sirve para buscar la columna**: la columna es siempre la
letra. Sirve para **confirmar** que en esa letra está el encabezado esperado; si no, el
archivo se rechaza y el mensaje dice dónde quedó esa columna ("parece que se recorrieron las
columnas"). En Extractor e IAAS también sirve para elegir la hoja (sección 9).

| `tipo` | La celda cumple si... | Ejemplo |
|---|---|---|
| `LISTA` | es exactamente uno de los valores. Si la celda trae texto se compara como texto: la celda `"02"` **no** coincide con el filtro `2`; por eso Neonatal 06 pone `[2, "02"]` | `{"tipo": "LISTA", "filtro": [1, 2], "nombreColumna": "tipoIngreso"}` |
| `RANGO` | es un número entre `[mín, máx]`, ambos incluidos | `{"tipo": "RANGO", "filtro": [20, 74], "nombreColumna": "edadAnios"}` |
| `PREFIJO` | **empieza** con alguno de los textos (sin importar mayúsculas) | `"filtro": ["O11", "O14"]` acepta `O110`, `O149` |
| `SUFIJO` | **termina** con alguno de los textos | `"filtro": ["ND"]` acepta `1F1992ND` |
| *(sin tipo)* | **formato simple**, el de IAAS: igual al texto, sin importar mayúsculas ni espacios a los lados. Si el texto empieza con `^`, la celda debe **empezar con esa palabra completa** | `{"filtro": "CONFIRMADA"}`; `{"filtro": "^CIRUGIA"}` acepta "CIRUGIA GENERAL" pero no "CIRUGIAS" |

Detalle útil: si al convertir el archivo un número quedó como texto (`"36"`), las columnas
que usa un `RANGO` se convierten a número antes de filtrar
(`numeros_escritos_como_texto`, en `shared/validarArchivo_service.py`). Si la columna no trae
ningún número, el archivo se rechaza.

### `filtroGrupoColumnas`

Una misma condición revisada en **varias columnas a la vez** (ej. un código CIE en el
diagnóstico principal o en cualquiera de los secundarios). Es una lista; la fila debe
cumplir **todos** los grupos.

| `coincidencia` | La fila pasa si... |
|---|---|
| `CUALQUIERA` | al menos una de las columnas cumple |
| `NINGUNA` | ninguna de las columnas cumple (sirve para excluir) |

```json
"filtroGrupoColumnas": [
    { "coincidencia": "CUALQUIERA", "tipo": "PREFIJO", "filtro": ["O11", "O14", "O15"],
      "columnas": { "L": "diagnosticoPrincipal", "AB": "diagnosticoSecundario1", "AC": "diagnosticoSecundario2" } },
    { "coincidencia": "NINGUNA", "tipo": "PREFIJO", "filtro": ["O00", "O01", "...", "O08"],
      "columnas": { "L": "diagnosticoPrincipal", "AB": "diagnosticoSecundario1", "AC": "diagnosticoSecundario2" } }
]
```
*(MT 03 numerador: preeclampsia/eclampsia en cualquier diagnóstico, sin abortos. `columnas`
es `{letra: encabezado esperado}`, igual que `nombreColumna`)*

### `filtroAlternativas`

Para el **"o"**. Es una lista de `filtroColumna` completos; la fila debe cumplir **al menos
uno**. Se suma a lo anterior (además de cumplir `filtroColumna` y los grupos).

```json
"filtroAlternativas": [
    { "K": { "tipo": "LISTA", "filtro": [1],       "nombreColumna": "ATENCION" },
      "M": { "tipo": "LISTA", "filtro": [1, 2, 3], "nombreColumna": "TP_PARTO" },
      "R": { "tipo": "LISTA", "filtro": [9, 11, ...], "nombreColumna": "cve_metodo_anticonceptivo" } },
    { "K": { "tipo": "LISTA", "filtro": [2],       "nombreColumna": "ATENCION" },
      "R": { "tipo": "LISTA", "filtro": [9, 11, ..., 45], "nombreColumna": "cve_metodo_anticonceptivo" } }
]
```
*(MT 04 numerador: "parto con método anticonceptivo" **o** "aborto con método anticonceptivo")*

---

## 6. Campos propios del Extractor e IAAS

| Campo | Módulo | Qué es | Default |
|---|---|---|---|
| `archivo` | Extractor | Clave del archivo de `catalogos/archivos_extractor.json` que alimenta ese lado. Si numerador y denominador tienen **distinto** archivo (Neonatal 06), se suben por separado | `"SUI_13"` |
| `encabezado` | Extractor, IAAS | Fila (desde 1) de los títulos de columna | `1` |
| `agrupacion` | Extractor | **Nombre** (no letra) de la columna que dice de qué unidad es cada fila: `undadAdscripcion` (SUI-13 en EH/DM), `unidad` (SUI-13 en MT 03), `cvePresupuestal` (Egresos), `IMUNI_ATEN` (Defunciones) | obligatorio |
| `catalogoUnidades` | Extractor (`FILTRO_CONTEO`) | Con qué catálogo se traduce la clave a nombre de unidad. Hoy solo existe `"hospitales"` (`shared/UNIDADES.CATALOGOS_UNIDADES`). La clave debe coincidir **completa**; filas de unidades fuera del catálogo no cuentan. Todas las unidades del catálogo salen, en 0 si no tuvieron casos | obligatorio en `FILTRO_CONTEO` del Extractor (sin él da error) |
| `columnasPeriodo` | Extractor | **Nombres** de las columnas del propio archivo con su mes y año. Se compara el valor **que más se repite** contra el mes que declaró el usuario; si no coincide, se rechaza. Si el archivo no trae esas columnas, no se valida | `{"mes": "mes", "anio": "anio"}` (SUI-13); Egresos/Defunciones usan `mesm`/`aniom` |
| `columnaLlaveCruce` | Extractor (con `cruce`) | Nombre de la columna del SUI-13 que identifica al paciente | `"numeroAfiliacion"` |
| `ceroEsSinDato` | Extractor (en el **denominador**) | `true` = denominador 0 significa "no hubo a quién medir" → la unidad sale **Gris**, no "0 = Esperado" | `false` |
| `nombreArchivo` | IAAS | Etiqueta del archivo para la ficha técnica | — |

### `cruce`

Solo en el numerador de EH 03 y DM 04 (`FILTRO_CONTEO_ACUMULADO`). Es la **vía 2**:

```json
"cruce": {
    "activa": true,
    "codigosCandidatos": ["I160", "I161", "I169", "N180", "N188", "N189", "N18X", "N19X"],
    "archivoCruce": "EGRESOS_PACIENTES_DIARIA",
    "encabezado": 1,
    "columnaLlave": "AFILIACION",
    "columnasDiagnostico": { "AC": "DiagPrincipalEgreso", "AD": "PrimerDiagSecundarioEgreso", "...": "...", "AH": "QuintoDiagSecundario" },
    "codigosValidos": ["I10X", "I110", "I119", "I120", "I129", "I130", "I131", "I132", "I139"]
}
```
*(EH 03)*

| Campo | Qué es |
|---|---|
| `activa` | Si la vía 2 aplica. Con `false` se ignora todo el bloque |
| `codigosCandidatos` | Diagnóstico principal (exacto) que vuelve a la fila *candidata* |
| `archivoCruce` | Clave del segundo archivo (mismo mes). Puede subirse junto con el SUI-13 o después (`/completar-cruce`) |
| `encabezado` | Fila de títulos del archivo de cruce |
| `columnaLlave` | **Nombre** de la columna del archivo de cruce con la que se reconoce al mismo paciente (se compara contra `columnaLlaveCruce` del SUI-13) |
| `columnasDiagnostico` | `{letra: encabezado}` donde se buscan los códigos válidos |
| `codigosValidos` | Si **alguna** fila de ese paciente en el archivo de cruce trae uno de estos códigos (exacto) en alguna de esas columnas, el candidato cuenta |

---

## 7. `operacion`: las fórmulas

Tres fórmulas en texto que evalúa `services/calculo_indicador_Services.py`:

| Fórmula | Con qué nombres trabaja |
|---|---|
| `numerador` | FTP: los **códigos** de `archivo` como listas (`CP02[0]`, `sum(CP02[0:3])`, `IN33_MF[0]`). Extractor/IAAS: se escribe solo `"numerador"` (el conteo ya viene listo) |
| `denominador` | Igual. Con población: el nombre del grupo de `sexo` (`sum(Todos)`) |
| `resultado` | Siempre `numerador` y `denominador` (ya calculados) |

Solo se puede usar: `sum`, `round`, `abs`, `math` (ej. `math.floor`) y operaciones
aritméticas. `[0]` es el primer valor de `columna_dato`, `[1]` el segundo, y `[0:3]` los tres
primeros.

Ejemplos reales:

```json
"numerador":   "sum(CP02[0:3]) + sum(CP03[0:2])",
"denominador": "math.floor(PB02[0] * (1 - 0.029) + 0.5) + math.floor(PB02[1] * (1 - 0.025) + 0.5) + ...",
"resultado":   "round((numerador / denominador) * 100, 2)"
```
*(DM 01: el denominador quita a la población un porcentaje distinto por grupo de edad)*

| `resultado` | Tipo | Indicadores |
|---|---|---|
| `round((numerador / denominador) * 100, 2)` | porcentaje | la mayoría |
| `round((numerador / denominador) * 1000, 2)` | tasa x 1,000 | IAAS 01, 03-06; Neonatal 06 |
| `round((numerador / denominador) * 100000, 2)` | tasa x 100,000 | EH 03, DM 04 |
| `round((numerador / denominador), 2)` | **promedio** | CE 01, CE 02, CUPN 05, CUPN 07 |

Reglas que aplica el código (no se escriben en el mapeo):
- En FTP y población, el **numerador y el denominador se redondean a entero** con un umbral
  propio: sube solo si el decimal es **0.60 o más** (`redondeo_personalizado`). El resultado
  no se redondea así: usa el `round(..., 2)` de la fórmula.
- Falta numerador o denominador → **Gris**, sin resultado.
- Denominador 0 con numerador mayor a 0 → **Gris** (no se puede dividir).
- Numerador 0 y denominador 0 → resultado **0**, se colorea normal (salvo `ceroEsSinDato`).
- `TOTAL_OOAD` = suma de numeradores ÷ suma de denominadores de las unidades con dato
  completo, con la **misma** fórmula `resultado` (nunca un promedio de porcentajes).

---

## 8. `semaforo`

Cuatro colores: **Esperado** (verde), **Medio** (amarillo), **Bajo** (rojo) y **Gris** (sin
dato). Lo evalúa `shared/semaforo_service.py`.

### Cómo se escribe un umbral

Texto con operador: `">= 2.3"`, `"<= 17.38"`, `"> 12"`. También se aceptan rangos:

| Forma | Significa | Ejemplo |
|---|---|---|
| `"X a Y"` | las dos condiciones (**Y**) | `">= 4 a <= 7"` → entre 4 y 7 |
| `"X o Y"` | cualquiera de las dos (**O**) | `"< 1 o > 7"` → menor a 1 o mayor a 7 |

Orden en que se decide (`_evaluar_explicito`): si cumple `Esperado` → Esperado; si no, si
cumple `Bajo` (o `Alto`) → Bajo; si no → **Medio**. Por eso el texto de `Medio` **no se usa
para decidir el color**: solo se muestra en leyendas. Un Medio que no se cruce con Esperado ni
Bajo es suficiente, aunque su texto tenga "o" (MT 03: `"> 3.9 a < 5.0 o > 8.0 a < 10.0"` es
solo leyenda).

Sigue existiendo el **formato viejo** (números sin operador: `{"Bajo": 1.7, "Esperado": 2.3}`
= más es mejor; con `"Alto"` = menos es mejor), pero los mapeos actuales ya usan texto.

### Las tres formas de semáforo

**Fijo** (el mismo todo el año):
```json
"semaforo": { "Bajo": "<= 12", "Medio": "> 12 a < 16", "Esperado": ">= 16" }
```
*(CE 01)*

**Sin Medio** (solo verde o rojo): `"Medio": null`.
```json
"semaforo": { "Esperado": "<= 17.38", "Medio": null, "Bajo": "> 17.38" }
```
*(EH 03, DM 04)*

**Por mes** (la meta crece con el acumulado): una llave por mes, `"Enero"`..`"Diciembre"`.
```json
"semaforo": {
    "Enero":   { "Bajo": "<= 1.7", "Medio": "> 1.7 a < 2.3", "Esperado": ">= 2.3" },
    "Febrero": { "Bajo": "<= 3.4", "Medio": "> 3.4 a < 4.5", "Esperado": ">= 4.5" },
    ...
}
```
*(CACU 01; también CAMA 01/40-49/50-69, CUPN 01, DM 01, EH 01, S_Ob 01. En los "de corte"
sin generar, solo los meses de corte: CACU 04 trae Marzo/Junio/Septiembre/Diciembre)*

**Por grupo** (por tipo de hospital): una llave por grupo + `"OOAD"` para el total.
```json
"semaforo": {
    "HGS":  { "Esperado": ">= 4 a <= 7",  "Medio": ">= 1 a < 4", "Bajo": "< 1 o > 7" },
    "HGZ":  { "Esperado": ">= 7 a <= 12", "Medio": ">= 4 a < 7", "Bajo": "< 4 o > 12" },
    "HGR":  { ... }, "HGO": { ... }, "HGP": { ... },
    "OOAD": { "Esperado": ">= 7 a <= 12", "Medio": ">= 4 a < 7", "Bajo": "< 4 o > 12" }
}
```
*(Solo IAAS 01. El grupo de cada hospital sale de `unidades/iaas.json`; una unidad que no
está en ningún grupo, como `TOTAL_OOAD`, usa `"OOAD"`. Hoy el catálogo de grupos solo existe
para IAAS 01: otro indicador con semáforo por grupo necesitaría generalizar
`grupo_de_unidad_iaas01`)*

---

## 9. Por qué FTP lleva `hoja` y Extractor/IAAS no

- **FTP**: los reportes SIAIS los genera el sistema del IMSS y siempre traen las mismas
  pestañas con el mismo nombre. Por eso cada código lleva `"hoja"` y se lee por **letras
  fijas**, sin revisar encabezados (`extraer_lados_del_excel` en
  `services/ftp/extraccion_indicador_ftp_Services.py`). Si la hoja no existe → error
  `HOJA_NO_ENCONTRADA`.
- **Extractor e IAAS**: los archivos los convierte el usuario a Excel con distintas versiones
  de programas, y cada una nombra la pestaña diferente (`Hoja1`, `Sheet1`,
  `reporte_defunciones`...). Por eso **no llevan `hoja`**: `LectorExcel.hoja_con_columnas`
  (en `shared/validarArchivo_service.py`) revisa cada pestaña y se queda con la **primera
  que trae, en cada letra, el encabezado que dice el mapeo** (`nombreColumna`, `columnas` de
  los grupos, `tomarValor`) y, además, las columnas que se usan por nombre (`agrupacion`,
  `columnaLlaveCruce`). Si ninguna cuadra, el error explica la pestaña que más se pareció.

Consecuencia práctica: **en Extractor e IAAS pon siempre `nombreColumna`** en cada filtro.
Sin ningún encabezado esperado, el sistema no sabe qué hoja leer y rechaza el archivo.

---

## 10. Cómo agregar un indicador nuevo

### Pasos comunes

1. Elige la carpeta del módulo (`ftp/`, `iaas/`, `extractor/`). Si la familia ya tiene JSON
   en esa carpeta, agrega el bloque ahí; si no, crea `{FAMILIA}.json`.
2. Si la familia es nueva, agrégala a `catalogos/familias.json` (`nombre`, `imagen`, `color`).
3. Copia el sobre de un indicador parecido y llena **todos** los campos de la
   [sección 2](#2-el-sobre-de-cada-indicador). El nombre del indicador debe ser
   `"FAMILIA NN"` (la primera palabra es la familia; se guarda en BD_CIAE como
   `FAMILIA_NN.json`).
4. Si el indicador ya existía en `sin_generar/`, **muévelo** (bórralo de ahí): un mismo
   nombre en dos carpetas no da error: gana la última carpeta que se lee (el orden es
   `ftp`, `iaas`, `extractor`, `sin_generar`), así que el de `sin_generar/` taparía al nuevo.
5. Verifica con `python -c "import main"` y genera un mes de prueba. Compara contra el
   cálculo manual o el reporte oficial.

> Los cambios a los JSON de indicadores se leen solos (el backend revisa la fecha de
> modificación). **Excepción:** algunas lecturas se guardan en memoria al primer uso
> (`cargar_indicador_iaas`, la lista de indicadores del Extractor y si son "de corte") y los
> catálogos de `unidades/` se leen al arrancar. Si cambias IAAS, el Extractor o unidades,
> **reinicia el servidor**.

### FTP

1. Busca el reporte en el FTP y en `WEB_CIAE/encabezados_reportes/` para ver hojas y letras.
2. Si el código del reporte no está en `REPORTES_POR_SUBCARPETA`
   (`services/ftp/navegacion_ftp_Services.py`), agrégalo en su subcarpeta.
3. Escribe `reporte.numerador`/`denominador` con `fuente: "ftp"`, `hoja` y el modo que
   corresponda (casi siempre `INTERSECCION_COLUMNA` con `buscar: "TOTAL DE LA UNIDAD"`).
4. Escribe `operacion` usando los códigos como nombres.
5. `previos: true` si el reporte también existe en la carpeta semanal.
6. Si alguna unidad no tiene el servicio, agrégala en `unidadesSinServicio`.

### IAAS

IAAS hoy tiene **fijos en el código** sus 6 indicadores (`INDICADORES_IAAS` en
`services/iaas/generacion_iaas_Services.py` y en `services/iaas/excel_iaas_Services.py`) y
la regla del denominador (IAAS 01 = Excel global, los demás = captura). Agregar un IAAS 07
requiere **cambiar código**, no solo el mapeo. En el mapeo: `xlsxWeb` + `FILTRO_CONTEO` con
`encabezado` y `filtroColumna` (cada uno con `nombreColumna`), `capturaWeb` en el
denominador, y el bloque `excel`.

### Extractor

1. Si el archivo es nuevo, agrégalo a `catalogos/archivos_extractor.json` con una clave en
   MAYÚSCULAS.
2. Numerador (y denominador si sale de un archivo): `fuente: "extractor"`, `archivo`,
   `modoExtraccion: "FILTRO_CONTEO"`, `encabezado`, `agrupacion`,
   `catalogoUnidades: "hospitales"`, `columnasPeriodo` si el archivo no usa `mes`/`anio`, y
   los filtros con `nombreColumna`.
3. Elige la `periodicidad`. El Extractor solo acepta (`generacion_extractor_Services.py`):
   - de corte: `Semestral Anualizado` (con denominador de población, como EH 03).
   - mensuales: `Mensual`, `Mensual - Mensual Acumulado`, `Mensual Anualizado`.
   Otra periodicidad da un error claro al subir el archivo.
4. Un indicador **mensual** necesita el denominador con `fuente: "extractor"` (del mismo
   archivo o de otro). Un indicador **de corte** usa `poblacionInfoSalud`.
5. Si el denominador puede ser 0 porque no hubo a quién medir, pon `"ceroEsSinDato": true`.
6. Reinicia el servidor.

### Indicador que todavía no se automatiza

Va en `sin_generar/` con `"mostrarGenerar": false`, `"reporte": {}` y todo lo demás
(`periodicidad`, `informacion`, `semaforo`) igual que los otros. Así aparece en gráficas y su
ficha técnica dice "no automatizado".
