import { useState } from 'react';

const helpSections = [
  {
    title: 'Inicio y acceso',
    icon: 'bx bx-log-in-circle',
    items: [
      'Inicia sesion con tu correo y contrasena.',
      'Si olvidaste tu contrasena, usa la opcion de recuperacion desde la pantalla de acceso.',
      'Al entrar por primera vez, la app te guia para crear una cuenta y registrar tu primer movimiento.',
    ],
  },
  {
    title: 'Resumen',
    icon: 'bx bx-grid-alt',
    items: [
      'Consulta los indicadores principales de tus finanzas.',
      'Revisa ingresos, egresos, ultimos movimientos y categorias destacadas.',
      'Usa esta vista como punto de partida para detectar cambios relevantes.',
    ],
  },
  {
    title: 'Movimientos',
    icon: 'bx bx-receipt',
    items: [
      'Registra ingresos o egresos con fecha, categoria, concepto, cuenta y monto.',
      'Edita o elimina movimientos desde la tabla/lista de movimientos.',
      'Usa Movimientos Frecuentes para guardar operaciones recurrentes y capturarlas mas rapido.',
    ],
  },
  {
    title: 'Cuentas',
    icon: 'bx bx-credit-card',
    items: [
      'Agrega cuentas de debito o credito para clasificar tus movimientos.',
      'Las cuentas de credito requieren dia de corte.',
      'Puedes desactivar cuentas que ya no uses sin perder el historial asociado.',
    ],
  },
  {
    title: 'Presupuesto',
    icon: 'bx bx-wallet',
    items: [
      'Define montos presupuestados por concepto y mes.',
      'Guarda cambios para que se reflejen en la comparacion contra gasto real.',
      'Usa el ano seleccionado para planear o revisar periodos especificos.',
    ],
  },
  {
    title: 'Variaciones',
    icon: 'bx bx-bar-chart-alt-2',
    items: [
      'Compara gasto real contra presupuesto.',
      'Filtra por mes, trimestre, semestre, acumulado anual o ano completo.',
      'Revisa diferencias para identificar conceptos por encima o por debajo del plan.',
    ],
  },
  {
    title: 'Actividad',
    icon: 'bx bx-history',
    items: [
      'Consulta eventos relevantes como login, movimientos, cuentas, presupuestos y usuarios.',
      'Usa filtros por periodo para revisar actividad reciente.',
      'Los administradores pueden revisar actividad de todos los usuarios cuando aplique.',
    ],
  },
  {
    title: 'Usuarios',
    icon: 'bx bxs-user-account',
    items: [
      'La seccion Usuarios solo aparece para administradores.',
      'Permite revisar usuarios registrados y ajustar rol o estado.',
      'Evita modificar tu propio acceso de administrador durante una sesion activa.',
    ],
  },
];

function HelpPage() {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (sectionTitle) => {
    setOpenSection((currentSection) => (
      currentSection === sectionTitle ? null : sectionTitle
    ));
  };

  return (
    <main className="help-page">
      <header className="help-page-header">
        <div className="help-page-title-block">
          <span className="help-page-kicker">Centro de ayuda</span>
          <h1>Guia de usuario</h1>
          <p>
            Consulta los flujos principales de DexForge y resuelve dudas rapidas sobre cada modulo.
          </p>
        </div>
      </header>

      <section className="help-page-grid" aria-label="Guia de modulos">
        {helpSections.map((section) => {
          const isOpen = openSection === section.title;

          return (
            <article className={`help-accordion${isOpen ? ' is-open' : ''}`} key={section.title}>
              <button
                type="button"
                className="help-accordion-trigger"
                aria-expanded={isOpen}
                onClick={() => toggleSection(section.title)}
              >
                <span className="help-accordion-icon" aria-hidden="true">
                  <i className={section.icon}></i>
                </span>
                <span>{section.title}</span>
                <i className="bx bx-chevron-down help-accordion-chevron" aria-hidden="true"></i>
              </button>
              {isOpen && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default HelpPage;
