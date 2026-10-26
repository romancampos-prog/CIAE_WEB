// react
import { Outlet } from 'react-router-dom';

/** Pantallas sin sesión (login): sin TopBar ni Footer, la página ocupa todo. */
export default function AuthLayout() {
  return <Outlet />;
}
