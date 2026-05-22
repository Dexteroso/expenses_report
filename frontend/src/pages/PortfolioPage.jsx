import { useEffect, useState } from 'react';
import dexforgeIcon from '../assets/brand/dexforge-icon-transparent.png';
import '../styles/PortfolioPage.css';

const technologies = [
  {
    title: 'Frontend',
    items: ['React', 'Vite', 'React Router', 'CSS responsivo'],
  },
  {
    title: 'Backend',
    items: ['Node.js', 'Express', 'JWT', 'Swagger'],
  },
  {
    title: 'Bases de datos',
    items: ['MySQL', 'MongoDB', 'Sequelize', 'Mongoose'],
  },
  {
    title: 'Infraestructura',
    items: ['Docker Compose', 'DigitalOcean', 'Nginx', 'Dominio personalizado'],
  },
];

const evidenceItems = [
  {
    number: '01',
    title: 'Login',
    description: 'Pantalla de acceso con autenticación, recuperación de contraseña y flujo de usuario seguro.',
    image: '/portfolio/Login.png',
  },
  {
    number: '02',
    title: 'Dashboard',
    description: 'Resumen financiero con indicadores principales, gráficas y últimos movimientos registrados.',
    image: '/portfolio/dashboard.png',
  },
  {
    number: '03',
    title: 'Movimientos',
    description: 'Registro, consulta, edición, eliminación y filtros de ingresos y egresos.',
    image: '/portfolio/movimientos.png',
  },
  {
    number: '04',
    title: 'Presupuesto',
    description: 'Planeación anual por categoría y concepto para controlar el gasto mensual.',
    image: '/portfolio/presupuesto.png',
  },
  {
    number: '05',
    title: 'Variaciones',
    description: 'Comparación entre presupuesto y gasto real para identificar desviaciones.',
    image: '/portfolio/variaciones.png',
  },
  {
    number: '06',
    title: 'Cuentas',
    description: 'Administración de cuentas financieras asociadas a los movimientos del usuario.',
    image: '/portfolio/cuentas.png',
  },
  {
    number: '07',
    title: 'Actividad',
    description: 'Auditoría de eventos relevantes con historial de cambios y acciones de usuario.',
    image: '/portfolio/actividad.png',
  },
  {
    number: '08',
    title: 'Usuarios',
    description: 'Panel administrativo para gestionar usuarios, roles y estado de acceso.',
    image: '/portfolio/usuarios.png',
  },
  {
    number: '09',
    title: 'Ayuda',
    description: 'Guía de uso integrada para explicar las secciones principales de la aplicación.',
    image: '/portfolio/ayuda.png',
  },
  {
    number: '10',
    title: 'Swagger',
    description: 'Documentación interactiva de endpoints para validar la API del proyecto.',
    image: '/portfolio/swagger.png',
  },
];

const learnings = [
  {
    title: 'Desarrollo',
    text: 'Construcción de una aplicación full stack con separación entre frontend, backend, persistencia y servicio de actividad.',
  },
  {
    title: 'UX',
    text: 'Diseño de flujos claros para registrar movimientos, consultar presupuestos y navegar información financiera.',
  },
  {
    title: 'Despliegue',
    text: 'Publicación en DigitalOcean con Docker Compose, Nginx, dominio personalizado y documentación de API.',
  },
];

function PortfolioPage() {
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  useEffect(() => {
    if (!selectedEvidence) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedEvidence(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedEvidence]);

  return (
    <main className="portfolio-page">
      <section className="portfolio-hero">
        <div className="portfolio-brand">
          <img src={dexforgeIcon} alt="" aria-hidden="true" />
          <span>DexForge</span>
        </div>
        <div className="portfolio-hero-copy">
          <h1>Administrador de Finanzas Personales</h1>
          <p>DexForge permite registrar ingresos y egresos, administrar cuentas, definir presupuestos y comparar resultados reales contra lo planeado. El proyecto integra autenticación, roles, bases de datos, documentación de API y despliegue en producción.</p>
        </div>
        <div className="portfolio-actions" aria-label="Recursos principales">
          <a href="#portfolio-evidencias">Evidencias</a>
          <a href="#portfolio-accesos">Recursos</a>
        </div>
      </section>

      <section className="portfolio-section portfolio-objective">
        <span className="portfolio-kicker">Objetivo</span>
        <h2>Administración financiera personal con evidencia full stack</h2>
        <p>
          DexForge permite registrar ingresos y egresos, organizar cuentas, definir presupuestos y comparar resultados
          reales contra lo planeado. El proyecto integra autenticación, roles, auditoría de actividad, documentación de
          API y despliegue en producción. Esta página resume la evidencia visual y técnica preparada para la entrega
          académica.
        </p>
      </section>

      <section className="portfolio-section">
        <span className="portfolio-kicker">Tecnologías</span>
        <h2>Stack utilizado</h2>
        <div className="portfolio-tech-grid">
          {technologies.map((group) => (
            <article className="portfolio-card" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-section" id="portfolio-evidencias">
        <span className="portfolio-kicker">Evidencias del proyecto</span>
        <h2>Recorrido visual</h2>
        <div className="portfolio-gallery">
          {evidenceItems.map((item) => (
            <article className="portfolio-evidence" key={item.number}>
              <div className="portfolio-evidence-heading">
                <span>{item.number}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
              <button
                type="button"
                className="portfolio-evidence-preview"
                onClick={() => setSelectedEvidence(item)}
                aria-label={`Abrir captura de ${item.title}`}
              >
                <img src={item.image} alt={`Captura de ${item.title}`} loading="lazy" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-section">
        <span className="portfolio-kicker">Aprendizajes</span>
        <h2>Resultados del proceso</h2>
        <div className="portfolio-learning-grid">
          {learnings.map((learning) => (
            <article className="portfolio-learning-card" key={learning.title}>
              <h3>{learning.title}</h3>
              <p>{learning.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="portfolio-section portfolio-resources" id="portfolio-accesos">
        <span className="portfolio-kicker">Recursos</span>
        <h2>Accesos de Revisión</h2>
        <div className="portfolio-resource-list">
          <a href="https://github.com/Dexteroso/expenses_report">GitHub</a>
          <a href="https://dexforge.app/auth">Aplicación</a>
          <a href="https://dexforge.app/api-docs">Swagger</a>
          <div className="portfolio-demo-user">
            <strong>Usuario demo</strong>
            <span>admin.docker@example.com</span>
            <span>DockerDemo123!</span>
          </div>
        </div>
      </section>

      {selectedEvidence && (
        <div
          className="portfolio-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista ampliada de ${selectedEvidence.title}`}
          onClick={() => setSelectedEvidence(null)}
        >
          <button
            type="button"
            className="portfolio-lightbox-close"
            onClick={() => setSelectedEvidence(null)}
            aria-label="Cerrar vista ampliada"
          >
            X
          </button>
          <figure className="portfolio-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img src={selectedEvidence.image} alt={`Captura ampliada de ${selectedEvidence.title}`} />
            <figcaption>
              <strong>{selectedEvidence.number} {selectedEvidence.title}</strong>
              <span>{selectedEvidence.description}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}

export default PortfolioPage;
