import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
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
        const response = await authFetch(`http://localhost:3000/api/reports/real-vs-budget?year=${year}`);

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

        const response = await authFetch(`http://localhost:3000/api/expenses?${params.toString()}`);

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
    <div style={{ display: 'grid', gap: 20, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div
        style={pageCardStyle}
      >
        <h1 style={pageTitleStyle}>
          Resumen
        </h1>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, minWidth: 0 }}>
        <DonutKpiCard
          theme={theme}
          title="Ingresos"
          percent={getPercent(incomeActual, incomeBudget)}
          primaryValue={`${formatCurrencyMXN(incomeActual)} de ${formatCurrencyMXN(incomeBudget)}`}
          // secondaryValue={
          //   incomeActual >= incomeBudget
          //     ? 'Meta alcanzada'
          //     : `Te faltan $${Number(Math.max(incomeBudget - incomeActual, 0)).toFixed(2)}`
          // }
          isLoading={isLoading}
        />
        <DonutKpiCard
          theme={theme}
          title="Presupuesto usado"
          percent={getPercent(expenseActual, expenseBudget)}
          primaryValue={`Usaste ${formatCurrencyMXN(expenseActual)} de ${formatCurrencyMXN(expenseBudget)}`}
          secondaryValue=""
          isLoading={isLoading}
        />
        <DonutKpiCard
          theme={theme}
          title="Presupuesto disponible"
          percent={getPercent(available, expenseBudget)}
          primaryValue={`Te quedan ${formatCurrencyMXN(available)}`}
          secondaryValue=""
          isLoading={isLoading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, minWidth: 0 }}>
        <SectionCard title="Top categorías de gasto" theme={theme}>
          {isLoading ? (
            <p style={{ margin: 0, color: theme.textSecondary }}>Cargando...</p>
          ) : topExpenseCategories.length === 0 ? (
            <p style={{ margin: 0, color: theme.textSecondary }}>No hay datos disponibles</p>
          ) : (
            <div style={{ display: 'grid', gap: 0 }}>
              {topExpenseCategories.map((item, index) => (
                <div
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
                  key={movement.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr auto',
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
                  <strong style={{ color: theme.textPrimary }}>{formatCurrencyMXN(movement.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function DonutKpiCard({ theme, title, percent, primaryValue, secondaryValue, isLoading }) {
  const rawPercent = Number.isFinite(percent) ? percent : 0;
  const chartPercent = Math.max(0, Math.min(100, rawPercent));
  const chartData = [
    { name: 'value', value: chartPercent },
    { name: 'rest', value: 100 - chartPercent },
  ];

  return (
    <div
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
      <div style={{ ...typography.cardTitle }}>{title}</div>

      {isLoading ? (
        <div style={{ height: 150, display: 'grid', placeItems: 'center', color: theme.textSecondary }}>
          Cargando...
        </div>
      ) : (
        <div style={{ width: '100%', height: 150, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={64}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                <Cell fill={theme.sidebarBackground} />
                <Cell fill={theme.border} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
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
              <div style={{ color: theme.textPrimary, fontSize: 28, fontWeight: 'bold' }}>
                {`${Math.round(rawPercent)}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 12 }}>
        {isLoading ? '$0.00' : primaryValue}
      </div>
      {secondaryValue ? (
        <div style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 12 }}>
          {isLoading ? '' : secondaryValue}
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, theme, children }) {
  return (
    <div
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
