"""
Conexion al servidor FTP del IMSS (exclusivo de FTP).
Usado en: services/ftp/extraccion_indicador_ftp_Services.py
"""
from ftplib import FTP

from configs.settings import FTP_SERVER, FTP_USER, FTP_PASS


def conectar_ftp() -> FTP | None:
    # NOTA: se intento migrar a FTP_TLS (conexion cifrada) pero el servidor
    # del IMSS rechazo la conexion -- no soporta FTPS por ahora. Pendiente
    # de confirmar con el equipo que administra ese servidor si algun dia
    # lo habilitan, para volver a intentar este cambio.
    try:
        ftp = FTP()
        ftp.connect(FTP_SERVER, 21, timeout=120)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.set_pasv(True)
        print(f"Conexión establecida con {FTP_SERVER}")
        return ftp
    except Exception as error:
        print(f"Error al conectar al FTP: {error}")
        return None


def desconectar_ftp(ftp: FTP | None) -> None:
    if not ftp:
        return
    try:
        ftp.quit()
        print("Sesión FTP cerrada correctamente.")
    except Exception:
        ftp.close()
        print("Conexión forzada a cerrar.")
