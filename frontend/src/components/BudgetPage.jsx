import { useEffect, useRef, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatCurrencyMXN, formatNumberForInput, parseCurrencyInput } from '../utils/formatters';
import { typography } from '../styles/typography';

const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
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
const firstColumnWidth = 180;
const monthColumnWidth = 100;
const annualColumnWidth = 120;
const budgetTableMinWidth = firstColumnWidth + (monthColumnWidth * 12) + annualColumnWidth;

function BudgetPage() {
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
  const sectionTitleStyle = {
    ...typography.sectionTitle,
    marginTop: 0,
    marginBottom: 0,
  };
  const labelStyle = {
    color: theme.textBody,
    fontSize: 12,
    fontWeight: 'bold',
  };
  const inputStyle = {
    width: 120,
    padding: '5px 10px',
    borderRadius: 8,
    border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBackground,
    color: theme.inputText,
    fontSize: 12,
    boxSizing: 'border-box',
  };
  const [year, setYear] = useState(2026);
  const [budgetRows, setBudgetRows] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [clearedZeroCells, setClearedZeroCells] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const summaryScrollRef = useRef(null);
  const detailScrollRef = useRef(null);
  const isSyncingScrollRef = useRef(false);

  const fetchBudgets = async (targetYear) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authFetch(`${API_BASE_URL}/api/budgets?year=${targetYear}`);

      if (!response.ok) {
        throw new Error('Error fetching budgets');
      }

      const data = await response.json();
      setBudgetRows(data);
      setPendingChanges({});
      setClearedZeroCells(new Set());
    } catch (fetchError) {
      console.error(fetchError);
      setError('No se pudo cargar el presupuesto.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets(year);
  }, [year]);

  const getCellKey = (conceptId, month) => `${conceptId}-${month}`;

  const getOriginalAmount = (conceptId, month) => {
    const row = budgetRows.find(
      (budgetRow) => budgetRow.concept_id === conceptId && budgetRow.month === month
    );

    return row ? Number(row.amount) : 0;
  };

  const getCellValue = (conceptId, month) => {
    const key = getCellKey(conceptId, month);

    if (Object.prototype.hasOwnProperty.call(pendingChanges, key)) {
      return pendingChanges[key];
    }

    if (clearedZeroCells.has(key)) {
      return '';
    }

    return formatNumberForInput(getOriginalAmount(conceptId, month));
  };

  const getNumericCellValue = (conceptId, month) => {
    return parseCurrencyInput(getCellValue(conceptId, month));
  };

  const handleCellChange = (conceptId, month, value) => {
    const key = getCellKey(conceptId, month);
    const originalAmount = getOriginalAmount(conceptId, month);
    const normalizedInput = String(value).replaceAll(',', '').replaceAll('$', '').trim();
    const normalizedValue = parseCurrencyInput(value);

    if (!normalizedInput && originalAmount === 0) {
      setClearedZeroCells((prev) => {
        if (prev.has(key)) return prev;

        const nextClearedCells = new Set(prev);
        nextClearedCells.add(key);
        return nextClearedCells;
      });
    }

    if (normalizedInput) {
      setClearedZeroCells((prev) => {
        if (!prev.has(key)) return prev;

        const nextClearedCells = new Set(prev);
        nextClearedCells.delete(key);
        return nextClearedCells;
      });
    }

    setPendingChanges((prev) => {
      const nextChanges = { ...prev };

      if (!normalizedInput || !Number.isFinite(normalizedValue) || normalizedValue === originalAmount) {
        delete nextChanges[key];
        return nextChanges;
      }

      nextChanges[key] = formatNumberForInput(normalizedInput);
      return nextChanges;
    });
  };

  const handleCellFocus = (conceptId, month) => {
    const key = getCellKey(conceptId, month);
    const currentValue = getCellValue(conceptId, month);

    if (String(currentValue).trim() !== '' && parseCurrencyInput(currentValue) === 0) {
      setClearedZeroCells((prev) => {
        if (prev.has(key)) return prev;

        const nextClearedCells = new Set(prev);
        nextClearedCells.add(key);
        return nextClearedCells;
      });
    }
  };

  const handleCellBlur = (conceptId, month) => {
    const key = getCellKey(conceptId, month);

    setClearedZeroCells((prev) => {
      if (!prev.has(key)) return prev;

      const nextClearedCells = new Set(prev);
      nextClearedCells.delete(key);
      return nextClearedCells;
    });
  };

  const syncBudgetScroll = (source) => {
    const sourceElement = source === 'summary' ? summaryScrollRef.current : detailScrollRef.current;
    const targetElement = source === 'summary' ? detailScrollRef.current : summaryScrollRef.current;

    if (!sourceElement || !targetElement || isSyncingScrollRef.current) {
      return;
    }

    isSyncingScrollRef.current = true;
    targetElement.scrollLeft = sourceElement.scrollLeft;

    window.requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const buildGroupedBudget = () => {
    const categoriesMap = new Map();

    budgetRows.forEach((row) => {
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

  const getConceptMonthlyTotals = (conceptId) =>
    monthLabels.map((_, monthIndex) => getNumericCellValue(conceptId, monthIndex + 1));

  const getConceptAnnualTotal = (conceptId) =>
    getConceptMonthlyTotals(conceptId).reduce((sum, amount) => sum + amount, 0);

  const getCategoryMonthlyTotals = (category) =>
    monthLabels.map((_, monthIndex) =>
      category.concepts.reduce(
        (sum, concept) => sum + getNumericCellValue(concept.concept_id, monthIndex + 1),
        0
      )
    );

  const getCategoryAnnualTotal = (category) =>
    getCategoryMonthlyTotals(category).reduce((sum, amount) => sum + amount, 0);

  const groupedBudget = buildGroupedBudget();
  const incomeSummaryByMonth = monthLabels.map((_, monthIndex) =>
    groupedBudget
      .filter((category) => category.category_type === 'income')
      .reduce(
        (sum, category) =>
          sum +
          category.concepts.reduce(
            (conceptSum, concept) =>
              conceptSum + getNumericCellValue(concept.concept_id, monthIndex + 1),
            0
          ),
        0
      )
  );
  const expenseSummaryByMonth = monthLabels.map((_, monthIndex) =>
    groupedBudget
      .filter((category) => category.category_type === 'expense')
      .reduce(
        (sum, category) =>
          sum +
          category.concepts.reduce(
            (conceptSum, concept) =>
              conceptSum + getNumericCellValue(concept.concept_id, monthIndex + 1),
            0
          ),
        0
      )
  );
  const balanceSummaryByMonth = monthLabels.map(
    (_, monthIndex) => incomeSummaryByMonth[monthIndex] - expenseSummaryByMonth[monthIndex]
  );
  const incomeAnnualTotal = incomeSummaryByMonth.reduce((sum, amount) => sum + amount, 0);
  const expenseAnnualTotal = expenseSummaryByMonth.reduce((sum, amount) => sum + amount, 0);
  const balanceAnnualTotal = balanceSummaryByMonth.reduce((sum, amount) => sum + amount, 0);
  const pendingChangesCount = Object.keys(pendingChanges).length;

  const handleSaveChanges = async () => {
    if (pendingChangesCount === 0) return;

    setIsSaving(true);
    setError('');

    const items = Object.entries(pendingChanges).map(([key, value]) => {
      const [conceptId, month] = key.split('-').map(Number);

      return {
        concept_id: conceptId,
        month,
        amount: value === '' ? 0 : parseCurrencyInput(value),
      };
    });

    try {
      const response = await authFetch(`${API_BASE_URL}/api/budgets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          items,
        }),
      });

      if (!response.ok) {
        throw new Error('Error saving budgets');
      }

      await fetchBudgets(year);
    } catch (saveError) {
      console.error(saveError);
      setError('No se pudieron guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="page-fill budget-page"
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
      <div className="responsive-card budget-top-card" style={cardStyle}>
        <h1 style={pageTitleStyle}>Presupuesto</h1>
        <div className="responsive-filter-bar budget-top-controls" style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          <div className="budget-year-and-pending" style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
            <div className="budget-year-control" style={{ display: 'grid', gap: 4 }}>
              <label style={labelStyle}>Año</label>
              <input
                type="number"
                value={year}
                onChange={(event) => setYear(Number(event.target.value) || 2026)}
                style={inputStyle}
              />
            </div>

            <span className="budget-pending-count" style={{ color: theme.textSecondary, fontSize: 12, paddingBottom: 6 }}>
              Cambios pendientes: {pendingChangesCount}
            </span>
          </div>

          <button
            className="budget-save-button"
            type="button"
            onClick={handleSaveChanges}
            disabled={pendingChangesCount === 0 || isSaving}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: pendingChangesCount === 0 || isSaving ? theme.inputDisabledBackground : theme.sidebarBackground,
              color: pendingChangesCount === 0 || isSaving ? theme.textSecondary : theme.sidebarText,
              fontSize: 14,
              fontWeight: 'bold',
              cursor: pendingChangesCount === 0 || isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {error && (
          <p style={{ color: '#b91c1c', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      <div className="responsive-card" style={cardStyle}>
        <h2 style={sectionTitleStyle}>Resumen anual</h2>

        {isLoading ? (
          <p style={{ color: theme.textSecondary, margin: 0 }}>Cargando presupuesto...</p>
        ) : (
          <div
            ref={summaryScrollRef}
            className="table-scroll budget-table-scroll"
            onScroll={() => syncBudgetScroll('summary')}
            style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto', overflowY: 'hidden', boxSizing: 'border-box', display: 'block' }}
          >
            <table className="budget-table" style={{ width: '100%', minWidth: budgetTableMinWidth, borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
              <BudgetTableColGroup />
              <thead style={{ fontSize: 12, color: theme.textSecondary }}>
                <tr>
                  <StickyHeaderCell align="center" sticky="left" theme={theme}>
                    Categoría / Concepto
                  </StickyHeaderCell>
                  {monthLabels.map((label) => (
                    <HeaderCell key={`summary-${label}`} align="center" theme={theme}>
                      {label}
                    </HeaderCell>
                  ))}
                  <StickyHeaderCell align="center" sticky="right" theme={theme}>
                    Total anual
                  </StickyHeaderCell>
                </tr>
              </thead>
              <tbody style={{ fontSize: 10, color: theme.textBody }}>
                <SummaryRow
                  label="Ingresos"
                  monthlyTotals={incomeSummaryByMonth}
                  annualTotal={incomeAnnualTotal}
                  theme={theme}
                  textColor={theme.textPrimary}
                />
                <SummaryRow
                  label="Egresos"
                  monthlyTotals={expenseSummaryByMonth}
                  annualTotal={expenseAnnualTotal}
                  theme={theme}
                  textColor={theme.textPrimary}
                />
                <SummaryRow
                  label="Balance"
                  monthlyTotals={balanceSummaryByMonth}
                  annualTotal={balanceAnnualTotal}
                  theme={theme}
                  textColor={theme.textPrimary}
                  highlightNegative
                />
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        className="responsive-card budget-detail-card"
        style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <h2 style={sectionTitleStyle}>Detalle por categoría</h2>

        {isLoading ? (
          <p style={{ color: theme.textSecondary, margin: 0 }}>Cargando presupuesto...</p>
        ) : (
          <>
            <div className="budget-mobile-detail-header" aria-hidden="true">
              <span>Categoría / Concepto</span>
              {monthLabels.map((label) => (
                <span key={`mobile-budget-header-${label}`}>{label}</span>
              ))}
              <span>Total anual</span>
            </div>
            <div
              className="table-scroll budget-table-scroll budget-detail-scroll"
              ref={detailScrollRef}
              onScroll={() => syncBudgetScroll('detail')}
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
              <table className="budget-table" style={{ width: '100%', minWidth: budgetTableMinWidth, borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                <BudgetTableColGroup />
                <thead style={{ fontSize: 12, color: theme.textSecondary }}>
                  <tr>
                    <StickyHeaderCell align="center" sticky="left" stickyTop theme={theme}>
                      Categoría / Concepto
                    </StickyHeaderCell>
                    {monthLabels.map((label) => (
                      <HeaderCell key={label} align="center" stickyTop theme={theme}>
                        {label}
                      </HeaderCell>
                    ))}
                    <StickyHeaderCell align="center" sticky="right" stickyTop theme={theme}>
                      Total anual
                    </StickyHeaderCell>
                  </tr>
                </thead>
                <tbody style={{ fontSize: 10, color: theme.textBody }}>
                  {groupedBudget.map((category) => {
                    const categoryMonthlyTotals = getCategoryMonthlyTotals(category);
                    const categoryAnnualTotal = getCategoryAnnualTotal(category);

                    return (
                      <FragmentRows
                        key={category.category_id}
                        category={category}
                        categoryMonthlyTotals={categoryMonthlyTotals}
                        categoryAnnualTotal={categoryAnnualTotal}
                        getCellValue={getCellValue}
                        getConceptAnnualTotal={getConceptAnnualTotal}
                        handleCellChange={handleCellChange}
                        handleCellFocus={handleCellFocus}
                        handleCellBlur={handleCellBlur}
                        theme={theme}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BudgetTableColGroup() {
  return (
    <colgroup>
      <col className="budget-first-col" style={{ width: firstColumnWidth }} />
      {monthLabels.map((label) => (
        <col className="budget-month-col" key={`col-${label}`} style={{ width: monthColumnWidth }} />
      ))}
      <col className="budget-annual-col" style={{ width: annualColumnWidth }} />
    </colgroup>
  );
}

function HeaderCell({ children, align, theme, stickyTop = false }) {
  return (
    <th
      className="budget-header-cell"
      style={{
        position: stickyTop ? 'sticky' : 'static',
        top: stickyTop ? 0 : 'auto',
        zIndex: stickyTop ? 2 : 'auto',
        padding: '0px 8px',
        textAlign: align,
        fontWeight: 'bold',
        background: theme.surface,
        borderBottom: `2px solid ${theme.border}`,
      }}
    >
      {children}
    </th>
  );
}

function StickyHeaderCell({ children, align, sticky, theme, stickyTop = false }) {
  return (
    <th
      className={`budget-header-cell budget-sticky-cell budget-sticky-${sticky}${stickyTop ? ' budget-sticky-top' : ''}`}
      style={{
        ...getStickyCellStyle(theme, sticky, stickyTop),
        padding: '0px 8px',
        textAlign: align,
        fontWeight: 'bold',
        background: theme.surface,
        borderBottom: `2px solid ${theme.border}`,
      }}
    >
      {children}
    </th>
  );
}

function StickySummaryCell({ children, align, sticky, theme, textColor, className = '' }) {
  return (
    <td
      className={`${sticky ? `budget-summary-cell budget-sticky-cell budget-sticky-${sticky}` : 'budget-summary-cell'}${className ? ` ${className}` : ''}`}
      style={{
        ...getStickyCellStyle(theme, sticky),
        padding: '0px 8px',
        textAlign: align,
        fontWeight: 'bold',
        color: textColor,
        background: theme.surfaceMuted,
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      {children}
    </td>
  );
}

function StickyBodyCell({ children, align, sticky, theme, bold = false }) {
  return (
    <td
      className={sticky ? `budget-body-cell budget-sticky-cell budget-sticky-${sticky}` : 'budget-body-cell'}
      style={{
        ...getStickyCellStyle(theme, sticky),
        padding: '0px 8px',
        textAlign: align,
        fontWeight: bold ? 'bold' : 'normal',
        color: theme.textBody,
        background: theme.surface,
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      {children}
    </td>
  );
}

function getStickyCellStyle(theme, sticky, isHeader = false) {
  if (sticky === 'left') {
    return {
      position: 'sticky',
      left: 0,
      top: isHeader ? 0 : 'auto',
      zIndex: isHeader ? 4 : 3,
      boxShadow: `1px 0 0 ${theme.border}`,
    };
  }

  if (sticky === 'right') {
    return {
      position: 'sticky',
      right: 0,
      top: isHeader ? 0 : 'auto',
      zIndex: isHeader ? 4 : 3,
      boxShadow: `-1px 0 0 ${theme.border}`,
    };
  }

  return {};
}

function SummaryRow({ label, monthlyTotals, annualTotal, theme, textColor, highlightNegative = false }) {
  const getValueClassName = (amount) => (
    highlightNegative && amount < 0 ? 'financial-negative-value' : ''
  );

  return (
    <tr>
      <StickySummaryCell
        align="center"
        sticky="left"
        theme={theme}
        textColor={textColor}
        className={getValueClassName(annualTotal)}
      >
        {label}
      </StickySummaryCell>
      {monthlyTotals.map((amount, index) => (
        <StickySummaryCell
          key={`${label}-${index + 1}`}
          align="center"
          theme={theme}
          textColor={textColor}
          className={getValueClassName(amount)}
        >
          {formatCurrencyMXN(amount)}
        </StickySummaryCell>
      ))}
      <StickySummaryCell
        align="center"
        sticky="right"
        theme={theme}
        textColor={textColor}
        className={getValueClassName(annualTotal)}
      >
        {formatCurrencyMXN(annualTotal)}
      </StickySummaryCell>
    </tr>
  );
}

function FragmentRows({
  category,
  categoryMonthlyTotals,
  categoryAnnualTotal,
  getCellValue,
  getConceptAnnualTotal,
  handleCellChange,
  handleCellFocus,
  handleCellBlur,
  theme,
}) {
  return (
    <>
      <tr>
        <StickySummaryCell align="center" sticky="left" theme={theme} textColor={theme.textPrimary}>
          {category.category}
        </StickySummaryCell>
        {categoryMonthlyTotals.map((amount, index) => (
          <StickySummaryCell
            key={`${category.category_id}-subtotal-${index + 1}`}
            align="center"
            theme={theme}
            textColor={theme.textPrimary}
          >
            {formatCurrencyMXN(amount)}
          </StickySummaryCell>
        ))}
        <StickySummaryCell align="center" sticky="right" theme={theme} textColor={theme.textPrimary}>
          {formatCurrencyMXN(categoryAnnualTotal)}
        </StickySummaryCell>
      </tr>

      {category.concepts.map((concept) => (
        <tr key={concept.concept_id}>
          <StickyBodyCell align="center" sticky="left" theme={theme}>
            <span>{concept.concept}</span>
          </StickyBodyCell>
          {monthLabels.map((_, monthIndex) => (
            <td
              className="budget-month-cell"
              key={`${concept.concept_id}-${monthIndex + 1}`}
              style={{
                padding: '4px',
                textAlign: 'center',
                background: theme.surface,
                borderTop: `1px solid ${theme.border}`,
              }}
            >
              <input
                className="budget-input"
                type="text"
                inputMode="decimal"
                value={getCellValue(concept.concept_id, monthIndex + 1)}
                onFocus={() => handleCellFocus(concept.concept_id, monthIndex + 1)}
                onChange={(event) =>
                  handleCellChange(concept.concept_id, monthIndex + 1, event.target.value)
                }
                onBlur={() => handleCellBlur(concept.concept_id, monthIndex + 1)}
                style={{
                  width: '100%',
                  minWidth: 84,
                  padding: '5px 8px',
                  textAlign: 'center',
                  borderRadius: 8,
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBackground,
                  color: theme.inputText,
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              />
            </td>
          ))}
          <StickyBodyCell align="center" sticky="right" theme={theme} bold>
            {formatCurrencyMXN(getConceptAnnualTotal(concept.concept_id))}
          </StickyBodyCell>
        </tr>
      ))}
    </>
  );
}

export default BudgetPage;
