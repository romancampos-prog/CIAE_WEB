# CIAE — Comandos y arranque del proyecto

## Versiones requeridas

| Herramienta | Versión mínima | Cómo verificar |
|---|---|---|
| **Python** | 3.11 | `python --version` |
| **Node.js** | 20 | `node --version` |
| **npm** | 10 | `npm --version` |
| **PM2** *(solo servidor)* | 5 | `pm2 --version` |

Versiones exactas usadas en el proyecto:
- React 19.2 · Vite 7.3 · React Router 7.13
- FastAPI 0.138 · Pydantic 2.13 · Uvicorn 0.49

---

## Primera vez — configuración inicial

### Backend

```bash
cd BackEnd

# 1. Crear entorno virtual
python -m venv venv

# 2. Activar entorno virtual
#    Windows:
venv\Scripts\activate
#    Linux / Mac:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Crear archivo de variables de entorno
#    El archivo .env ya existe en el repo (ignorado por git).
#    Si empiezas desde cero en un servidor nuevo, créalo manualmente:
#    Windows:  copy NUL .env
#    Linux:    touch .env
#    Luego llena los valores reales (ver abajo)
```

Variables de entorno necesarias en `BackEnd/.env`:
```
SECRET_KEY=clave_secreta_para_jwt
FTP_SERVER=ip_del_servidor_ftp
FTP_USER=usuario_ftp
FTP_PASS=contraseña_ftp
```

### Frontend

```bash
cd FrontEnd

# Instalar dependencias
npm install
```

---

## Desarrollo local (uso diario)

### Levantar el backend

```bash
cd BackEnd

# Activar entorno virtual
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux / Mac

# Iniciar servidor (puerto 8005, recarga automática)
uvicorn main:app --reload --port 8005
```

> API disponible en `http://localhost:8005`
> Documentación automática en `http://localhost:8005/docs`

### Levantar el frontend

```bash
cd FrontEnd

# Iniciar servidor de desarrollo (puerto 5173)
npm run dev
```

> App disponible en `http://localhost:5173`

---

## Mantenimiento de dependencias

### Backend — agregar librería

```bash
# Con el entorno virtual activado:
pip install nombre-libreria
pip freeze > requirements.txt
```

### Frontend — agregar paquete

```bash
cd FrontEnd
npm install nombre-paquete
```

---

## Producción — servidor (PM2)

PM2 mantiene los procesos corriendo en segundo plano y los reinicia automáticamente si se caen.

### Instalar PM2 (una sola vez)

```bash
npm install -g pm2
```

### Preparar el frontend (build)

El backend sirve el frontend como archivos estáticos desde `FrontEnd/dist/`.
Cada vez que haya cambios en el frontend hay que regenerar el build:

```bash
cd FrontEnd
npm run build
```

Esto genera `FrontEnd/dist/` que el backend sirve automáticamente.

### Iniciar con PM2

El servidor usa **HTTPS** en producción. Los certificados están en `FrontEnd/certs/` (key.pem y cert.pem). `main.py` los carga automáticamente cuando se ejecuta con `python main.py`.

```bash
# Windows — desde la raíz del proyecto
pm2 start "venv\Scripts\python main.py" --name ciae-backend --cwd BackEnd

# Linux / Mac — desde la raíz del proyecto
pm2 start "venv/bin/python main.py" --name ciae-backend --cwd BackEnd --interpreter none
```

> Para desarrollo local sin HTTPS usar `uvicorn main:app --reload --port 8005` (ver sección anterior).

### Comandos PM2 de uso frecuente

```bash
pm2 list                    # ver todos los procesos activos
pm2 status                  # estado resumido
pm2 logs ciae-backend       # ver logs en tiempo real
pm2 logs ciae-backend --lines 100   # últimas 100 líneas de log

pm2 restart ciae-backend    # reiniciar (después de cambios en el código)
pm2 stop ciae-backend       # detener
pm2 delete ciae-backend     # eliminar del registro de PM2
```

### Arranque automático al reiniciar el servidor

```bash
# Guardar la lista de procesos actuales
pm2 save

# Generar el script de inicio del sistema
pm2 startup
# Ejecutar el comando que PM2 te indique después de ese último comando
```

### Actualizar el código en producción

```bash
# 1. Bajar cambios
git pull

# 2. Si cambiaron dependencias del backend
cd BackEnd
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# 3. Si cambiaron archivos del frontend
cd ../FrontEnd
npm install
npm run build

# 4. Reiniciar el backend
pm2 restart ciae-backend
```

---

## Ecosystem file (alternativa a comandos manuales de PM2)

Crear `ecosystem.config.cjs` en la raíz del proyecto para gestionar PM2 desde un archivo:

```js
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name:        'ciae-backend',
      cwd:         './BackEnd',
      script:      'venv/Scripts/python',    // Linux/Mac: venv/bin/python
      args:        'main.py',               // arranca con HTTPS (certs en FrontEnd/certs/)
      interpreter: 'none',
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
  ],
}
```

```bash
# Iniciar con el archivo
pm2 start ecosystem.config.cjs

# Reiniciar con el archivo
pm2 restart ecosystem.config.cjs
```

---

## Estructura de puertos

| Servicio | Puerto | Descripción |
|---|---|---|
| Backend (dev y prod) | 8005 | FastAPI / Uvicorn |
| Frontend dev | 5173 | Vite dev server |
| Frontend preview (HTTPS) | 4173 | `npm run preview` con certificado |

> En producción solo corre el puerto **8005** — el backend sirve el build del frontend como archivos estáticos.

---

## Verificación rápida

```bash
# ¿El backend responde?
curl http://localhost:8005/docs

# ¿PM2 tiene el proceso?
pm2 list

# ¿El build del frontend existe?
ls FrontEnd/dist           # Linux / Mac
dir FrontEnd\dist          # Windows
```
