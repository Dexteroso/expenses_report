import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatCurrencyMXN } from '../utils/formatters';
import { typography } from '../styles/typography';
import DateInput from './DateInput';

function ExpensesTable({ refreshExpenses, onEditExpense, selectedExpense }) {
    const theme = lightTheme;
    const filterLabelStyle = {
        display: 'block',
        color: theme.textBody,
        fontSize: 12,
    };
    const filterInputStyle = {
        padding: '4px 10px',
        borderRadius: 8,
        border: `1px solid ${theme.inputBorder}`,
        background: theme.inputBackground,
        color: theme.inputText,
        fontSize: 12,
    };
    const filterButtonStyle = {
        padding: '5px 14px',
        borderRadius: 8,
        border: 'none',
        background: theme.textPrimary,
        color: theme.sidebarText,
        fontSize: 12,
        cursor: 'pointer',
    };
    const headerCellStyle = {
        padding: '8px 6px',
        textAlign: 'center',
        fontWeight: 'bold',
    };
    const bodyCellStyle = {
        padding: '0px 6px',
        textAlign: 'center',
        verticalAlign: 'middle',
    };
    const compactCellStyle = {
        ...bodyCellStyle,
        whiteSpace: 'nowrap',
    };
    const truncatedCellStyle = {
        ...bodyCellStyle,
        maxWidth: '150px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({
        startDate: '',
        endDate: '',
        categoryId: '',
        defaultLimited: true,
    });

    const fetchExpenses = (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.start_date) {
            params.append('start_date', filters.start_date);
        }

        if (filters.end_date) {
            params.append('end_date', filters.end_date);
        }

        if (filters.category_id) {
            params.append('category_id', filters.category_id);
        }

        if (filters.limit) {
            params.append('limit', filters.limit);
        }

        authFetch(`${API_BASE_URL}/api/expenses?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => setExpenses(data))
            .catch((error) => console.error('Error fetching expenses:', error));
    };

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/categories`)
            .then((response) => response.json())
            .then((data) => setCategories(data))
            .catch((error) => console.error('Error fetching categories:', error));
    }, []);

    useEffect(() => {
        if (appliedFilters.defaultLimited) {
            fetchExpenses({ limit: 5 });
            return;
        }

        fetchExpenses({
            start_date: appliedFilters.startDate,
            end_date: appliedFilters.endDate,
            category_id: appliedFilters.categoryId,
        });
    }, [refreshExpenses]);

    const handleSearch = () => {
        setAppliedFilters({
            startDate,
            endDate,
            categoryId,
            defaultLimited: false,
        });
        fetchExpenses({
            start_date: startDate,
            end_date: endDate,
            category_id: categoryId,
        });
    };

    const handleClear = () => {
        setStartDate('');
        setEndDate('');
        setCategoryId('');
        setAppliedFilters({
            startDate: '',
            endDate: '',
            categoryId: '',
            defaultLimited: true,
        });
        fetchExpenses({ limit: 5 });
    };

    const areFiltersDirty =
        startDate !== appliedFilters.startDate ||
        endDate !== appliedFilters.endDate ||
        categoryId !== appliedFilters.categoryId;
    const hasAppliedSearchFilters = Boolean(
        appliedFilters.startDate ||
        appliedFilters.endDate ||
        appliedFilters.categoryId
    );
    const isSearchDisabled = !areFiltersDirty;
    const isClearDisabled = !areFiltersDirty && !hasAppliedSearchFilters;
    const isExportDisabled = areFiltersDirty || expenses.length === 0;
    const getActionButtonStyle = (isDisabled) => ({
        ...filterButtonStyle,
        border: isDisabled ? `1px solid ${theme.border}` : filterButtonStyle.border,
        background: isDisabled ? theme.inputDisabledBackground : filterButtonStyle.background,
        color: isDisabled ? theme.textSecondary : filterButtonStyle.color,
        cursor: isDisabled ? 'not-allowed' : filterButtonStyle.cursor,
    });

    const totalIngresos = expenses
        .filter((expense) => expense.tipo === 'Ingreso')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const totalEgresos = expenses
        .filter((expense) => expense.tipo === 'Egreso')
        .reduce((sum, expense) => sum + Number(expense.amount), 0);

    const totalPeriodo = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const getMonthLabel = (dateString) => {
        const monthIndex = Number(dateString.split('-')[1]) - 1;

        return monthLabels[monthIndex] || '';
    };

    const getReadableDate = (dateString) => {
        if (!dateString) return '';

        const [year, month, day] = dateString.split('-').map(Number);
        const monthNames = [
            'enero',
            'febrero',
            'marzo',
            'abril',
            'mayo',
            'junio',
            'julio',
            'agosto',
            'septiembre',
            'octubre',
            'noviembre',
            'diciembre',
        ];

        if (!year || !month || !day) return dateString;

        return `${day} ${monthNames[month - 1]} ${year}`;
    };

    const getCreditCardPeriod = (expense) => {
        if (expense.account_type !== 'Crédito' || !expense.billing_cycle_end_day || !expense.date) {
            return '';
        }

        const [, month, day] = expense.date.split('-').map(Number);
        const cutoffDay = Number(expense.billing_cycle_end_day);

        if (!cutoffDay) {
            return '';
        }

        if (day <= cutoffDay) {
            const previousMonthIndex = month === 1 ? 11 : month - 2;
            const currentMonthIndex = month - 1;

            return `${monthLabels[previousMonthIndex]}-${monthLabels[currentMonthIndex]}`;
        }

        const currentMonthIndex = month - 1;
        const nextMonthIndex = month === 12 ? 0 : month;

        return `${monthLabels[currentMonthIndex]}-${monthLabels[nextMonthIndex]}`;
    };

    const escapeCsvValue = (value) => {
        const stringValue = value ?? '';
        const normalizedValue = String(stringValue).replaceAll('"', '""');

        return `"${normalizedValue}"`;
    };

    const handleExportCsv = () => {
        if (expenses.length === 0) {
            window.alert('No hay datos para exportar');
            return;
        }

        const header = [
            'ID',
            'Fecha',
            'Año',
            'Mes',
            'Tipo',
            'Categoría',
            'Concepto',
            'Descripción',
            'Cantidad',
            'Cuenta',
            'Tipo de cuenta',
            'Periodo de tarjeta',
        ];

        const rows = expenses.map((expense) => {
            const [expenseYear] = expense.date.split('-');

            return [
                expense.expense_code,
                expense.date,
                expenseYear,
                getMonthLabel(expense.date),
                expense.tipo,
                expense.category,
                expense.concept,
                expense.description || '',
                Number(expense.amount),
                expense.account_alias || '',
                expense.account_type || '',
                getCreditCardPeriod(expense),
            ];
        });

        const csvContent = [header, ...rows]
            .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
            .join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], {
            type: 'text/csv;charset=utf-8;',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dates = expenses.map((expense) => expense.date).sort();
        const filename = startDate || endDate || categoryId
            ? `expenses_${dates[0]}_to_${dates[dates.length - 1]}.csv`
            : 'expenses_all.csv';

        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className="responsive-card expenses-table-card"
            style={{
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: theme.shadow,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
            }}
        >
            <h2 style={{ ...typography.sectionTitle, marginTop: 10, marginBottom: 10 }}>
                Resumen de movimientos
            </h2>

            <div
                className="responsive-filter-bar expenses-filter-bar"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 5,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    marginBottom: 10,
                }}
            >
                <div className="expenses-filter-field expenses-filter-field-start">
                    <label style={filterLabelStyle}>
                        Inicio
                    </label>
                    <DateInput
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Inicio"
                        style={filterInputStyle}
                    />
                </div>

                <div className="expenses-filter-field expenses-filter-field-end">
                    <label style={filterLabelStyle}>
                        Fin
                    </label>
                    <DateInput
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="Fin"
                        style={filterInputStyle}
                        align="right"
                    />
                </div>

                <div className="expenses-filter-field expenses-filter-field-category">
                    <label style={filterLabelStyle}>
                        Categoría
                    </label>
                    <select
                        className="expenses-category-select"
                        value={categoryId}
                        onChange={(event) => setCategoryId(event.target.value)}
                        style={filterInputStyle}
                    >
                        <option value="">Todas</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="expenses-filter-actions" style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isSearchDisabled}
                        style={getActionButtonStyle(isSearchDisabled)}
                    >
                        Buscar
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={isClearDisabled}
                        style={getActionButtonStyle(isClearDisabled)}
                    >
                        Limpiar
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={isExportDisabled}
                        style={getActionButtonStyle(isExportDisabled)}
                    >
                        Exportar
                    </button>
                </div>
            </div>

            <div
                className="table-scroll expenses-summary-strip"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: theme.surfaceMuted,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '12px',
                    padding: '5px',
                    marginBottom: 16,
                }}
            >
                <p style={{ margin: '0', color: theme.textPrimary, fontWeight: 'bold', fontSize: 12 }}>
                    Se encontraron {expenses.length} movimientos
                </p>

                {expenses.length === 0 ? (
                    <>
                        <p style={{ margin: '0', color: theme.textSecondary, fontSize: 12 }}>
                            No hay movimientos para los filtros seleccionados
                        </p>
                        <p style={{ margin: 0, color: theme.textBody, fontWeight: 'bold', fontSize: 12 }}>
                            Total: $0.00
                        </p>
                    </>
                ) : categoryId ? (
                    <p style={{ margin: 0, color: theme.textBody, fontWeight: 'bold', fontSize: 12 }}>
                        Total del periodo: {formatCurrencyMXN(totalPeriodo)}
                    </p>
                ) : (
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, color: theme.textBody, fontWeight: 'bold', fontSize: 12 }}>
                            Total ingresos: {formatCurrencyMXN(totalIngresos)}
                        </p>
                        <p style={{ margin: 0, color: theme.textBody, fontWeight: 'bold', fontSize: 12 }}>
                            Total egresos: {formatCurrencyMXN(totalEgresos)}
                        </p>
                    </div>
                )}
            </div>

            <div
                className="expenses-table-scroll"
                style={{
                    width: '100%',
                    maxWidth: '100%',
                    overflowX: 'auto',
                    boxSizing: 'border-box',
                }}
            >
                <table style={{ width: '100%', minWidth: '700px', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                    <colgroup>
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '17%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '8%' }} />
                    </colgroup>
                    <thead style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', borderBottom: `2px solid ${theme.border}` }}>
                        <tr>
                            <th style={headerCellStyle}>ID</th>
                            <th style={headerCellStyle}>Fecha</th>
                            <th style={headerCellStyle}>Tipo</th>
                            <th style={headerCellStyle}>Categoría</th>
                            <th style={headerCellStyle}>Concepto</th>
                            <th style={headerCellStyle}>Descripción</th>
                            <th style={headerCellStyle}>Cuenta</th>
                            <th style={headerCellStyle}>Cantidad</th>
                            <th style={headerCellStyle}>Acciones</th>
                        </tr>
                    </thead>

                    <tbody style={{ fontSize: 10, color: theme.textBody }}>
                        {expenses.map((expense) => (
                            <tr
                                key={expense.expense_code}
                                style={{
                                    borderBottom: `1px solid ${theme.border}`,
                                    background: expense.id === selectedExpense?.id ? 'rgba(56, 79, 127, 0.08)' : 'transparent',
                                    transition: 'background 180ms ease',
                                }}
                            >
                                <td style={compactCellStyle}>{expense.expense_code}</td>
                                <td style={compactCellStyle}>{expense.date}</td>
                                <td
                                    style={{
                                        ...compactCellStyle,
                                        // color: expense.tipo === 'Ingreso' ? '#16a34a' : theme.textSecondary,
                                        fontWeight: 'normal'
                                    }}
                                >
                                    {expense.tipo}
                                </td>
                                <td style={truncatedCellStyle} title={expense.category}>{expense.category}</td>
                                <td style={truncatedCellStyle} title={expense.concept}>{expense.concept}</td>
                                <td style={truncatedCellStyle} title={expense.description}>{expense.description}</td>
                                <td style={compactCellStyle}>{expense.account_alias}</td>
                                <td style={{ ...compactCellStyle, textAlign: 'center', fontWeight: 'normal' }}>
                                    {formatCurrencyMXN(expense.amount)}
                                </td>
                                <td style={{ ...compactCellStyle, textAlign: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => onEditExpense(expense)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: 0,
                                            margin: '0 auto',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <i className="bx bx-edit-alt" style={{ color: theme.textSecondary }} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="expenses-mobile-list">
                {expenses.length === 0 ? (
                    <p className="expenses-mobile-empty">No hay movimientos para mostrar.</p>
                ) : (
                    expenses.map((expense) => (
                        <div
                            key={expense.expense_code}
                            className={`expenses-mobile-row ${expense.id === selectedExpense?.id ? 'is-selected' : ''}`}
                        >
                            <div className="expenses-mobile-header-row">
                                <div className="expenses-mobile-line expenses-mobile-line-primary">
                                    <span>{expense.tipo}</span>
                                    <span>{expense.expense_code}</span>
                                    <span>{getReadableDate(expense.date)}</span>
                                </div>

                                <button
                                    type="button"
                                    className="expenses-mobile-edit-button"
                                    onClick={() => onEditExpense(expense)}
                                    aria-label={`Editar movimiento ${expense.expense_code}`}
                                >
                                    <i className="bx bx-edit-alt" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="expenses-mobile-line expenses-mobile-line-detail">
                                {[expense.category, expense.concept, expense.description]
                                    .filter(Boolean)
                                    .map((item) => (
                                        <span key={item}>{item}</span>
                                    ))}
                            </div>

                            <div className="expenses-mobile-line expenses-mobile-line-amount">
                                <span>{expense.account_alias || 'Sin cuenta'}</span>
                                <strong>{formatCurrencyMXN(expense.amount)}</strong>
                            </div>

                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ExpensesTable;
