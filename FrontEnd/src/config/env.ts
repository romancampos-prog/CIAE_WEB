// propios
import { z } from 'zod';

const esquemaEnv = z.object({
  DEV: z.boolean(),
  // `VITE_API_URL=` vacía en el .env llega como "": se toma como no definida.
  VITE_API_URL: z.preprocess(valor => (valor === '' ? undefined : valor), z.url().optional()),
});

// Si VITE_API_URL viene mal escrita, la app truena al arrancar con un mensaje claro
// en vez de fallar después en cada petición.
const env = esquemaEnv.parse(import.meta.env);

// En desarrollo el API se pide al mismo host con el que se abrió la página (localhost o la IP de la red):
// la cookie del token es SameSite=Strict, y si la página está en 11.1.11.59 y el API en localhost
// son "sitios distintos", el navegador no guarda ni manda la cookie y todo responde 401.
export const URL_API = env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:8005`
  // Sin VITE_API_URL: el mismo origen de la página (en producción uvicorn sirve el front y el API juntos).
  : (env.VITE_API_URL ?? window.location.origin);
