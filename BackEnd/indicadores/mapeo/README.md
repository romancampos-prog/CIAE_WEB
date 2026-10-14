# Estructura de los JSON de mapeo

## Carpetas

```
mapeo/
├── ftp/          {FAMILIA}.json   indicadores que se generan desde el FTP
├── iaas/         IAAS.json        indicadores IAAS (Excel subido + captura)
├── extractor/    {FAMILIA}.json   indicadores del Extractor (Excel crudo mensual)
├── sin_generar/  {FAMILIA}.json   indicadores que todavía no se automatizan
├── catalogos/
│   ├── familias.json            nombre, ícono y color de cada familia
│   └── archivos_extractor.json  nombre y nombre sugerido de cada archivo que sube el Extractor
├── unidades/     ftp.json, iaas.json, hospitales.json (cada uno con su "nombreAgrupacion")
└── POBLACION.json               columnas del Excel de población
```

- **La carpeta es el módulo.** Un indicador ya no lleva `"modulo"`: el backend se lo pone
  según la carpeta donde vive (`ftp`, `iaas`, `extractor`; `""` en `sin_generar`).
- **Una familia puede estar en varias carpetas** (ej. `ftp/EH.json` con EH 01-02 y
  `extractor/EH.json` con EH 03).
- **`imagen` y `color` son de la familia**, no de cada indicador: viven una sola vez en
  `catalogos/familias.json` y el backend se los pone a cada indicador al leerlo.
- Todo se lee por `services/indicadorMapeo_Services.py` (`bloque_mapeo`): es el único lugar
  que sabe en qué carpeta y archivo vive cada indicador. Si se edita un JSON, se vuelve a
  leer solo (no hace falta reiniciar).

## Sobre de cada indicador y por estandar maneja estos campos todos los INDICADORES

```json
"CAMA 01": {
    "fechaModificacion": "19/08/2026",
    "mostrarGenerar": true,
    "mostrarGrafica": true,
    "periodicidad": "Mensual Acumulado",
    "informacion": {
        "titulo": "...",
        "objetivo": "...",
        "descNum": "...",
        "descDen": "..."
    },
    "reporte": { ... },
    "semaforo": { ... }
}
```

- **`mostrarGenerar`**: `true` si peude generarse en su  respectivo modulo de GENERACION.
- **`reporte`**: vacío (`{}`) aqui se definen reglas de extraccion depende el reporte por indicador
- Campos vacíos (`""`) son etiquetas pendientes de llenar a mano — el código nunca los
  inventa, se dejan así a propósito para que una persona los complete después.

## `reporte`: numerador / denominador / operacion

```json
"reporte": {
    "numerador": { "fuente": "...", ... },
    "denominador": { "fuente": "...", ... },
    "operacion": {
        "numerador": "<fórmula>",
        "denominador": "<fórmula>",
        "resultado": "round((numerador / denominador) * 100, 2)"
    }
}
```

`numerador` y `denominador` casi siempre se definen por separado **aunque saquen datos
del mismo archivo** — cada bloque solo lleva las columnas que su propia fórmula
necesita (ver ejemplo de `CE 01` más abajo). `operacion` son las fórmulas que combinan
esos datos crudos para llegar al resultado final.

## Valores de `fuente`

| fuente | qué significa | quién la usa |
|---|---|---|
| `ftp` | El archivo se busca y descarga solo del FTP, por prefijo de nombre (ej. `CP02...`) | mayoría de indicadores ftp |
| `poblacionInfoSalud` | Se lee de `POBLACION.json`, por grupo de sexo y rango de edad | denominadores basados en población |
| `xlsxWeb` | Un Excel que la persona sube manualmente por la web (no se busca solo) | numerador/denominador de IAAS |
| `capturaWeb` | El número se captura a mano en un formulario, no viene de ningún archivo | denominador de IAAS 02-06 |
| `extractor` | Excel crudo (fila por paciente/evento) que la persona sube CADA MES; el numerador de cada mes se acumula en el JSON del indicador, y el corte final (con denominador y semáforo) se dispara solo cuando se junta la ventana completa de meses que pide la periodicidad | EH 03, DM 04, MT 03-05, Neonatal 03 (`extractor/`) |

## Valores de `modoExtraccion` (fuentes `ftp` / `xlsxWeb`)

