// react
// propios
import RoleRoute    from '../../auth/componentes/RoleRoute';
import Epidemiologia from '../paginas/EpidemiologiaApp';

export default function EpiRoutes() {
  return (
    <RoleRoute roles={['admin']}>
      <Epidemiologia />
    </RoleRoute>
  );
}
