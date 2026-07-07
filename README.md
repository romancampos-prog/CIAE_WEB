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
| Modulo Epidemiologia | [Seccion 7](#seccion-7--modulo-epidemiologia-dengue) |

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
               ├── /auth, /ftp, /in-ass...  → API (FastAPI)
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

Los resultados se guardan en `Data/EPIDEMEOLOGIA/resultados/` como archivos JSON.
Al reiniciar el servidor, los datos del ultimo pipeline se recuperan automaticamente sin necesidad de volver a ejecutarlo.

> Estos archivos estan en `.gitignore` — no se suben al repositorio.

### Archivos de datos (nunca en git)

| Carpeta | Contenido |
|---|---|
| `Data/EPIDEMEOLOGIA/bases/` | Excel cargados por el usuario |
| `Data/EPIDEMEOLOGIA/resultados/` | JSON del ultimo pipeline ejecutado |
| `Data/EPIDEMEOLOGIA/fecha_ultimo_repo/` | Fecha del ultimo reporte generado |

### Roles con acceso al pipeline

Solo usuarios con rol `admin` pueden ejecutar el pipeline y ver el estado.
Los roles se configuran en `BackEnd/.env` (ver tabla de archivos no versionados arriba).
