import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { lightTheme } from '../theme/theme';
import { authFetch, getUser } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatCurrencyMXN } from '../utils/formatters';
import financeHeroIllustration from '../assets/image2.png';
import DashboardCard from './ui/DashboardCard';
import DashboardHero from './ui/DashboardHero';
import KpiCard from './ui/KpiCard';
import QuickActionCard from './ui/QuickActionCard';

const monthOptions = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function DashboardPage({ onboardingSuccess = false, onDismissOnboardingSuccess }) {
  const theme = lightTheme;
  const dashboardKpiChartSize = useDashboardKpiChartSize();
  const isMobileDashboard = useIsMobileDashboard();
  const currentUser = getUser();
  const onboardingDestinations = ['Presupuesto', 'Variaciones', 'Movimientos', 'Cuentas'];
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(currentMonth || 5);
  const [reportRows, setReportRows] = useState([]);
  const [movements, setMovements] = useState([]);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoadingReport(true);
      setError('');

      try {
        const response = await authFetch(`${API_BASE_URL}/api/reports/real-vs-budget?year=${year}`);

        if (!response.ok) {
          throw new Error('Error fetching dashboard report');
        }

        const data = await response.json();
        setReportRows(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError('No se pudo cargar el dashboard.');
      } finally {
        setIsLoadingReport(false);
      }
    };

    fetchReport();
  }, [year]);

  useEffect(() => {
    const fetchMovements = async () => {
      setIsLoadingMovements(true);

      try {
        const params = new URLSearchParams({
          year: String(year),
          month: String(month),
        });

        const response = await authFetch(`${API_BASE_URL}/api/expenses?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Error fetching latest movements');
        }

        const data = await response.json();
        setMovements(data.slice(0, 5));
      } catch (fetchError) {
        console.error(fetchError);
        setError('No se pudo cargar el dashboard.');
      } finally {
        setIsLoadingMovements(false);
      }
    };

    fetchMovements();
  }, [year, month]);

  const selectedMonthRows = useMemo(
    () => reportRows.filter((row) => row.month === month),
    [reportRows, month]
  );

  const incomeBudget = selectedMonthRows
    .filter((row) => row.category_type === 'income')
    .reduce((sum, row) => sum + Number(row.budget), 0);

  const incomeActual = selectedMonthRows
    .filter((row) => row.category_type === 'income')
    .reduce((sum, row) => sum + Number(row.actual), 0);

  const expenseBudget = selectedMonthRows
    .filter((row) => row.category_type === 'expense')
    .reduce((sum, row) => sum + Number(row.budget), 0);

  const expenseActual = selectedMonthRows
    .filter((row) => row.category_type === 'expense')
    .reduce((sum, row) => sum + Number(row.actual), 0);

  const available = expenseBudget - expenseActual;
  const incomePercent = getPercent(incomeActual, incomeBudget);
  const expenseUsedPercent = getPercent(expenseActual, expenseBudget);
  const availablePercent = getPercent(available, expenseBudget);

  const topExpenseCategories = useMemo(() => {
    const categoryMap = new Map();

    selectedMonthRows
      .filter((row) => row.category_type === 'expense')
      .forEach((row) => {
        const currentTotal = categoryMap.get(row.category) || 0;
        categoryMap.set(row.category, currentTotal + Number(row.actual));
      });

    return Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [selectedMonthRows]);

  const isLoading = isLoadingReport || isLoadingMovements;
  const firstName = currentUser?.name?.split(' ')[0] || currentUser?.name || 'ahí';

  const renderDashboardKpis = () => (
    <div className="responsive-grid dashboard-kpi-grid dashboard-modern-kpi-grid">
      <DonutKpiCard
        theme={theme}
        title="Ingresos"
        icon="bx bx-trending-up"
        percent={incomePercent}
        primaryValue={`${Math.round(incomePercent)}%`}
        secondaryValue={`${formatCurrencyMXN(incomeActual)} de ${formatCurrencyMXN(incomeBudget)}`}
        isLoading={isLoading}
        chartSize={dashboardKpiChartSize}
        accentColor={getIncomeKpiColor(incomePercent)}
      />
      <DonutKpiCard
        theme={theme}
        title={isMobileDashboard ? 'Usado' : 'Presupuesto usado'}
        icon="bx bxs-pie-chart-alt-2"
        percent={expenseUsedPercent}
        primaryValue={`${Math.round(expenseUsedPercent)}%`}
        secondaryValue={`Usaste ${formatCurrencyMXN(expenseActual)} de ${formatCurrencyMXN(expenseBudget)}`}
        isLoading={isLoading}
        chartSize={dashboardKpiChartSize}
        accentColor={getBudgetUsedKpiColor(expenseUsedPercent)}
      />
      <DonutKpiCard
        theme={theme}
        title={isMobileDashboard ? 'Disponible' : 'Presupuesto disponible'}
        icon="bx bxs-wallet"
        percent={availablePercent}
        primaryValue={`${Math.round(availablePercent)}%`}
        secondaryValue={`Te quedan ${formatCurrencyMXN(available)}`}
        isLoading={isLoading}
        chartSize={dashboardKpiChartSize}
        accentColor={getAvailableBudgetKpiColor(availablePercent, available)}
      />
    </div>
  );

  return (
    <div className="page-stack dashboard-page dashboard-redesign">
      {onboardingSuccess && (
        <div className="onboarding-modal-overlay" role="dialog" aria-modal="true">
          <div className="onboarding-modal-content-area">
            <div className="onboarding-card dashboard-onboarding-success">
              <div>
                <h2>¡Felicidades! Completaste tu registro 😎</h2>
                <p>
                  {isMobileDashboard
                    ? 'Usa el menú ☰ para navegar entre:'
                    : 'Usa el menú lateral para navegar entre:'}
                </p>
                <ul>
                  {onboardingDestinations.map((destination) => (
                    <li key={destination}>{destination}</li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={onDismissOnboardingSuccess}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardHero
        greeting={`Hola, ${firstName} 👋`}
        illustrationSrc={financeHeroIllustration}
        subtitle="Aquí está tu resumen de hoy"
      >
        <div className="dashboard-hero-panel">
          <div className="dashboard-hero-filters">
            <div>
              <label>
                Año
              </label>
              <input
                type="number"
                value={year}
                onChange={(event) => setYear(Number(event.target.value) || 2026)}
              />
            </div>

            <div>
              <label>
                Mes
              </label>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {monthOptions.map((monthName, index) => (
                  <option key={monthName} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dashboard-hero-mobile-kpis">
            <MobileHeroKpi
              icon="bx bx-trending-up"
              label="Ingresos"
              percent={incomePercent}
              value={isLoading ? '$0.00' : formatCurrencyMXN(incomeActual)}
              accentColor={getIncomeKpiColor(incomePercent)}
            />
            <MobileHeroKpi
              icon="bx bxs-pie-chart-alt-2"
              label="Usado"
              percent={expenseUsedPercent}
              value={isLoading ? '$0.00' : formatCurrencyMXN(expenseActual)}
              accentColor={getBudgetUsedKpiColor(expenseUsedPercent)}
            />
            <MobileHeroKpi
              icon="bx bxs-wallet"
              label="Disponible"
              percent={availablePercent}
              value={isLoading ? '$0.00' : formatCurrencyMXN(available)}
              accentColor={getAvailableBudgetKpiColor(availablePercent, available)}
            />
          </div>
        </div>

        <div className="dashboard-hero-desktop-kpis">
          {renderDashboardKpis()}
        </div>
      </DashboardHero>

      {error && (
        <DashboardCard className="dashboard-error-card">
          <p>No se pudo cargar el dashboard.</p>
        </DashboardCard>
      )}

      <div className="dashboard-kpi-mobile-shell">
        {renderDashboardKpis()}
      </div>

      <div className="responsive-grid dashboard-section-grid dashboard-modern-section-grid">
        <DashboardCard title="Top categorías de gasto">
          {isLoading ? (
            <p className="dashboard-empty-state">Cargando...</p>
          ) : topExpenseCategories.length === 0 ? (
            <p className="dashboard-empty-state">No hay datos disponibles</p>
          ) : (
            <div className="dashboard-feed-list">
              {topExpenseCategories.map((item, index) => (
                <div
                  className="dashboard-list-row"
                  key={item.category}
                >
                  <div className="dashboard-feed-left">
                    <span
                      className="dashboard-feed-dot"
                      style={{
                        '--dashboard-feed-accent': getDashboardAccent(index),
                        '--dashboard-feed-accent-tint': getDashboardAccentTint(index),
                      }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span>{item.category}</span>
                  </div>
                  <strong>{formatCurrencyMXN(item.total)}</strong>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Últimos movimientos">
          {isLoading ? (
            <p className="dashboard-empty-state">Cargando...</p>
          ) : movements.length === 0 ? (
            <p className="dashboard-empty-state">No hay datos disponibles</p>
          ) : (
            <div className="dashboard-feed-list">
              {movements.map((movement, index) => (
                <div
                  className="dashboard-movement-row"
                  key={movement.id}
                >
                  <span
                    className="dashboard-movement-icon"
                    style={{ '--dashboard-feed-accent': getDashboardAccent(index) }}
                    aria-hidden="true"
                  >
                    <i className={getMovementIcon(movement.category)} />
                  </span>
                  <div className="dashboard-movement-content">
                    <div className="dashboard-movement-top-row">
                      <span className="dashboard-movement-description">
                        {movement.description || movement.concept || movement.category}
                      </span>
                      <strong className={movement.type === 'income' ? 'dashboard-movement-amount-income' : undefined}>
                        {formatCurrencyMXN(movement.amount)}
                      </strong>
                    </div>
                    <div className="dashboard-movement-meta-row">
                      <span>{movement.category}</span>
                      <span>{movement.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="dashboard-quick-actions">
        <QuickActionCard
          accentColor="#2563EB"
          description="Agrega o edita tus movimientos"
          icon="bx bx-plus-circle"
          label="Movimientos"
          to="/gastos"
        />
        <QuickActionCard
          accentColor="#10B981"
          description="Administra tus formas de pago"
          icon="bx bx-credit-card"
          label="Cuentas"
          to="/cuentas"
        />
        <QuickActionCard
          accentColor="#F59E0B"
          description="Actualiza tu presupuesto mensual"
          icon="bx bx-wallet"
          label="Presupuesto"
          to="/presupuesto"
        />
        <QuickActionCard
          accentColor="#8B5CF6"
          description="Analiza tus finanzas"
          icon="bx bx-bar-chart-alt-2"
          label="Reportes"
          to="/real-vs-presupuesto"
        />
      </div>
    </div>
  );
}

function DonutKpiCard({ theme, title, icon, percent, primaryValue, secondaryValue, isLoading, chartSize, accentColor }) {
  const rawPercent = Number.isFinite(percent) ? percent : 0;
  const chartPercent = Math.max(0, Math.min(100, rawPercent));
  const usesFixedChartSize = Boolean(chartSize.size);
  const chartData = [
    { name: 'value', value: chartPercent },
    { name: 'rest', value: 100 - chartPercent },
  ];
  const donutChart = usesFixedChartSize ? (
    <DashboardMobileDonut
      percent={chartPercent}
      size={chartSize.size}
      innerRadius={chartSize.innerRadius}
      outerRadius={chartSize.outerRadius}
      accentColor={accentColor}
      trackColor={theme.border}
    />
  ) : (
    <PieChart width={chartSize.size} height={chartSize.size}>
      <Pie
        data={chartData}
        dataKey="value"
        cx="50%"
        cy="50%"
        innerRadius={chartSize.innerRadius}
        outerRadius={chartSize.outerRadius}
        stroke="none"
        startAngle={90}
        endAngle={-270}
      >
        <Cell fill={accentColor} />
        <Cell fill={theme.border} />
      </Pie>
    </PieChart>
  );

  return (
    <KpiCard
      accentColor={accentColor}
      className="dashboard-kpi-card"
      icon={icon}
      title={title}
    >

      {isLoading ? (
        <div className="dashboard-kpi-chart dashboard-kpi-loading">
          Cargando...
        </div>
      ) : (
        <div
          className="dashboard-kpi-chart"
          style={{
            width: usesFixedChartSize ? chartSize.size : '100%',
            height: usesFixedChartSize ? chartSize.size : 150,
            position: 'relative',
            overflow: 'visible',
          }}
        >
          {usesFixedChartSize ? donutChart : (
            <ResponsiveContainer width="100%" height="100%">
              {donutChart}
            </ResponsiveContainer>
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="dashboard-kpi-percent" style={{ color: accentColor, fontSize: 28, fontWeight: 'bold' }}>
                {`${Math.round(rawPercent)}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-kpi-text-group">
        <div
          className="dashboard-kpi-primary"
        >
          {isLoading ? '$0.00' : primaryValue}
        </div>

        {secondaryValue ? (
          <div className="dashboard-kpi-secondary">
            {isLoading ? '' : secondaryValue}
          </div>
        ) : null}
      </div>
    </KpiCard>
  );
}

function MobileHeroKpi({ accentColor, icon, label, percent, value }) {
  const rawPercent = Number.isFinite(percent) ? percent : 0;
  const visualPercent = Math.max(0, Math.min(100, rawPercent));

  return (
    <div className="dashboard-hero-kpi" style={{ '--dashboard-hero-kpi-accent': accentColor }}>
      <span className="dashboard-hero-kpi-icon" aria-hidden="true">
        <i className={icon} />
      </span>
      <span className="dashboard-hero-kpi-label">{label}</span>
      <strong>{`${Math.round(rawPercent)}%`}</strong>
      <span className="dashboard-hero-kpi-track" aria-hidden="true">
        <span
          className="dashboard-hero-kpi-fill"
          style={{ width: `${visualPercent}%` }}
        />
      </span>
      <span className="dashboard-hero-kpi-value">{value}</span>
    </div>
  );
}

function DashboardMobileDonut({ percent, size, innerRadius, outerRadius, accentColor, trackColor }) {
  const strokeWidth = outerRadius - innerRadius;
  const radius = innerRadius + strokeWidth / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const progressLength = (clampedPercent / 100) * circumference;
  const gapLength = circumference - progressLength;

  return (
    <svg
      className="dashboard-kpi-donut-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={accentColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${progressLength} ${gapLength}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}

function useDashboardKpiChartSize() {
  const getChartSize = () => {
    if (typeof window === 'undefined') {
      return { innerRadius: 48, outerRadius: 64 };
    }

    if (window.matchMedia('(max-width: 430px)').matches) {
      return { size: 56, innerRadius: 15, outerRadius: 22 };
    }

    if (window.matchMedia('(max-width: 767px)').matches) {
      return { size: 62, innerRadius: 17, outerRadius: 25 };
    }

    if (window.matchMedia('(max-width: 1023px)').matches) {
      return { innerRadius: 42, outerRadius: 56 };
    }

    return { innerRadius: 48, outerRadius: 64 };
  };

  const [chartSize, setChartSize] = useState(getChartSize);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => setChartSize(getChartSize());
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return chartSize;
}

function useIsMobileDashboard() {
  const getIsMobile = () => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

function getIncomeKpiColor(percent) {
  if (percent > 100) return '#2563EB';
  if (percent >= 95) return '#0A7A3D';
  if (percent >= 90) return '#22A447';
  if (percent >= 85) return '#22A447';
  if (percent >= 80) return '#7DBE3C';
  if (percent >= 75) return '#D4A800';
  if (percent >= 70) return '#D4A800';
  if (percent >= 65) return '#F79420';
  if (percent >= 60) return '#F79420';
  if (percent > 50) return '#F79420';
  return '#EE1F28';
}

function getBudgetUsedKpiColor(percent) {
  if (percent >= 100) return '#EE1F28';
  if (percent >= 90) return '#F79420';
  if (percent >= 85) return '#F79420';
  if (percent >= 80) return '#F79420';
  if (percent >= 75) return '#D4A800';
  if (percent >= 70) return '#D4A800';
  if (percent >= 65) return '#7DBE3C';
  if (percent >= 60) return '#22A447';
  if (percent >= 50) return '#22A447';
  return '#0A7A3D';
}

function getAvailableBudgetKpiColor(percent, amount) {
  if (percent >= 100) return '#0A7A3D';
  if (percent >= 90) return '#0A7A3D';
  if (percent >= 80) return '#22A447';
  if (percent >= 70) return '#7DBE3C';
  if (percent >= 60) return '#D4A800';
  if (percent >= 50) return '#D4A800';
  if (percent >= 40) return '#F79420';
  if (percent >= 25) return '#F79420';
  if (percent >= 10) return '#F79420';
  return '#EE1F28';
}

function getDashboardAccent(index) {
  const accents = ['#11A9CC', '#2563EB', '#8B5CF6', '#10B981', '#F59E0B', '#F97316', '#EC4899'];
  return accents[index % accents.length];
}

function getDashboardAccentTint(index) {
  const tints = [
    'rgba(17, 169, 204, 0.12)',
    'rgba(37, 99, 235, 0.12)',
    'rgba(139, 92, 246, 0.12)',
    'rgba(16, 185, 129, 0.12)',
    'rgba(245, 158, 11, 0.12)',
    'rgba(249, 115, 22, 0.12)',
    'rgba(236, 72, 153, 0.12)',
  ];
  return tints[index % tints.length];
}

function getMovementIcon(category = '') {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes('comida') || normalizedCategory.includes('super')) {
    return 'bx bx-bowl-hot';
  }

  if (normalizedCategory.includes('transporte') || normalizedCategory.includes('auto')) {
    return 'bx bx-car';
  }

  if (normalizedCategory.includes('casa') || normalizedCategory.includes('renta')) {
    return 'bx bx-home-alt';
  }

  if (normalizedCategory.includes('salud')) {
    return 'bx bx-plus-medical';
  }

  if (normalizedCategory.includes('entretenimiento')) {
    return 'bx bx-movie-play';
  }

  return 'bx bx-receipt';
}

function getPercent(value, total) {
  if (!total) {
    return 0;
  }

  return (Number(value) / Number(total)) * 100;
}

export default DashboardPage;
