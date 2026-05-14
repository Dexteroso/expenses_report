import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatCurrencyMXN } from '../utils/formatters';
import { typography } from '../styles/typography';

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

function DashboardPage() {
  const theme = lightTheme;
  const dashboardKpiChartSize = useDashboardKpiChartSize();
  const pageCardStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '16px',
    boxShadow: theme.shadow,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  };
  const pageTitleStyle = {
    ...typography.pageTitle,
    marginTop: 10,
    marginBottom: 10,
  };
  const labelStyle = {
    display: 'block',
    color: theme.textBody,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  };
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

  return (
    <div className="page-stack dashboard-page" style={{ display: 'grid', gap: 20, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div
        className="responsive-card dashboard-summary-card"
        style={pageCardStyle}
      >
        <h1 style={pageTitleStyle}>
          Resumen
        </h1>
        <div className="responsive-filter-bar dashboard-summary-filters" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>
              Año
            </label>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value) || 2026)}
              style={getControlStyle(theme, 120)}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Mes
            </label>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              style={getControlStyle(theme, 180)}
            >
              {monthOptions.map((monthName, index) => (
                <option key={monthName} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      <div className="responsive-grid dashboard-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, minWidth: 0 }}>
        <DonutKpiCard
          theme={theme}
          title="Ingresos"
          percent={incomePercent}
          primaryValue={`${formatCurrencyMXN(incomeActual)} de ${formatCurrencyMXN(incomeBudget)}`}
          // secondaryValue={
          //   incomeActual >= incomeBudget
          //     ? 'Meta alcanzada'
          //     : `Te faltan $${Number(Math.max(incomeBudget - incomeActual, 0)).toFixed(2)}`
          // }
          isLoading={isLoading}
          chartSize={dashboardKpiChartSize}
          accentColor={getIncomeKpiColor(incomePercent)}
        />
        <DonutKpiCard
          theme={theme}
          title="Presupuesto usado"
          percent={expenseUsedPercent}
          primaryValue={`Usaste ${formatCurrencyMXN(expenseActual)} de ${formatCurrencyMXN(expenseBudget)}`}
          secondaryValue=""
          isLoading={isLoading}
          chartSize={dashboardKpiChartSize}
          accentColor={getBudgetUsedKpiColor(expenseUsedPercent)}
        />
        <DonutKpiCard
          theme={theme}
          title="Presupuesto disponible"
          percent={availablePercent}
          primaryValue={`Te quedan ${formatCurrencyMXN(available)}`}
          secondaryValue=""
          isLoading={isLoading}
          chartSize={dashboardKpiChartSize}
          accentColor={getAvailableBudgetKpiColor(availablePercent, available)}
        />
      </div>

      <div className="responsive-grid dashboard-section-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, minWidth: 0 }}>
        <SectionCard title="Top categorías de gasto" theme={theme}>
          {isLoading ? (
            <p style={{ margin: 0, color: theme.textSecondary }}>Cargando...</p>
          ) : topExpenseCategories.length === 0 ? (
            <p style={{ margin: 0, color: theme.textSecondary }}>No hay datos disponibles</p>
          ) : (
            <div style={{ display: 'grid', gap: 0 }}>
              {topExpenseCategories.map((item, index) => (
                <div
                  className="dashboard-list-row"
                  key={item.category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingBottom: 0,
                    borderBottom: index === topExpenseCategories.length - 1 ? 'none' : `1px solid ${theme.border}`,
                  }}
                >
                  <span style={{ color: theme.textBody }}>{item.category}</span>
                  <strong style={{ color: theme.textPrimary }}>{formatCurrencyMXN(item.total)}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Últimos movimientos" theme={theme}>
          {isLoading ? (
            <p style={{ margin: 0, color: theme.textSecondary }}>Cargando...</p>
          ) : movements.length === 0 ? (
            <p style={{ margin: 0, color: theme.textSecondary }}>No hay datos disponibles</p>
          ) : (
            <div style={{ display: 'grid', gap: 0 }}>
              {movements.map((movement, index) => (
                <div
                  className="dashboard-movement-row"
                  key={movement.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 110px',
                    gap: 12,
                    paddingBottom: 0,
                    borderBottom: index === movements.length - 1 ? 'none' : `1px solid ${theme.border}`,
                  }}
                >
                  <span style={{ color: theme.textSecondary }}>{movement.date}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: theme.textBody }}>{movement.category}</div>
                    {/* <div style={{ color: theme.textSecondary }}>{movement.concept}</div> */}
                  </div>
                  <strong style={{ textAlign: 'right', color: theme.textPrimary }}>{formatCurrencyMXN(movement.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function DonutKpiCard({ theme, title, percent, primaryValue, secondaryValue, isLoading, chartSize, accentColor }) {
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
    <div
      className="dashboard-kpi-card"
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        padding: '5px',
        boxShadow: theme.shadow,
        display: 'grid',
        justifyItems: 'center',
        gap: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
        fontSize: 12,
      }}
    >

      {isLoading ? (
        <div className="dashboard-kpi-chart dashboard-kpi-loading" style={{ height: 150, display: 'grid', placeItems: 'center', color: theme.textSecondary }}>
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

      <div className="dashboard-kpi-text-group"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}>
        <div className="dashboard-kpi-title" style={{ ...typography.cardTitle, fontSize: 18}}>{title}</div>
        <div
          className="dashboard-kpi-primary"
          style={{
            color: theme.textSecondary,
            textAlign: 'center',
            fontSize: 15,
          }}
        >
          {isLoading ? '$0.00' : primaryValue}
        </div>

        {secondaryValue ? (
          <div
            className="dashboard-kpi-secondary"
            style={{
              color: theme.textSecondary,
              textAlign: 'center',
              fontSize: 12,
            }}
          >
            {isLoading ? '' : secondaryValue}
          </div>
        ) : null}
      </div>
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

function getIncomeKpiColor(percent) {
if (percent <= 100) return '#086938';
if (percent <= 95) return '#029348';
if (percent <= 90) return '#3AB449';
if (percent <= 85) return '#8CC640';
if (percent <= 80) return '#DBE026';
if (percent <= 75) return '#FAED22';
if (percent <= 70) return '#FBB03A';
if (percent <= 65) return '#F79420';
if (percent <= 60) return '#F15A27';
if (percent <= 50) return '#EE1F28';
  return '#2563eb';
}

function getBudgetUsedKpiColor(percent) {
  if (percent >= 100) return '#EE1F28';
  if (percent >= 90) return '#F15A27';
  if (percent >= 85) return '#F79420';
  if (percent >= 80) return '#FBB03A';
  if (percent >= 75) return '#FAED22';
  if (percent >= 70) return '#DBE026';
  if (percent >= 65) return '#8CC640';
  if (percent >= 60) return '#3AB449';
  if (percent >= 50) return '#029348';
  return '#086938';
}

function getAvailableBudgetKpiColor(percent, amount) {
if (percent >= 100) return '#086938';
if (percent >= 90) return '#029348';
if (percent >= 80) return '#3AB449';
if (percent >= 70) return '#8CC640';
if (percent >= 60) return '#DBE026';
if (percent >= 50) return '#FAED22';
if (percent >= 40) return '#FBB03A';
if (percent >= 25) return '#F79420';
if (percent >= 10) return '#F15A27';
  return '#EE1F28';
}

function SectionCard({ title, theme, children }) {
  return (
    <div
      className="responsive-card dashboard-section-card"
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        padding: '16px',
        boxShadow: theme.shadow,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
        fontSize: 12,
      }}
    >
      <h2 style={{ ...typography.cardTitle, marginTop: 0, marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function getControlStyle(theme, width) {
  return {
    width,
    padding: '5px 10px',
    borderRadius: 8,
    border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBackground,
    color: theme.inputText,
    fontSize: 12,
  };
}

function getPercent(value, total) {
  if (!total) {
    return 0;
  }

  return (Number(value) / Number(total)) * 100;
}

export default DashboardPage;
