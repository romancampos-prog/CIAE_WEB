// En desarrollo el API se pide al mismo host con el que se abrió la página (localhost o la IP de la red):
// la cookie del token es SameSite=Strict, y si la página está en 11.1.11.59 y el API en localhost
// son "sitios distintos", el navegador no guarda ni manda la cookie y todo responde 401.
export const urlGlobal = import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:8005`
    : (import.meta.env.VITE_API_URL ?? "http://localhost:8005");