| modo | qué hace | campos que usa |
|---|---|---|
| `INTERSECCION_COLUMNA` | Busca una fila por texto en una columna, toma valores de otras columnas de esa fila | `hoja`, `columna`, `buscar`, `columna_dato` |
| `INTERSECCION_FILA` | Toma valores de columnas en números de fila fijos (sin buscar texto) | `hoja`, `columna_dato`, `fila` |
| `ULTIMA_FILA` | Toma el último valor numérico no vacío de una columna, a partir de una fila de encabezado | `hoja`, `columna_dato`, `encabezado` (número) |
| `FILTRO_CONTEO` | Filtra filas por condiciones columna=valor, cuenta cuántas cumplen | `hoja`, `encabezado` (número), `filtroColumna` |
| `FILTRO_UNIDAD_VALOR` | Igual que `FILTRO_CONTEO`, pero además ubica la fila de una unidad médica específica y toma el valor de una columna (no cuenta) | `hoja`, `encabezado`, `columnaUnidad`, `filtroColumna`, `tomarValor` |
| `FILTRO_CONTEO_ACUMULADO` | Igual que `FILTRO_CONTEO`, pero agrupa el conteo por unidad médica (`agrupacion`) y lo guarda como el numerador de UN mes dentro del acumulado del indicador, en vez de calcular el resultado de una sola vez | `hoja`, `encabezado`, `agrupacion`, `filtroColumna`, `cruce` (opcional) |

En `filtroColumna`, un valor que empieza con `^` (ej. `"^CIRUGIA"`) significa "la celda
empieza con este texto", no coincidencia exacta. Además de esa forma simple (match exacto
o `^prefijo`), `filtroColumna` acepta un objeto con `"tipo"` explícito, usado por
`FILTRO_CONTEO_ACUMULADO`:

- `{"tipo": "LISTA", "filtro": [...], "nombreColumna": "..."}` — la celda debe ser
  exactamente uno de los valores de la lista.
- `{"tipo": "RANGO", "filtro": [min, max], "nombreColumna": "..."}` — la celda debe ser
  un número entre min y max, inclusive.

`cruce` (solo en `FILTRO_CONTEO_ACUMULADO`) define una segunda vía de conteo: filas que no
cumplen los códigos directos de `filtroColumna`, pero SON candidatas a validarse cruzando
contra un segundo archivo del mismo mes (mismo paciente por `columnaLlave`, buscando en
`columnasDiagnostico` alguno de los `codigosValidos`).
- `activa`: si esta segunda vía aplica para este indicador.
- `codigosCandidatos`: valores de la columna de diagnóstico que activan el cruce.
- `archivoCruce`: nombre base del segundo archivo (mismo mes, subido junto con el principal).
- `columnaLlave` / `columnasDiagnostico`: dónde buscar en el archivo de cruce.
- `codigosValidos`: si alguna de esas columnas trae uno de estos códigos, el candidato cuenta.

## Marcadores especiales

Algunos indicadores necesitan resolver una columna o fila de forma dinámica en vez de
fija. Se usa un texto marcador dentro de `columna_dato` (o similar), y el valor real se
define en una llave hermana de `reporte`, al mismo nivel que `fechaModificacion`:

- **`MESES_CIP01`** (`CUPN 01`): el marcador `"MESES_CIP01"` dentro de `columna_dato`
  se reemplaza por la columna del mes del reporte, según el mapa `MESES_CIP01` del
  indicador (`{"1": "D", "2": "F", ...}`).
- **`COLUMNAS_POR_MES`** (`CUPN 01`): igual que `MESES_CIP01`, pero con nombre propio por
  marcador (`{"POBLACION_CIP01": {"1": "C", ..., "7": "R"}}`).
- **`UNIDADES_IAAS`** (`IAAS 01`, dentro de `columnaUnidad`): indica que esa columna no
  se compara contra un valor fijo, sino contra el número de cada unidad médica de la
  lista fija de IAAS 01, una por una.

## Indicadores sin extracción automática

Los indicadores que no generan reporte solo viven en `sin_generar/`, con
`mostrarGenerar: false` y `reporte: {}`. Conservan `periodicidad`, `informacion` y
`semaforo` igual que los demás. Al automatizar uno, se mueve su bloque a la carpeta del módulo.
