import { useEffect, useState } from 'react';
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

const categoryDisplayOrder = [
  'Ingresos',
  'Vivienda',
  'Transporte',
  'Alimentos',
  'Pagos de Deuda',
  'Cuidado de Mascotas',
  'Cuidado Personal',
  'Educación',
  'Entretenimiento',
  'Ahorros e Inversiones',
  'Artículos Personales',
  'Impuestos',
  'Seguros',
  'Viajes',
  'Misceláneos',
];

function RealVsBudgetPage() {
  const theme = lightTheme;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const cardStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '16px',
    boxShadow: theme.shadow,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    overflowX: 'hidden',
  };
  const labelStyle = {
    color: theme.textBody,
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: '30px',
  };
  const [year, setYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState('monthly');
  const [periodType, setPeriodType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await authFetch(`${API_BASE_URL}/api/reports/real-vs-budget?year=${year}`);

        if (!response.ok) {
          throw new Error('Error fetching report');
        }

        const data = await response.json();
        setReportRows(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError('No se pudo cargar el reporte.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [year]);

  const handleViewModeChange = (nextMode) => {
    setViewMode(nextMode);

    if (nextMode === 'monthly') {
      setPeriodType('month');
      setSelectedQuarter(null);
      setSelectedSemester(null);
      return;
    }

    setPeriodType('null');
    setSelectedQuarter(null);
    setSelectedSemester(null);
  };

  const handlePeriodTypeChange = (nextPeriodType) => {
    setPeriodType(nextPeriodType);

    if (nextPeriodType === 'quarter') {
      setSelectedQuarter(1);
      setSelectedSemester(null);
      return;
    }

    if (nextPeriodType === 'semester') {
      setSelectedSemester(1);
      setSelectedQuarter(null);
      return;
    }

    setSelectedQuarter(null);
    setSelectedSemester(null);
  };

  const getActiveMonths = () => {
    if (viewMode === 'monthly') {
      return [selectedMonth];
    }

    if (periodType === 'quarter') {
      if (selectedQuarter === 1) return [1, 2, 3];
      if (selectedQuarter === 2) return [4, 5, 6];
      if (selectedQuarter === 3) return [7, 8, 9];
      if (selectedQuarter === 4) return [10, 11, 12];
    }

    if (periodType === 'semester') {
      if (selectedSemester === 1) return [1, 2, 3, 4, 5, 6];
      if (selectedSemester === 2) return [7, 8, 9, 10, 11, 12];
    }

    if (periodType === 'ytd') {
      return Array.from({ length: selectedMonth }, (_, index) => index + 1);
    }

    return [];
  };

  const buildGroupedReport = () => {
    const categoriesMap = new Map();

    reportRows.forEach((row) => {
      if (!categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          category_id: row.category_id,
          category: row.category,
          category_type: row.category_type,
          conceptsMap: new Map(),
        });
      }

      const categoryEntry = categoriesMap.get(row.category_id);

      if (!categoryEntry.conceptsMap.has(row.concept_id)) {
        categoryEntry.conceptsMap.set(row.concept_id, {
          concept_id: row.concept_id,
          concept: row.concept,
        });
      }
    });

    return Array.from(categoriesMap.values())
      .map((categoryEntry) => ({
        category_id: categoryEntry.category_id,
        category: categoryEntry.category,
        category_type: categoryEntry.category_type,
        concepts: Array.from(categoryEntry.conceptsMap.values()).sort(
          (a, b) => a.concept_id - b.concept_id
        ),
      }))
      .sort((a, b) => {
        const aIndex = categoryDisplayOrder.indexOf(a.category);
        const bIndex = categoryDisplayOrder.indexOf(b.category);
        const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

        if (normalizedAIndex !== normalizedBIndex) {
          return normalizedAIndex - normalizedBIndex;
        }

        if (aIndex === -1 && bIndex === -1) {
          return a.category.localeCompare(b.category);
        }

        return a.category_id - b.category_id;
      });
  };

  const getConceptMonthMetrics = (conceptId, month) => {
    const row = reportRows.find(
      (reportRow) => reportRow.concept_id === conceptId && reportRow.month === month
    );

    return {
      budget: row ? Number(row.budget) : 0,
      actual: row ? Number(row.actual) : 0,
      deviation: row ? Number(row.deviation) : 0,
    };
  };

  const getMetricsForMonths = (months, resolver) =>
    months.reduce(
      (totals, month) => {
        const metrics = resolver(month);

        return {
          budget: totals.budget + metrics.budget,
          actual: totals.actual + metrics.actual,
          deviation: totals.deviation + metrics.deviation,
        };
      },
      { budget: 0, actual: 0, deviation: 0 }
    );

  const groupedReport = buildGroupedReport();
  const activeMonths = getActiveMonths();
  const incomeCategories = groupedReport.filter((category) => category.category_type === 'income');
  const expenseCategories = groupedReport.filter((category) => category.category_type === 'expense');

  const getConceptPeriodMetrics = (conceptId) =>
    getMetricsForMonths(activeMonths, (month) => getConceptMonthMetrics(conceptId, month));

  const getCategoryPeriodMetrics = (category) =>
    category.concepts.reduce(
      (totals, concept) => {
        const metrics = getConceptPeriodMetrics(concept.concept_id);

        return {
          budget: totals.budget + metrics.budget,
          actual: totals.actual + metrics.actual,
          deviation: totals.deviation + metrics.deviation,
        };
      },
      { budget: 0, actual: 0, deviation: 0 }
    );

  const getCategoriesMetrics = (categories) =>
    categories.reduce(
      (totals, category) => {
        const metrics = getCategoryPeriodMetrics(category);

        return {
          budget: totals.budget + metrics.budget,
          actual: totals.actual + metrics.actual,
          deviation: totals.deviation + metrics.deviation,
        };
      },
      { budget: 0, actual: 0, deviation: 0 }
    );

  const incomeMetrics = getCategoriesMetrics(incomeCategories);
  const expenseMetrics = getCategoriesMetrics(expenseCategories);
  const availableValue = expenseMetrics.budget - expenseMetrics.actual;

  return (
    <div
      className="page-fill real-vs-budget-page"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto auto minmax(0, 1fr)',
        gap: 20,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        height: 'calc(100vh - 96px)',
        minHeight: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        className="responsive-card real-top-card"
        style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <header className="page-header">
          <h1>Variaciones</h1>
          <p>Analiza las diferencias entre lo presupuestado y lo real</p>
        </header>
        <div className="responsive-filter-bar real-view-toggle-row" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12, width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <button
            className="real-view-toggle-button"
            type="button"
            onClick={() => handleViewModeChange('monthly')}
            style={getToggleButtonStyle(theme, viewMode === 'monthly')}
          >
            Mensual
          </button>
          <button
            className="real-view-toggle-button"
            type="button"
            onClick={() => handleViewModeChange('annual')}
            style={getToggleButtonStyle(theme, viewMode === 'annual')}
          >
            Acumulado
          </button>
        </div>

        <div className={`responsive-filter-bar real-filters-bar real-filters-${viewMode}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minHeight: 30, width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <label className="real-filter-label real-year-label" style={labelStyle}>Año</label>
          <input
            className="real-filter-control real-year-input"
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || currentYear)}
            style={getControlStyle(theme, 120)}
          />

          {viewMode === 'monthly' && (
            <>
              <label className="real-filter-label real-month-label" style={labelStyle}>Mes</label>
              <select
                className="real-filter-control real-month-input"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                style={getControlStyle(theme, 180)}
              >
                {monthOptions.map((monthName, index) => (
                  <option key={monthName} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>
            </>
          )}

          {viewMode === 'annual' && (
            <>
              {periodType === 'quarter' ? (
                <select
                  className="real-period-control real-quarter-control"
                  value={selectedQuarter ?? 1}
                  onChange={(event) => {
                    setPeriodType('quarter');
                    setSelectedQuarter(Number(event.target.value));
                    setSelectedSemester(null);
                  }}
                  style={getIntegratedSelectStyle(theme, true)}
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              ) : (
                <button
                  className="real-period-control real-quarter-control"
                  type="button"
                  onClick={() => handlePeriodTypeChange('quarter')}
                  style={getToggleButtonStyle(theme, false)}
                >
                  Trimestre
                </button>
              )}

              {periodType === 'semester' ? (
                <select
                  className="real-period-control real-semester-control"
                  value={selectedSemester ?? 1}
                  onChange={(event) => {
                    setPeriodType('semester');
                    setSelectedSemester(Number(event.target.value));
                    setSelectedQuarter(null);
                  }}
                  style={getIntegratedSelectStyle(theme, true)}
                >
                  <option value={1}>H1</option>
                  <option value={2}>H2</option>
                </select>
              ) : (
                <button
                  className="real-period-control real-semester-control"
                  type="button"
                  onClick={() => handlePeriodTypeChange('semester')}
                  style={getToggleButtonStyle(theme, false)}
                >
                  Semestre
                </button>
              )}

              <button
                className="real-period-control real-ytd-button"
                type="button"
                onClick={() => handlePeriodTypeChange('ytd')}
                style={getToggleButtonStyle(theme, periodType === 'ytd')}
              >
                Anual
              </button>

              {periodType === 'ytd' && (
                <>
                  <label className="real-filter-label real-until-label" style={labelStyle}>Hasta mes</label>
                  <select
                    className="real-period-control real-until-month-input"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(Number(event.target.value))}
                    style={getControlStyle(theme, 180)}
                  >
                    {monthOptions.map((monthName, index) => (
                      <option key={monthName} value={index + 1}>
                        {monthName}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      {!isLoading && (
        <div className="responsive-grid real-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <KpiGroup
            title="Flujo de Efectivo"
            icon="bx bx-transfer-alt"
            items={[
              { label: 'Ingresos', value: incomeMetrics.actual },
              { label: 'Gastos', value: expenseMetrics.actual },
              { label: 'Balance', value: incomeMetrics.actual - expenseMetrics.actual, highlightNegative: true },
            ]}
            theme={theme}
          />
          <KpiGroup
            title="Control de Presupuesto"
            icon="bx bx-wallet"
            items={[
              { label: 'Presupuesto', value: expenseMetrics.budget },
              { label: 'Gastos', value: expenseMetrics.actual },
              { label: 'Disponible', value: availableValue, highlightNegative: true },
            ]}
            theme={theme}
          />
        </div>
      )}

      <div
        className="responsive-card real-table-card"
        style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <p style={{ color: theme.textSecondary, margin: 0 }}>Cargando reporte...</p>
        ) : (
          <>
            <div className="real-mobile-detail-header" aria-hidden="true">
              <span>Concepto</span>
              <span>Presupuesto</span>
              <span>Real</span>
              <span>Variación</span>
            </div>
            <div
              className="table-scroll real-details-scroll"
              style={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                minHeight: 0,
                flex: 1,
                overflowX: 'auto',
                overflowY: 'auto',
                boxSizing: 'border-box',
                display: 'block',
              }}
            >
              <table className="real-details-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', minWidth: 700 }}>
                <colgroup>
                  <col className="real-concept-col" style={{ width: '40%' }} />
                  <col className="real-value-col" style={{ width: '20%' }} />
                  <col className="real-value-col" style={{ width: '20%' }} />
                  <col className="real-value-col" style={{ width: '20%' }} />
                </colgroup>
                <thead style={{ fontSize: 12, color: theme.textSecondary, borderBottom: `2px solid ${theme.border}` }}>
                  <tr>
                    <th className="real-detail-cell real-detail-heading" style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>
                      <span className="real-label-desktop">Categoría / Concepto</span>
                      <span className="real-label-mobile">Concepto</span>
                    </th>
                    <th className="real-detail-cell real-detail-heading" style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>
                      <span className="real-label-desktop">Presupuesto</span>
                      <span className="real-label-mobile">Presupuesto</span>
                    </th>
                    <th className="real-detail-cell real-detail-heading" style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>Real</th>
                    <th className="real-detail-cell real-detail-heading" style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>
                      <span className="real-label-desktop">Desviación</span>
                      <span className="real-label-mobile">Variación</span>
                    </th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: 10, color: theme.textBody }}>
                  {groupedReport.map((category) => (
                    <CategoryRows
                      key={category.category_id}
                      category={category}
                      getCategoryPeriodMetrics={getCategoryPeriodMetrics}
                      getConceptPeriodMetrics={getConceptPeriodMetrics}
                      theme={theme}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getTableCellStyle(textAlign = 'center', isHeader = false) {
  return {
    textAlign,
    padding: '0px 8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: isHeader ? 'bold' : 'normal',
  };
}

function getStickyHeaderCellStyle(theme) {
  return {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: theme.surface,
  };
}

function getToggleButtonStyle(theme, isActive) {
  return {
    height: 40,
    padding: '0 16px',
    borderRadius: 14,
    border: `1px solid ${isActive ? 'transparent' : '#e2e8f0'}`,
    background: isActive ? '#11A9CC' : '#ffffff',
    color: isActive ? '#ffffff' : '#11A9CC',
    fontSize: 14,
    lineHeight: '40px',
    boxSizing: 'border-box',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: 'none',
    transition: 'transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
  };
}

function getControlStyle(theme, width) {
  return {
    width,
    height: 40,
    padding: '0 14px',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 500,
    lineHeight: '40px',
    boxSizing: 'border-box',
    boxShadow: 'none',
    transition: 'border-color 160ms ease, box-shadow 160ms ease, background 160ms ease',
  };
}

function getIntegratedSelectStyle(theme, isActive) {
  return {
    width: 120,
    height: 40,
    padding: '0 16px',
    borderRadius: 14,
    border: `1px solid ${isActive ? 'transparent' : '#e2e8f0'}`,
    background: isActive ? '#11A9CC' : '#ffffff',
    color: isActive ? '#ffffff' : '#11A9CC',
    fontSize: 14,
    lineHeight: '40px',
    boxSizing: 'border-box',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: 'none',
    transition: 'transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
  };
}

function KpiGroup({ title, icon, items, theme }) {
  return (
    <div
      className="responsive-card"
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
      }}
    >
      <div className="movements-card-title-row" style={{ marginBottom: 10 }}>
        <span className="movements-card-title-icon" aria-hidden="true">
          <i className={icon}></i>
        </span>
        <h2 style={{ ...typography.cardTitle, margin: 0 }}>
          {title}
        </h2>
      </div>
      <div style={{ display: 'grid', gap: 5 }}>
        {items.map((item) => {
          const isNegativeHighlight = item.highlightNegative && Number(item.value) < 0;

          return (
            <div
              key={item.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                padding: '0px 8px',
                borderRadius: 8,
                background: theme.surfaceMuted,
                fontSize: 12,
                border: `1px solid ${theme.border}`,
              }}
            >
              <span style={{ color: theme.textBody }}>{item.label}</span>
              <strong className={isNegativeHighlight ? 'financial-negative-value' : undefined} style={{ color: isNegativeHighlight ? undefined : theme.textPrimary }}>
                {formatCurrencyMXN(item.value)}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryRows({
  category,
  getCategoryPeriodMetrics,
  getConceptPeriodMetrics,
  theme,
}) {
  const categoryMetrics = getCategoryPeriodMetrics(category);

  return (
    <>
      <tr className="real-category-row" style={{ background: theme.surfaceMuted, borderTop: `1px solid ${theme.border}` }}>
        <td className="real-detail-cell real-concept-cell" style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: theme.textPrimary }} title={category.category}>
          {category.category}
        </td>
        <td className="real-detail-cell real-amount-cell" style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: theme.textPrimary }}>
          {formatCurrencyMXN(categoryMetrics.budget)}
        </td>
        <td className="real-detail-cell real-amount-cell" style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: theme.textPrimary }}>
          {formatCurrencyMXN(categoryMetrics.actual)}
        </td>
        <td
          className="real-detail-cell real-amount-cell"
          style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: getDeviationColor(categoryMetrics.deviation, theme.textPrimary) }}
        >
          {formatDeviationValue(categoryMetrics.deviation)}
        </td>
      </tr>

      {category.concepts.map((concept) => {
        const metrics = getConceptPeriodMetrics(concept.concept_id);

        return (
          <tr key={concept.concept_id} style={{ borderTop: `1px solid ${theme.border}` }}>
            <td className="real-detail-cell real-concept-cell" style={{ ...getTableCellStyle('center'), color: theme.textBody }} title={concept.concept}>
              <span style={{ display: 'inline-block', maxWidth: '100%' }}>{concept.concept}</span>
            </td>
            <td className="real-detail-cell real-amount-cell" style={{ ...getTableCellStyle('center'), color: theme.textBody }}>
              {formatCurrencyMXN(metrics.budget)}
            </td>
            <td className="real-detail-cell real-amount-cell" style={{ ...getTableCellStyle('center'), color: theme.textBody }}>
              {formatCurrencyMXN(metrics.actual)}
            </td>
            <td
              className="real-detail-cell real-amount-cell"
              style={{ ...getTableCellStyle('center'), color: getDeviationColor(metrics.deviation, theme.textBody) }}
            >
              {formatDeviationValue(metrics.deviation)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function getDeviationColor(value, fallbackColor) {
  if (value > 0) return '#10B981';
  if (value < 0) return '#EE1F28';
  return fallbackColor;
}

function formatDeviationValue(value) {
  return value === 0 ? 'Sin cambios.' : formatCurrencyMXN(value);
}

export default RealVsBudgetPage;
