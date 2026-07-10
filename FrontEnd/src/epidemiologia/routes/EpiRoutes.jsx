import RoleRoute    from '@auth/componentes/RoleRoute';
import Epidemiologia from '@epi/paginas/EpidemiologiaApp';

/**
 * Rutas del módulo Epidemiología.
 * Envuelve toda la aplicación en RoleRoute restringiendo el acceso al rol 'admin'.
 */
export default function EpiRoutes() {
  return (
    <RoleRoute roles={['admin']}>
      <Epidemiologia />
    </RoleRoute>
  );
}
