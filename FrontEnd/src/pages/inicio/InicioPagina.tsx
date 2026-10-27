// react
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// propios
import { IconoEpidemiologia, IconoIndicadores, IconoPeriodoDelDia } from '@/components/icons';
import { useAuth, useRol } from '@/features/auth';
import NavCard from '@/components/ui/NavCard';
import TopBar from '@/components/TopBar';
import { getGreeting } from '@/utils/horario';
import '@/styles/inicio.css';

const InicioPagina = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { saludo, icono } = getGreeting();
  const { esVisitante, puedeGenFTP, puedeGenIAAS, puedeVerEpi } = useRol();

  const handleLogout = () => {
    logout();
    navigate('/CIAE/LOGIN');
  };

  useEffect(() => {
    document.title = "Inicio | CIAE";
  }, []);

  // El visitante no tiene nada que hacer en Inicio (solo ve Indicadores
  // Medicos) -- si llega aqui por cualquier via (boton atras, URL directa),
  // se manda derecho a su unico modulo.
  useEffect(() => {
    if (esVisitante) {
      navigate('/CIAE/IndicadoresMedicos', { replace: true });
    }
  }, [esVisitante, navigate]);

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
            desc="Indicadores de desempeño y calidad de la atención médica en las unidades del OOAD Guanajuato, conforme al MMIM."
            chips={['Generación', 'Consulta']}
            color="green"
            onClick={() => navigate('/CIAE/IndicadoresMedicos')}
          >
            <IconoIndicadores />
          </NavCard>

          {(puedeGenFTP || puedeGenIAAS) && (
            <NavCard
              titulo="Epidemiología"
              eyebrow="Módulo activo"
              desc="Vigilancia Epidemiológica: Análisis y seguimiento de enfermedades prioritarias en el OOAD Guanajuato."
              chips={['Dengue']}
              color="tinto"
              disabled={!puedeVerEpi}
              onClick={() => navigate('/CIAE/Epidemiologia')}
            >
              <IconoEpidemiologia />
            </NavCard>
          )}

        </div>
      </main>
    </div>
  );
};

export default InicioPagina;
