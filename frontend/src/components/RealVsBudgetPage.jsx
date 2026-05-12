import { useEffect, useState } from 'react';
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
  const pageTitleStyle = {
    ...typography.pageTitle,
    marginTop: 10,
    marginBottom: 10,
  };
  const labelStyle = {
    color: theme.textBody,
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: '30px',
  };
  const [year, setYear] = useState(2026);
  const [viewMode, setViewMode] = useState('monthly');
  const [periodType, setPeriodType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(5);
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
        const response = await authFetch(`http://localhost:3000/api/reports/real-vs-budget?year=${year}`);

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

    setPeriodType('ytd');
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
        className="responsive-card"
        style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <h1 style={pageTitleStyle}>
          Variaciones
        </h1>

        <div className="responsive-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12, width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => handleViewModeChange('monthly')}
            style={getToggleButtonStyle(theme, viewMode === 'monthly')}
          >
            Vista mensual
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('annual')}
            style={getToggleButtonStyle(theme, viewMode === 'annual')}
          >
            Vista anual
          </button>
        </div>

        <div className="responsive-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minHeight: 30, width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <label style={labelStyle}>Año</label>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || 2026)}
            style={getControlStyle(theme, 120)}
          />

          {viewMode === 'monthly' && (
            <>
              <label style={labelStyle}>Mes</label>
              <select
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
                  type="button"
                  onClick={() => handlePeriodTypeChange('quarter')}
                  style={getToggleButtonStyle(theme, false)}
                >
                  Trimestre
                </button>
              )}

              {periodType === 'semester' ? (
                <select
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
                  type="button"
                  onClick={() => handlePeriodTypeChange('semester')}
                  style={getToggleButtonStyle(theme, false)}
                >
                  Semestre
                </button>
              )}

              <button
                type="button"
                onClick={() => handlePeriodTypeChange('ytd')}
                style={getToggleButtonStyle(theme, periodType === 'ytd')}
              >
                YTD
              </button>

              {periodType === 'ytd' && (
                <>
                  <label style={labelStyle}>Hasta mes</label>
                  <select
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
            items={[
              { label: 'Ingresos reales', value: incomeMetrics.actual },
              { label: 'Gastos reales', value: expenseMetrics.actual },
              { label: 'Balance real', value: incomeMetrics.actual - expenseMetrics.actual },
            ]}
            theme={theme}
          />
          <KpiGroup
            title="Control de Presupuesto"
            items={[
              { label: 'Presupuesto', value: expenseMetrics.budget },
              { label: 'Gastos', value: expenseMetrics.actual },
              { label: 'Disponible', value: availableValue },
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
          <div
            className="table-scroll"
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
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', minWidth: 700 }}>
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead style={{ fontSize: 12, color: theme.textSecondary, borderBottom: `2px solid ${theme.border}` }}>
                <tr>
                  <th style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>Categoría / Concepto</th>
                  <th style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>Presupuesto</th>
                  <th style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>Real</th>
                  <th style={{ ...getTableCellStyle('center', true), ...getStickyHeaderCellStyle(theme) }}>Desviación</th>
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
    height: 30,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${isActive ? theme.sidebarBackground : theme.border}`,
    background: isActive ? theme.sidebarBackground : theme.inputDisabledBackground,
    color: isActive ? theme.sidebarText : theme.textSecondary,
    fontSize: 14,
    lineHeight: '30px',
    boxSizing: 'border-box',
    // fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

function getControlStyle(theme, width) {
  return {
    width,
    height: 30,
    padding: '0 10px',
    borderRadius: 8,
    border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBackground,
    color: theme.inputText,
    fontSize: 12,
    lineHeight: '34px',
    boxSizing: 'border-box',
  };
}

function getIntegratedSelectStyle(theme, isActive) {
  return {
    width: 120,
    height: 30,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${isActive ? theme.sidebarBackground : theme.border}`,
    background: isActive ? theme.sidebarBackground : theme.inputDisabledBackground,
    color: isActive ? theme.sidebarText : theme.textSecondary,
    fontSize: 14,
    lineHeight: '34px',
    boxSizing: 'border-box',
    // fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

function KpiGroup({ title, items, theme }) {
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
      <h2 style={{ ...typography.cardTitle, marginTop: 0, marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ display: 'grid', gap: 5 }}>
        {items.map((item) => (
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
            <strong style={{ color: theme.textPrimary }}>{formatCurrencyMXN(item.value)}</strong>
          </div>
        ))}
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
      <tr style={{ background: theme.surfaceMuted, borderTop: `1px solid ${theme.border}` }}>
        <td style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: theme.textPrimary }} title={category.category}>
          {category.category}
        </td>
        <td style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: theme.textPrimary }}>
          {formatCurrencyMXN(categoryMetrics.budget)}
        </td>
        <td style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: theme.textPrimary }}>
          {formatCurrencyMXN(categoryMetrics.actual)}
        </td>
        <td style={{ ...getTableCellStyle('center'), fontWeight: 'bold', color: theme.textPrimary }}>
          {formatCurrencyMXN(categoryMetrics.deviation)}
        </td>
      </tr>

      {category.concepts.map((concept) => {
        const metrics = getConceptPeriodMetrics(concept.concept_id);

        return (
          <tr key={concept.concept_id} style={{ borderTop: `1px solid ${theme.border}` }}>
            <td style={{ ...getTableCellStyle('center'), color: theme.textBody }} title={concept.concept}>
              <span style={{ display: 'inline-block', maxWidth: '100%' }}>{concept.concept}</span>
            </td>
            <td style={{ ...getTableCellStyle('center'), color: theme.textBody }}>
              {formatCurrencyMXN(metrics.budget)}
            </td>
            <td style={{ ...getTableCellStyle('center'), color: theme.textBody }}>
              {formatCurrencyMXN(metrics.actual)}
            </td>
            <td style={{ ...getTableCellStyle('center'), color: theme.textBody }}>
              {formatCurrencyMXN(metrics.deviation)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

export default RealVsBudgetPage;
