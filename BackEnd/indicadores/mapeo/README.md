# Estructura de los JSON de mapeo

Esta carpeta reemplaza a `indicadores/ftp/mapeo/` y `indicadores/iaas/mapeo/`. Cada
archivo agrupa una familia de indicadores (`CAMA.json`, `CACU.json`, `IAAS.json`, etc.)
y todos siguen el mismo sobre (envelope), sin importar de dónde saquen sus datos.

El código que lee esta nueva estructura todavía no existe — esto es solo la forma de
los datos, pendiente de que se conecte al backend.

## Sobre de cada indicador y por estandar maneja estos campos todos los INDICADORES

```json
"CAMA 01": {
    "fechaModificacion": "19/08/2026",
    "modulo": "ftp",
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

- **`modulo`**: en qué módulo del sistema aparece este indicador (`"ftp"`, `"IAAS"`).
  Vacío (`""`) en los indicadores que no generan reporte automático "AUN - ESTAN EN ´PROCESO" — ver más abajo.

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

## Valores de `modoExtraccion` (fuentes `ftp` / `xlsxWeb`)

| modo | qué hace | campos que usa |
|---|---|---|
| `INTERSECCION_COLUMNA` | Busca una fila por texto en una columna, toma valores de otras columnas de esa fila | `hoja`, `columna`, `buscar`, `columna_dato` |
| `INTERSECCION_FILA` | Toma valores de columnas en números de fila fijos (sin buscar texto) | `hoja`, `columna_dato`, `fila` |
| `ULTIMA_FILA` | Toma el último valor numérico no vacío de una columna, a partir de una fila de encabezado | `hoja`, `columna_dato`, `encabezado` (número) |
| `FILTRO_CONTEO` | Filtra filas por condiciones columna=valor, cuenta cuántas cumplen | `hoja`, `encabezado` (número), `filtroColumna` |
| `FILTRO_UNIDAD_VALOR` | Igual que `FILTRO_CONTEO`, pero además ubica la fila de una unidad médica específica y toma el valor de una columna (no cuenta) | `hoja`, `encabezado`, `columnaUnidad`, `filtroColumna`, `tomarValor` |

En `filtroColumna`, un valor que empieza con `^` (ej. `"^CIRUGIA"`) significa "la celda
empieza con este texto", no coincidencia exacta.

## Marcadores especiales

Algunos indicadores necesitan resolver una columna o fila de forma dinámica en vez de
fija. Se usa un texto marcador dentro de `columna_dato` (o similar), y el valor real se
define en una llave hermana de `reporte`, al mismo nivel que `fechaModificacion`:

- **`MESES_CIP01`** (`CUPN 01`): el marcador `"MESES_CIP01"` dentro de `columna_dato`
  se reemplaza por la columna del mes del reporte, según el mapa `MESES_CIP01` del
  indicador (`{"1": "D", "2": "F", ...}`).
- **`UNIDADES_IAAS`** (`IAAS 01`, dentro de `columnaUnidad`): indica que esa columna no
  se compara contra un valor fijo, sino contra el número de cada unidad médica de la
  lista fija de IAAS 01, una por una.

## Indicadores sin extracción automática

Los indicadores que no generan reporte solo (antes `generaFTP: false` / sin
`Denominador` en IAAS) llevan `modulo: ""`, `mostrarGenerar: false` y `reporte: {}`.
Conservan `periodicidad`, `informacion` y `semaforo` igual que los demás.

## Archivos de esta carpeta

- `CAMA.json`, `CACU.json`, `CE.json`, `CUPN.json`, `DM.json`, `EH.json`, `MT.json`,
  `S_Ob.json` — familias ftp.
- `IAAS.json` — familia IAAS (`xlsxWeb` / `capturaWeb`).