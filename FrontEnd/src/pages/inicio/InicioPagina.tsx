// react
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// propios
import { useAuth, useRol } from '@/features/auth';
import IconoPeriodoDelDia from '@/components/ui/IconoPeriodoDelDia';
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
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
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="19" r="12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9"/>
                <ellipse cx="18" cy="19" rx="5" ry="12" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
                <line x1="6" y1="19" x2="30" y2="19" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5"/>
                <path d="M8 13.5 Q18 10.5 28 13.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
                <path d="M8 24.5 Q18 27.5 28 24.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" fill="none"/>
                <circle cx="31" cy="30" r="8" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.95" fill="none"/>
                <line x1="37" y1="36" x2="43" y2="42" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.95"/>
                <circle cx="31" cy="30" r="2.6" fill="currentColor" fillOpacity="0.85"/>
                <line x1="31" y1="25.8" x2="31" y2="24" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="31" y1="34.2" x2="31" y2="36" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="26.8" y1="30" x2="25" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="35.2" y1="30" x2="37" y2="30" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="27.9" y1="27.1" x2="26.7" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="34.1" y1="32.9" x2="35.3" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="34.1" y1="27.1" x2="35.3" y2="25.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="27.9" y1="32.9" x2="26.7" y2="34.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="24" cy="24" r="1.3" fill="currentColor" fillOpacity="0.55"/>
                <circle cx="37" cy="24" r="1.1" fill="currentColor" fillOpacity="0.45"/>
              </svg>
            </NavCard>
          )}

        </div>
      </main>
    </div>
  );
};

export default InicioPagina;
