# CIAE — Frontend

React 19 + Vite + TypeScript estricto, con TanStack Query y React Router 7.

La arquitectura (carpetas, rutas, cómo agregar una página y reglas de código) está en el
README raíz: [`../README.md`, sección 8](../README.md#seccion-8--arquitectura-del-frontend).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 5173 (el API se pide al mismo host, puerto 8005) |
| `npm run typecheck` | Revisión de tipos (`tsc -b`) |
| `npm run lint` | ESLint con reglas de TypeScript y React Hooks |
| `npm run build` | Compila a `dist/`, que es lo que sirve el backend en producción |
| `npm run preview` | Sirve el build con HTTPS (certificados en `certs/`) |
