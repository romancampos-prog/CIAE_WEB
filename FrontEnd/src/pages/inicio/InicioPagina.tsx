// react
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// propios
import { IconoModuloIndicadores, IconoModuloVigilancia, IconoPeriodoDelDia } from '@/components/icons';
import { useAuth, useRol } from '@/features/auth';
import NavCard from '@/components/ui/NavCard';
import TopBar from '@/components/TopBar';
import { getGreeting } from '@/utils/horario';
import '@/styles/inicio.css';

const InicioPagina = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { saludo, icono } = getGreeting();
  const { esUnidad } = useRol();

  const handleLogout = () => {
    logout();
    navigate('/CIAE/LOGIN');
  };

  useEffect(() => {
    document.title = "Inicio | CIAE";
  }, []);

  return (
    <div className="home-root">

      <div className="home-bg" aria-hidden="true">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
        <div className="home-grid" />
      </div>

      <TopBar onLogout={handleLogout} />

      <main className="home-main">

        <div className="home-hero">
          <div className="home-hero-greeting">
            <span className="home-hero-greeting-icon">
              <IconoPeriodoDelDia periodo={icono} />
            </span>
            <span className="home-hero-saludo">{saludo},</span>
          </div>
          <h1 className="home-hero-name-big">
            {user?.user || 'Usuario'}
          </h1>
          <p className="home-hero-sub">
            Selecciona el módulo con el que deseas trabajar
          </p>
        </div>

        <div className="home-cards">

          <NavCard
            titulo="Indicadores Médicos"
            eyebrow="Módulo activo"
            desc="Desempeño y calidad de la atención en las unidades del OOAD Guanajuato, conforme al MMIM."
            chips={['Generación', 'Consulta']}
            color="green"
            onClick={() => navigate('/CIAE/IndicadoresMedicos')}
          >
            <IconoModuloIndicadores />
          </NavCard>

          <NavCard
            titulo="Epidemiología"
            eyebrow="Módulo activo"
            desc="Vigilancia de enfermedades prioritarias y seguimiento de acciones en el OOAD Guanajuato."
            chips={esUnidad ? ['Acciones'] : ['Dengue', 'Acciones']}
            color="tinto"
            onClick={() => navigate('/CIAE/Epidemiologia')}
          >
            <IconoModuloVigilancia />
          </NavCard>

        </div>
      </main>

      <p className="home-aviso">
        <strong>Aviso de uso y responsabilidad.</strong> La información de esta plataforma se proporciona únicamente para consulta y análisis interno, en el ejercicio de las funciones institucionales de cada persona usuaria. Los resultados se obtienen de reportes y archivos fuente, por lo que pueden modificarse si dichas fuentes se actualizan o corrigen, y no sustituyen a los reportes oficiales. Parte de la información contiene datos personales y de salud de carácter confidencial, cuya consulta se limita a las funciones autorizadas. Las credenciales de acceso son personales e intransferibles, y cada persona responde por las acciones realizadas con su cuenta. Una vez descargado un archivo, su uso, resguardo, tratamiento y eliminación son responsabilidad exclusiva de quien lo descargó.
      </p>
    </div>
  );
};

export default InicioPagina;
