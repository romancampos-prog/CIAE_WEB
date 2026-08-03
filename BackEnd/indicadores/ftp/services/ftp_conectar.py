"""
Establece y cierra la conexión al servidor FTP del IMSS.
Usado en: ftp/services/ftp_extraer.py
"""
from ftplib import FTP
from configs.settings import FTP_SERVER, FTP_USER, FTP_PASS


def conectar_ftp():
    # NOTA: se intentó migrar a FTP_TLS (conexión cifrada) pero el servidor
    # del IMSS rechazó la conexión — no soporta FTPS por ahora. Pendiente
    # de confirmar con el equipo que administra ese servidor si algún día
    # lo habilitan, para volver a intentar este cambio.
    try:
        ftp = FTP()
        ftp.connect(FTP_SERVER, 21, timeout=120)
        ftp.login(FTP_USER, FTP_PASS)
        ftp.set_pasv(True)
        print(f"Conexión establecida con {FTP_SERVER}")
        return ftp
    except Exception as e:
        print(f"Error al conectar al FTP: {e}")
        return None


def desconectar_ftp(ftp):
    if ftp:
        try:
            ftp.quit()
            print("Sesión FTP cerrada correctamente.")
        except Exception:
            ftp.close()
            print("Conexión forzada a cerrar.")
