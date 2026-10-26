// propios
import axios from 'axios';

/** El `detail` (o `message`) que mandó el backend; si no lo hay, el texto de respaldo. */
export function mensajeDeError(error: unknown, respaldo = 'Error de conexión con el servidor'): string {
  if (axios.isAxiosError(error)) {
    const datos = error.response?.data as { detail?: unknown; message?: unknown } | undefined;
    if (typeof datos?.detail === 'string' && datos.detail) return datos.detail;
    if (typeof datos?.message === 'string' && datos.message) return datos.message;
    return respaldo;
  }
  if (error instanceof Error && error.message) return error.message;
  return respaldo;
}
