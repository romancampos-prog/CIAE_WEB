// react
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
// propios
import { mensajeDeError } from '@/api/mensajeDeError';
import { useAuth } from '@/features/auth/context/AuthContext';
import { authService } from '@/features/auth/services/authService';
import type { CredencialesLogin, Rol } from '@/features/auth/tipos';

// A dónde entra cada rol; el que no está aquí (admin) entra a Inicio.
const DESTINO_POR_ROL: Partial<Record<Rol, string>> = {
  trabajador_IAAS: '/CIAE/IndicadoresMedicos/IAAS',
  trabajador_ftp:  '/CIAE/IndicadoresMedicos/FTP',
  visitante:       '/CIAE/IndicadoresMedicos',
};

/** Estado del formulario de login y el envío de credenciales. */
export function useLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credenciales, setCredenciales] = useState<CredencialesLogin>({ usuario: '', contrasena: '' });
  const [verContrasena, setVerContrasena] = useState(false);

  const envio = useMutation({
    mutationFn: authService.iniciarSesion,
    onSuccess: ({ usuario, rol }) => {
      login({ user: usuario, rol });
      // La pausa deja ver el botón terminar antes de cambiar de pantalla.
      setTimeout(() => navigate(DESTINO_POR_ROL[rol] ?? '/CIAE/Inicio'), 600);
    },
  });

  const cambiarCampo = (e: ChangeEvent<HTMLInputElement>) =>
    setCredenciales(previas => ({ ...previas, [e.target.name]: e.target.value }));

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    envio.mutate(credenciales);
  };

  return {
    credenciales,
    cambiarCampo,
    enviar,
    verContrasena,
    alternarVerContrasena: () => setVerContrasena(v => !v),
    entrando: envio.isPending,
    error: envio.isError ? mensajeDeError(envio.error) : '',
  };
}
