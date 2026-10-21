# CIAE — Sistema de Indicadores IMSS Guanajuato
Este sistema fue creado por un par de ingenieros expertos en el analisis de datos y visualizacion en alta calidad.
---

## REFERENCIA RAPIDA

| Quiero... | Ir a |
|---|---|
| Subir el proyecto a Git por primera vez | [Seccion -1](#seccion--1--subir-a-git-primera-vez) |
| Clonar el repositorio en una PC nueva | [Seccion 0](#seccion-0--clonar-el-repositorio) |
| Instalar todo por primera vez | [Seccion 1](#seccion-1--instalar-dependencias) |
| Configurar HTTPS | [Seccion 2](#seccion-2--configurar-https) |
| Levantar el sistema | [Seccion 3](#seccion-3--levantar-el-sistema) |
| Actualizar el sistema | [Seccion 4](#seccion-4--actualizar-el-sistema) |
| Comandos rapidos de PM2 | [Seccion 5](#seccion-5--comandos-pm2) |
| Correr en modo desarrollo | [Seccion 6](#seccion-6--modo-desarrollo) |
| Arreglar el venv tras mover/renombrar la carpeta | [Seccion 6.1](#seccion-61--arreglar-el-venv-tras-mover-o-renombrar-la-carpeta) |
| Modulo Epidemiologia | [Seccion 7](#seccion-7--modulo-epidemiologia-dengue) |
| Entender la estructura de carpetas | [Estructura del proyecto](#estructura-del-proyecto) |
| Arquitectura del backend | [Seccion 9](#seccion-9--arquitectura-del-backend) |
| Procesos de indicadores (FTP, IAAS, Extractor) | [BackEnd/indicadores/README.md](BackEnd/indicadores/README.md) |
| Configurar o agregar un indicador (mapeo) | [BackEnd/indicadores/mapeo/README.md](BackEnd/indicadores/mapeo/README.md) |

---

## ESTRUCTURA DEL PROYECTO

> Lee esto primero si es tu primera vez trabajando en el proyecto.

El proyecto vive en dos carpetas **hermanas** (una junto a la otra, no una dentro de la otra):

```
WEB_CIAE_SERVER_TODO/
│
├── WEB_CIAE_SERVER/        ← el repositorio git (lo que clonas)
│   ├── BackEnd/            API en FastAPI
│   ├── FrontEnd/           React
│   └── .git/
│
└── BD_CIAE/                ← datos, NUNCA esta en git
    ├── EPIDEMIOLOGIA/
    └── INDICADORES/
```

`BD_CIAE` **queda fuera del repositorio a proposito**: antes vivia como `Data/` dentro de `WEB_CIAE_SERVER` (ignorada por `.gitignore`), pero al estar dentro del repo corria el riesgo de que un `git clean`, `checkout` u otra operacion la borrara. Al sacarla como carpeta hermana, git nunca la toca.

`BackEnd/configs/settings.py` calcula la ruta automaticamente — no hace falta configurar nada:

```python
BASE_DIR = Path(__file__).resolve().parent.parent   # BackEnd/
DATA_DIR = BASE_DIR.parent.parent / "BD_CIAE"        # sube dos niveles y entra a BD_CIAE
```

> Importante: al clonar el repositorio en una PC nueva, tambien hay que crear/copiar la carpeta `BD_CIAE` como hermana de `WEB_CIAE_SERVER` (mismo nivel). Pedirla al responsable del proyecto junto con los `.env`.

---

## ARCHIVOS QUE NO ESTAN EN GIT

> Estos archivos tienen contrasenas y configuracion sensible.
> Pedirselos al responsable del proyecto antes de continuar.

| Archivo | Donde colocarlo | Para que sirve |
|---|---|---|
| `.env` del backend | `BackEnd\.env` | Credenciales FTP, SECRET_KEY, usuarios |
| `.env` del frontend | `FrontEnd\.env` | Debe estar vacio (`VITE_API_URL=`) |
| `.env.development.local` | `FrontEnd\.env.development.local` | Solo para desarrollo (`VITE_API_URL=http://localhost:8005`) |

---

## COMO FUNCIONA EL SISTEMA

El backend (uvicorn/FastAPI) sirve **tanto el API como el frontend** desde un solo proceso en el puerto 8005.
No hay un proceso separado para el frontend en produccion.

```
Navegador → https://OCC00486WSIAIS5:8005
               ├── /auth, /Indicadores/..., /epidemiologia/...  → API (FastAPI)
               └── cualquier otra ruta      → dist/index.html (React)
```

---

## SECCION -1 — SUBIR A GIT PRIMERA VEZ

> Solo se hace **una sola vez**, desde la PC donde vive el proyecto original.
> Requiere tener creado el repositorio vacio en GitHub/GitLab/etc. antes de empezar.

**Paso 1** — Crear el repositorio vacio en la plataforma git

Entrar a GitHub (o GitLab) y crear un repositorio nuevo **vacio** (sin README, sin .gitignore).
Copiar la URL que te da, ejemplo: `https://github.com/usuario/ciae.git`

---

**Paso 2** — Inicializar git en el proyecto

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git init
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git branch -M main
```

> `git init` se corre **dentro de `WEB_CIAE_SERVER`** — git solo rastrea esa carpeta.
> `BD_CIAE` es una carpeta hermana, un nivel arriba: git nunca la ve, nunca la sube y nunca la puede borrar (ver [Estructura del proyecto](#estructura-del-proyecto)).

---

**Paso 3** — Verificar que no va nada sensible

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git status
```

Revisar que **no aparezcan** estos archivos en la lista:

- `BackEnd/.env`
- `FrontEnd/.env`
- `FrontEnd/.env.development.local`
- `FrontEnd/certs/`
- `BackEnd/venv/`
- `FrontEnd/node_modules/`
- `FrontEnd/dist/`

Si alguno aparece, detener y revisar el `.gitignore` antes de continuar.

---

**Paso 4** — Agregar todos los archivos y hacer el primer commit

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git add .
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git commit -m "primer commit"
```

---

**Paso 5** — Conectar con el repositorio remoto y subir

Reemplazar la URL por la del repositorio creado en el Paso 1:

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git remote add origin https://github.com/usuario/ciae.git
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git push -u origin main
```

Pedira usuario y contrasena (o token) de GitHub la primera vez.

---

**Paso 6** — Verificar que subio correctamente

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git log --oneline
```

Debe mostrar el commit. Entrar al repositorio en GitHub y confirmar que los archivos estan ahi.

> A partir de aqui, para subir cambios futuros usar solo:
> `git add .` → `git commit -m "descripcion"` → `git push`

---

## SECCION 0 — CLONAR EL REPOSITORIO

> Solo se hace **una vez** en la PC nueva.
> Requisito previo: tener instalado **Git**.

**Paso 1** — Clonar el repositorio

```
PS C:\ROMAN_PTDAM_2026> git clone <URL-del-repositorio> WEB_CIAE
PS C:\ROMAN_PTDAM_2026> cd WEB_CIAE
```

**Paso 2** — Pedir los archivos secretos al responsable del proyecto

Estos archivos **no estan en git** (contienen contrasenas). Pedirlos y colocarlos exactamente en estas rutas:

| Archivo que te daran | Donde colocarlo |
|---|---|
| `.env` del backend | `BackEnd\.env` |
| `.env` del frontend | `FrontEnd\.env` |

> El `.env.development.local` solo se necesita si vas a correr en modo desarrollo.
> Para produccion (PM2) no hace falta.

**Paso 3** — Continuar con la Seccion 1 (instalar dependencias)

---

## SECCION 1 — INSTALAR DEPENDENCIAS

> Solo se hace **una vez** por PC.
> Requisitos previos: tener instalados **Node.js**, **Python** y **Git**.

**Paso 1** — Instalar PM2

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> npm install -g pm2
```

**Paso 2** — Preparar el backend (Python)

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> cd BackEnd
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\BackEnd> python -m venv venv
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\BackEnd> venv\Scripts\activate
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\BackEnd> pip install -r requirements.txt
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\BackEnd> deactivate
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\BackEnd> cd ..
```

**Paso 3** — Preparar el frontend (Node)

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> cd FrontEnd
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\FrontEnd> npm install
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\FrontEnd> cd ..
```

---

## SECCION 2 — CONFIGURAR HTTPS

> Solo se hace **una vez** en la PC que va a servir el sistema.
> Usa OpenSSL que ya viene incluido con Git — no se necesita descargar nada extra.
>
> **NOTA:** El navegador mostrara advertencia de seguridad la primera vez.
> Dar click en **Avanzado → Continuar**. Solo se hace una vez por navegador.

---

**Paso 1** — Conocer el hostname de esta PC

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> hostname
```

Anota el resultado. Se usara en los siguientes pasos.
Ejemplo: `OCC00486WSIAIS5`

---

**Paso 2** — Crear la carpeta para los certificados

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> mkdir FrontEnd\certs
```

---

**Paso 3** — Generar el certificado autofirmado

Cambia `OCC00486WSIAIS5` por el hostname del Paso 1 (aparece dos veces al final):

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> & "C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -newkey rsa:2048 -keyout FrontEnd\certs\key.pem -out FrontEnd\certs\cert.pem -days 365 -nodes -subj "/CN=OCC00486WSIAIS5" -addext "subjectAltName=DNS:OCC00486WSIAIS5"
```

Se generan dos archivos en `FrontEnd\certs\`:

| Archivo | Para que sirve |
|---|---|
| `cert.pem` | Certificado publico |
| `key.pem` | Llave privada |

---

**Paso 4** — Abrir los puertos en el firewall de Windows

> Requiere PowerShell como **Administrador**.

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> netsh advfirewall firewall add rule name="CIAE API" dir=in action=allow protocol=TCP localport=8005
```

Debe responder `Aceptar`.

---

**Paso 5** — Actualizar el hostname en el codigo del backend

Abre `BackEnd\configs\cors.py` y cambia `OCC00486WSIAIS5` por el hostname de esta PC:

```python
ORIGINS_PRODUCCION = [
    "https://TU-HOSTNAME:8005",
    "https://TU-HOSTNAME",
    "https://localhost:8005",
    "https://localhost",
]
```

---

**Paso 6** — Compilar el frontend

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> cd FrontEnd
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\FrontEnd> npm run build
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\FrontEnd> cd ..
PS C:\ROMAN_PTDAM_2026\WEB_CIAE>
```

---

## SECCION 3 — LEVANTAR EL SISTEMA

**Paso 1** — Levantar el proceso

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> pm2 start ecosystem.config.cjs
```

**Paso 2** — Verificar que este corriendo

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> pm2 status
```

Debe aparecer **un solo proceso** en estado **online**:

**Paso 3** — Configurar arranque automatico al encender la PC

> Solo se hace **una vez**. Con esto, si se apaga la PC, el sistema sube solo al volver a encender.

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> npm install -g pm2-windows-startup
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> node "%APPDATA%\npm\node_modules\pm2-windows-startup\index.js" install
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> pm2 save
```

Debe responder `Successfully added PM2 startup registry entry.` y luego `Successfully saved`.

| Proceso | Que hace |
|---|---|
| `ciae-back` | Sirve el API y el frontend con HTTPS |

**URL de acceso:**

| Desde donde | URL |
|---|---|
| Esta misma PC | `https://localhost:8005` |
| Otra PC de la red | `https://TU-HOSTNAME:8005` |

> El hostname de la PC servidor actual es `OCC00486WSIAIS5` (IP `11.1.11.55`).
> URL de acceso desde la red: `https://OCC00486WSIAIS5:8005`
> En otra PC nueva el hostname sera diferente — correr `hostname` para saber cual es.

> Primera vez que se entra: el navegador muestra advertencia de seguridad.
> Dar click en **Avanzado → Continuar**. Solo se hace una vez por navegador.

---

## SECCION 4 — ACTUALIZAR EL SISTEMA

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> pm2 stop all
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> git pull

# Si hubo cambios en el frontend — recompilar:
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> cd FrontEnd
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\FrontEnd> npm run build
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\FrontEnd> cd ..

PS C:\ROMAN_PTDAM_2026\WEB_CIAE> pm2 restart all
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> pm2 status
```

> Si solo cambiaste archivos del backend, no es necesario recompilar el frontend.

---

## SECCION 5 — COMANDOS PM2

| Comando | Para que sirve |
|---|---|
| `pm2 status` | Ver estado del proceso |
| `pm2 logs` | Ver logs en vivo (Ctrl+C para salir) |
| `pm2 logs ciae-back` | Logs del backend |
| `pm2 stop all` | Apagar |
| `pm2 restart all` | Reiniciar |
| `pm2 delete all` | Eliminar procesos (empezar de cero) |
| `pm2 kill` | Apagar el daemon de PM2 completamente |

---

## SECCION 6 — MODO DESARROLLO

> Sin PM2, sin HTTPS, con recarga automatica al guardar cambios.
> Vite detecta automaticamente que estas en desarrollo y usa `http://localhost:8005` para el API.
> No tienes que cambiar ningun archivo — solo corre los dos comandos en terminales separadas.

**Terminal 1 — Backend**

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> cd BackEnd
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\BackEnd> venv\Scripts\activate
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\BackEnd> uvicorn main:app --reload --port 8005
```

**Terminal 2 — Frontend**

```
PS C:\ROMAN_PTDAM_2026\WEB_CIAE> cd FrontEnd
PS C:\ROMAN_PTDAM_2026\WEB_CIAE\FrontEnd> npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:8005` |

> El backend en desarrollo corre sin SSL (sin certificado).
> Solo el modo produccion (PM2) usa HTTPS.

---

## SECCION 6.1 — ARREGLAR EL VENV TRAS MOVER O RENOMBRAR LA CARPETA

> Sintoma: al correr `uvicorn main:app --reload --port 8005` aparece:
> `Fatal error in launcher: Unable to create process using '"...\venv\Scripts\python.exe" ...': El sistema no puede encontrar el archivo especificado.`

**Causa:** el venv guarda la ruta absoluta de la carpeta donde se creo dentro de los ejecutables de `venv\Scripts\` (`uvicorn.exe`, `pip.exe`, etc). Si despues se mueve o renombra la carpeta del proyecto (por ejemplo `WEB_CIAE_SERVER` → `WEB_CIAE_SERVER_TODO\WEB_CIAE_SERVER`), esos `.exe` siguen apuntando a la ruta vieja, que ya no existe. `venv\Scripts\python.exe` en si sigue funcionando (por eso `activate` no falla), pero los lanzadores no.

No tiene arreglo editable — hay que recrear el venv en la ruta actual:

```
PS D:\WEB_CIAE_SERVER_TODO\WEB_CIAE_SERVER> cd BackEnd
PS D:\WEB_CIAE_SERVER_TODO\WEB_CIAE_SERVER\BackEnd> deactivate
PS D:\WEB_CIAE_SERVER_TODO\WEB_CIAE_SERVER\BackEnd> Remove-Item -Recurse -Force venv
PS D:\WEB_CIAE_SERVER_TODO\WEB_CIAE_SERVER\BackEnd> python -m venv venv
PS D:\WEB_CIAE_SERVER_TODO\WEB_CIAE_SERVER\BackEnd> venv\Scripts\activate
PS D:\WEB_CIAE_SERVER_TODO\WEB_CIAE_SERVER\BackEnd> pip install -r requirements.txt
```

> Si tienes varias versiones de Python instaladas, usa la misma que se uso originalmente (revisa `venv\pyvenv.cfg` **antes** de borrarlo, campo `version`) con el lanzador `py`, ejemplo: `py -3.14 -m venv venv`.

---

## SECCION 7 — MODULO EPIDEMIOLOGIA (DENGUE)

### Que hace

Procesa dos bases de datos Excel (SINAVE operativa + SisCep laboratorio) y genera:

| Reporte | Ruta frontend |
|---|---|
| Canal endemico semanal | `/CIAE/Epidemiologia/canal` |
| Mapa de situacion / confirmados | `/CIAE/Epidemiologia/mapa/situacion` |
| Alertas SisCep | `/CIAE/Epidemiologia/alertas` |
| Duplicados detectados | `/CIAE/Epidemiologia/duplicados` |

### Como se ejecuta el pipeline

1. Ir a `/CIAE/Epidemiologia`
2. Subir la **Base Operativa (SINAVE)** `.xlsx`
3. Subir la **Base SisCep** `.xlsx`
4. Hacer clic en **Ejecutar pipeline completo**

El proceso corre en segundo plano. Los iconos del menu lateral se deshabilitan mientras corre. Al terminar, todos los reportes se actualizan automaticamente.

### Persistencia de resultados

Los resultados se guardan en `BD_CIAE/EPIDEMIOLOGIA/resultados/` como archivos JSON.
Al reiniciar el servidor, los datos del ultimo pipeline se recuperan automaticamente sin necesidad de volver a ejecutarlo.

> Estos archivos viven en `BD_CIAE`, fuera del repositorio — no se suben a git (ver [Estructura del proyecto](#estructura-del-proyecto)).

### Archivos de datos (nunca en git)

| Carpeta | Contenido |
|---|---|
| `BD_CIAE/EPIDEMIOLOGIA/bases/` | Excel cargados por el usuario |
| `BD_CIAE/EPIDEMIOLOGIA/resultados/` | JSON del ultimo pipeline ejecutado |
| `BD_CIAE/EPIDEMIOLOGIA/fecha_ultimo_repo/` | Fecha del ultimo reporte generado |

### Roles con acceso al pipeline

Solo usuarios con rol `admin` pueden ejecutar el pipeline y ver el estado.
Los roles se configuran en `BackEnd/.env` (ver tabla de archivos no versionados arriba).

---

## SECCION 8 — ARQUITECTURA DEL FRONTEND

### Mapa de carpetas

```
FrontEnd/src/
│
├── assets/               imagenes, iconos, logos
├── auth/                 login, contexto de sesion, guards de ruta
├── shared/               componentes globales (Footer, NavCard)
├── paginas/              paginas que no pertenecen a ningun modulo (Inicio, Restriciones)
├── routes/               Routes.jsx — el unico router que conoce todos los modulos
│
├── indicadores/          MODULO: Indicadores Medicos
│   ├── routes/           IndicadoresRoutes.jsx
│   ├── ftp/              sub-modulo FTP
│   │   ├── api/          llamadas axios al backend
│   │   ├── componentes/  piezas visuales (graficas, modales)
│   │   ├── hooks/        logica reutilizable con estado
│   │   ├── paginas/      vistas completas registradas como rutas
│   │   ├── routes/       FTPRoutes.jsx
│   │   └── utils/        funciones puras sin estado
│   ├── iaas/             sub-modulo IAAS  (misma estructura que ftp/)
│   ├── reportes_grafica/ sub-modulo Reportes/Graficas  (misma estructura)
│   └── shared/           compartido solo entre sub-modulos de indicadores
│
└── epidemiologia/        MODULO: Epidemiologia
    ├── routes/           EpiRoutes.jsx
    ├── paginas/          EpiLandingPage, EpidemiologiaApp
    └── dengue/           todo lo especifico de dengue (api, componentes, paginas, hooks)
```

---

### Arbol de rutas completo

```
/CIAE/LOGIN
/CIAE/Inicio
/CIAE/IndicadoresMedicos/              → FTPPage          (hub de acceso)
/CIAE/IndicadoresMedicos/Graficas      → GraficasUnificadasPage
/CIAE/IndicadoresMedicos/Generar       → GenerarHub
/CIAE/IndicadoresMedicos/FTP/          → FTPLanding
/CIAE/IndicadoresMedicos/FTP/Generar   → IndicadoresPage
/CIAE/IndicadoresMedicos/IASS/         → IASSLanding
/CIAE/IndicadoresMedicos/IASS/Reporte  → IASSPage
/CIAE/IndicadoresMedicos/Grafica/Config          → ConfigPage
/CIAE/IndicadoresMedicos/Grafica/GraficaReporte  → pageGraficas
/CIAE/IndicadoresMedicos/Grafica/Restricciones   → Restriciones
/CIAE/Epidemiologia/                   → EpiLandingPage
/CIAE/Epidemiologia/dengue/            → CargaPage
/CIAE/Epidemiologia/dengue/canal       → CanalPage
/CIAE/Epidemiologia/dengue/mapa/:tipo  → MapaPage
/CIAE/Epidemiologia/dengue/alertas     → AlertasSiscepPage
/CIAE/Epidemiologia/dengue/duplicados  → DuplicadosPage
```

El router raiz solo delega — no conoce las rutas hijas:

```jsx
// routes/Routes.jsx
<Route path="CIAE/IndicadoresMedicos/*" element={<IndicadoresRoutes />} />
<Route path="CIAE/Epidemiologia/*"      element={<EpiRoutes />} />
```

Cada modulo resuelve sus propias rutas internas:

```jsx
// indicadores/routes/IndicadoresRoutes.jsx
<Routes>
  <Route index           element={<FTPPage />} />
  <Route path="Graficas" element={<GraficasUnificadasPage />} />
  <Route path="FTP/*"    element={<FTPRoutes />} />   {/* delega a FTPRoutes */}
  <Route path="IASS/*"   element={<IASSRoutes />} />  {/* delega a IASSRoutes */}
  <Route path="Grafica/*" element={<GraficaRoutes />} />
</Routes>
```

---

### Como crear una nueva pagina

Ejemplo: agregar una pagina `ResumenPage` al sub-modulo FTP.

**1. Crear el archivo de la pagina**

```jsx
// indicadores/ftp/paginas/ResumenPage.jsx

// react
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
// propios
import logo from '../../../assets/logo_imms.png'
import './ftp.css'

export default function ResumenPage() {
  const navigate = useNavigate()

  useEffect(() => { document.title = 'Resumen | CIAE' }, [])

  return (
    <div className="ftp-root">
      <header className="ftp-nav">
        <img src={logo} alt="IMSS" className="ftp-logo" />
        <button className="ftp-btn-back" onClick={() => navigate('/CIAE/IndicadoresMedicos/FTP')}>
          Volver
        </button>
      </header>

      <main>
        {/* contenido */}
      </main>
    </div>
  )
}
```

**2. Registrar la ruta en FTPRoutes**

```jsx
// indicadores/ftp/routes/FTPRoutes.jsx

// react
import { Routes, Route } from 'react-router-dom'
// propios
import FTPMenu     from '../paginas/FTPLanding'
import FTPGenerar  from '../paginas/IndicadoresPage'
import ResumenPage from '../paginas/ResumenPage'   // nueva pagina

export default function FTPRoutes() {
  return (
    <Routes>
      <Route index          element={<FTPMenu />} />
      <Route path="Generar" element={<FTPGenerar />} />
      <Route path="Resumen" element={<ResumenPage />} />  {/* nueva ruta */}
    </Routes>
  )
}
```

**3. Navegar hacia ella desde cualquier componente**

```jsx
navigate('/CIAE/IndicadoresMedicos/FTP/Resumen')
```

---

### Reglas de codigo — Frontend

#### Imports: siempre con separador de seccion

```jsx
// react
import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
// propios
import TarjetaIndicador from '../componentes/TarjetaIndicador'
import { CAT_COLOR }    from '../constantes/colores'
import logo             from '../../../assets/logo_imms.png'
import './mi-pagina.css'
```

> Sin aliases (`@/`, `@assets/`, etc.). Siempre rutas relativas desde el archivo actual.

#### Navegacion: siempre rutas absolutas

```jsx
// CORRECTO — ruta absoluta
navigate('/CIAE/IndicadoresMedicos/FTP')
navigate('/CIAE/IndicadoresMedicos/FTP/Generar')
navigate('/CIAE/Inicio')

// INCORRECTO — nunca esto
navigate(-1)
navigate('Generar')
navigate('./FTP')
```

#### Paginas vs Componentes

| Tipo | Carpeta | Caracteristica |
|---|---|---|
| Pagina | `paginas/` | Es una ruta del router. Tiene su propio header, layout completo |
| Componente | `componentes/` | Se importa dentro de una pagina. No aparece en ningun routes/ |

Si algo solo lo usa una pagina y no aparece en routes, va en `componentes/`, no en `paginas/`.

#### Sistema de colores por categoria

El ícono y el color de cada familia vienen del backend (`imagen` y `color`, definidos una sola vez en `BackEnd/indicadores/mapeo/catalogos/familias.json`). El front no tiene tablas por familia: el ícono se traduce con `indicadores/shared/utils/iconos.js` (`urlIcono`) y el color se aplica via CSS custom property `--ic`:

```jsx
// En la pagina o componente — pasar el color como CSS variable
<div className="mi-card" style={{ '--ic': familia.color }}>
  <span>{indicador}</span>
</div>
```

```css
/* En el CSS — consumir --ic con color-mix para tintes suaves */
.mi-card {
  border-left: 3px solid var(--ic);
  background:  color-mix(in srgb, var(--ic) 10%, transparent);
}

.mi-card:hover {
  background: color-mix(in srgb, var(--ic) 18%, transparent);
}
```

#### Comentarios: solo el "por que", nunca el "que"

```jsx
// MAL — el nombre ya dice lo que hace
/** Componente que muestra las tarjetas de cada indicador */
const TarjetasIndicador = () => { ... }

// MAL — comentario de tarea/contexto que rota con el tiempo
// Agregado para el flujo de generacion FINAL (issue #47)
const [modoFinal, setModoFinal] = useState(false)

// BIEN — explica una restriccion no obvia
// El backend espera el mes como string "01".."12", no como numero
const mesStr = String(mes).padStart(2, '0')
```

---

## SECCION 9 — ARQUITECTURA DEL BACKEND

> Esta sección es un resumen. El detalle del módulo de indicadores está en:
> - [BackEnd/indicadores/README.md](BackEnd/indicadores/README.md): mapa de archivos, endpoints, procesos de FTP, IAAS y Extractor, cómo se guarda en BD_CIAE, gráficas, Excel y excepciones.
> - [BackEnd/indicadores/mapeo/README.md](BackEnd/indicadores/mapeo/README.md): los JSON de configuración de cada indicador, campo por campo, y cómo agregar uno nuevo.
> - [BackEnd/epidemiologia/README.md](BackEnd/epidemiologia/README.md): módulo de epidemiología.

### Mapa de carpetas

```
BackEnd/
├── configs/              configuracion global (cors.py, settings.py, response.py = ApiResponse)
├── auth/                 autenticacion JWT (controllers/, services/ con solo_roles)
├── middleware/           captura de errores de los endpoints
├── indicadores/          MODULO: Indicadores Medicos
│   ├── Routes/           indicadores_Route.py: junta los controllers bajo /Indicadores
│   ├── Controller/       ftp, iaas, extractor, reportes, informacion, excel (*_Controller.py)
│   ├── services/         logica compartida (calculo, guardado en BD_CIAE, Excel, mapeo, poblacion)
│   │   ├── ftp/          logica exclusiva de FTP
│   │   ├── iaas/         logica exclusiva de IAAS
│   │   └── extractor/    logica exclusiva del Extractor
│   ├── shared/           meses, unidades, semaforo, periodicidad, validar archivos, auditoria
│   ├── schemas/          DTO/ (peticiones) y model/ (modelos internos)
│   └── mapeo/            JSON de configuracion de cada indicador
├── epidemiologia/        MODULO: Epidemiologia (expone ROUTERS)
├── main.py               punto de entrada: registra los routers y sirve el frontend
└── requirements.txt
```

`main.py` agrega `indicadores/` al `sys.path`; por eso dentro de indicadores los imports son
planos (`from services...`, `from shared...`, `from schemas...`).

### Como fluye una peticion (ejemplo FTP)

```
Navegador  →  GET /Indicadores/ftp/generar?indicador=CAMA 01&ano=2026&mes=06
                      │
                      ▼
   Controller/ftp_Controller.py                  recibe, valida rol y parametros
                      │
                      ▼
   services/ftp/generacion_indicador_ftp_Services.py   orquesta los pasos
     ├─ indicadorMapeo_Services          lee el mapeo del indicador
     ├─ ftp/extraccion_indicador_ftp_    baja los reportes del FTP y extrae
     ├─ calculo_indicador_Services       aplica las formulas del mapeo
     ├─ shared/semaforo_service          pone el color
     └─ bd_Ciae_Guardado_Services        guarda en BD_CIAE
                      │
                      ▼
   ApiResponse(success, message, data)   (el Excel se pide aparte a /Indicadores/excel)
```

### Responsabilidad por capa

| Capa | Regla |
|---|---|
| `Controller` | Solo HTTP: recibir parametros, validar rol con `solo_roles`, llamar al servicio y responder `ApiResponse`. Sin logica de negocio. |
| `services` | Solo logica: extraer, calcular, leer/escribir archivos, FTP. Lo de un solo modulo va en `services/<modulo>/`; lo compartido en la raiz de `services/`. |
| `mapeo` | Las reglas de cada indicador (archivos, columnas, filtros, formulas, semaforo). No se escriben en el codigo. |

Pasos para crear un endpoint nuevo: ver [BackEnd/indicadores/README.md, seccion 12](BackEnd/indicadores/README.md#12-cómo-escribir-un-endpoint-nuevo).

### Estructura del historico JSON

Cada indicador se guarda en `BD_CIAE/INDICADORES/{año}/{FAMILIA}/{FAMILIA}_{NN}.json`
(ej. `BD_CIAE/INDICADORES/2026/CAMA/CAMA_01.json`):

```json
{
  "INDICADOR": "CAMA 01",
  "ANIO": "2026",
  "MESES": {
    "Enero": {
      "Poblacion": null,
      "Reporte": {
        "UMF 46 GUANAJUATO": { "numerador": 12, "denominador": 900, "%": 1.33, "desempeno": "Esperado" },
        "TOTAL_OOAD":        { "numerador": 480, "denominador": 41000, "%": 1.17, "desempeno": "Medio" }
      }
    }
  }
}
```

Para leer o escribir estos archivos usar siempre `services/bd_Ciae_Guardado_Services.py` (y
`bd_Ciae_Indicadores_Services.py` para las consultas). El semanal de FTP, los cortes del
Extractor (`CORTES`) y las carpetas `EXTRACTOR_CRUCE` / `EXTRACTOR_PARTES` estan explicados en
[BackEnd/indicadores/README.md, seccion 5](BackEnd/indicadores/README.md#5-cómo-se-guarda-en-bd_ciae).

---

### Variables de entorno

Todas las credenciales viven en `BackEnd/.env` (no esta en git). Se leen via `configs/settings.py`:

```python
# configs/settings.py
from dotenv import load_dotenv
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent.parent / "BD_CIAE"   # carpeta hermana de WEB_CIAE_SERVER, no viene del .env

FTP_SERVER = os.getenv("FTP_SERVER")     # servidor FTP
FTP_USER   = os.getenv("FTP_USER")
FTP_PASS   = os.getenv("FTP_PASS")
```

> `DATA_DIR` **no** se configura en el `.env` — se calcula solo a partir de la ubicacion del proyecto (ver [Estructura del proyecto](#estructura-del-proyecto)).

```env
# BackEnd/.env  (pedirlo al responsable del proyecto)
FTP_SERVER=192.168.x.x
FTP_USER=usuario
FTP_PASS=contrasena
SECRET_KEY=clave-jwt
```
