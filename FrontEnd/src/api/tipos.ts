/** Sobre que regresan los endpoints de indicadores (`ApiResponse` del backend). */
export interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}
