"""
Establece y cierra la conexión al servidor FTP del IMSS.
Usado en: ftp_indicadores/services/ftp_extraer.py, ftp_extraer_cache.py
"""
from ftplib import FTP
from configs.settings import FTP_SERVER, FTP_USER, FTP_PASS


def conectar_ftp():
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
