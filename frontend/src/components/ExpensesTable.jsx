import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatCurrencyMXN } from '../utils/formatters';
import { typography } from '../styles/typography';
import DateInput from './DateInput';
import PrimaryButton from './ui/PrimaryButton';

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
    const headerCellStyle = {
        padding: '6px 6px',
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
    const [accounts, setAccounts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const pageSize = 5;
    const [appliedFilters, setAppliedFilters] = useState({
        searchQuery: '',
        typeFilter: '',
        startDate: '',
        endDate: '',
        categoryId: '',
        accountId: '',
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

        authFetch(`${API_BASE_URL}/api/accounts?includeSystem=true`)
            .then((response) => response.json())
            .then((data) => setAccounts(Array.isArray(data) ? data : []))
            .catch((error) => console.error('Error fetching accounts:', error));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters are intentionally applied only when refreshExpenses changes.
    }, [refreshExpenses]);

    const handleSearch = () => {
        setAppliedFilters({
            searchQuery,
            typeFilter,
            startDate,
            endDate,
            categoryId,
            accountId,
            defaultLimited: false,
        });
        setCurrentPage(1);
        fetchExpenses({
            start_date: startDate,
            end_date: endDate,
            category_id: categoryId,
        });
    };

    const handleClear = () => {
        setSearchQuery('');
        setTypeFilter('');
        setStartDate('');
        setEndDate('');
        setCategoryId('');
        setAccountId('');
        setAppliedFilters({
            searchQuery: '',
            typeFilter: '',
            startDate: '',
            endDate: '',
            categoryId: '',
            accountId: '',
            defaultLimited: true,
        });
        setCurrentPage(1);
        fetchExpenses({ limit: 5 });
    };

    const areFiltersDirty =
        searchQuery !== appliedFilters.searchQuery ||
        typeFilter !== appliedFilters.typeFilter ||
        startDate !== appliedFilters.startDate ||
        endDate !== appliedFilters.endDate ||
        categoryId !== appliedFilters.categoryId ||
        accountId !== appliedFilters.accountId;
    const hasAppliedSearchFilters = !appliedFilters.defaultLimited;
    const isSearchDisabled = !areFiltersDirty && !appliedFilters.defaultLimited;
    const isClearDisabled = !areFiltersDirty && !hasAppliedSearchFilters;
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const getExpenseType = (expense) => expense.type || (expense.tipo === 'Ingreso' ? 'income' : 'expense');

    const filteredExpenses = expenses.filter((expense) => {
        const normalizedSearch = appliedFilters.searchQuery.trim().toLowerCase();
        const matchesSearch = !normalizedSearch || [
            expense.expense_code,
            expense.category,
            expense.concept,
            expense.description,
            expense.account_alias,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch));
        const matchesType = !appliedFilters.typeFilter || getExpenseType(expense) === appliedFilters.typeFilter;
        const matchesAccount = !appliedFilters.accountId || String(expense.account_id) === String(appliedFilters.accountId);

        return matchesSearch && matchesType && matchesAccount;
    });

    const pageCount = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, pageCount);
    const paginatedExpenses = filteredExpenses.slice(
        (safeCurrentPage - 1) * pageSize,
        safeCurrentPage * pageSize
    );
    const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1)
        .filter((page) => (
            page === 1 ||
            page === pageCount ||
            Math.abs(page - safeCurrentPage) <= 1
        ));
    const isExportDisabled = appliedFilters.defaultLimited || areFiltersDirty || filteredExpenses.length === 0;

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
        if (filteredExpenses.length === 0) {
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

        const rows = filteredExpenses.map((expense) => {
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
        const dates = filteredExpenses.map((expense) => expense.date).sort();
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
            <div className="expenses-history-header">
                <div className="expenses-history-title-group">
                    <span className="expenses-history-title-icon" aria-hidden="true">
                        <i className="bx bx-receipt"></i>
                    </span>

                    <div>
                        <h2 style={{ ...typography.sectionTitle, margin: 0 }}>
                            Historial de movimientos
                        </h2>
                        <p>{filteredExpenses.length} movimientos encontrados</p>
                    </div>
                </div>
                <PrimaryButton
                    type="button"
                    variant="secondary"
                    className="expenses-export-button"
                    onClick={handleExportCsv}
                    disabled={isExportDisabled}
                    title={isExportDisabled ? 'Realiza una búsqueda para exportar resultados' : 'Exportar resultados'}
                >
                    <i className="bx bx-export" aria-hidden="true"></i>
                    <span>Exportar</span>
                </PrimaryButton>
            </div>

            <div
                className="responsive-filter-bar expenses-filter-bar expenses-filter-bar-primary"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 5,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    marginBottom: 10,
                }}
            >
                <div className="expenses-filter-primary-fields">
                    <div className="expenses-filter-field expenses-filter-field-search">
                        <label style={filterLabelStyle}>
                            Buscar
                        </label>
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Concepto, descripción, cuenta..."
                            style={filterInputStyle}
                        />
                    </div>

                </div>

                <div className="expenses-filter-actions expenses-filter-actions-primary" style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
                    <PrimaryButton
                        type="button"
                        variant="secondary"
                        className="expenses-more-filters-button"
                        onClick={() => setShowAdvancedFilters((prev) => !prev)}
                        aria-expanded={showAdvancedFilters}
                    >
                        <span>Filtros</span>
                        <i className={`bx ${showAdvancedFilters ? 'bx-chevron-up' : 'bx-chevron-down'}`} aria-hidden="true"></i>
                    </PrimaryButton>

                    <PrimaryButton
                        type="button"
                        variant="secondary"
                        onClick={handleClear}
                        disabled={isClearDisabled}
                    >
                        Limpiar
                    </PrimaryButton>

                    <PrimaryButton
                        type="button"
                        onClick={handleSearch}
                        disabled={isSearchDisabled}
                    >
                        Buscar
                    </PrimaryButton>
                </div>
            </div>

            {showAdvancedFilters && (
                <div
                    className="responsive-filter-bar expenses-filter-bar expenses-filter-bar-advanced"
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 5,
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        marginBottom: 10,
                    }}
                >
                    <div className="expenses-filter-field expenses-filter-field-type">
                        <label style={filterLabelStyle}>
                            Tipo
                        </label>
                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value)}
                            style={filterInputStyle}
                        >
                            <option value="">Todos</option>
                            <option value="income">Ingreso</option>
                            <option value="expense">Egreso</option>
                        </select>
                    </div>

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

                    <div className="expenses-filter-field expenses-filter-field-account">
                        <label style={filterLabelStyle}>
                            Pago
                        </label>
                        <select
                            value={accountId}
                            onChange={(event) => setAccountId(event.target.value)}
                            style={filterInputStyle}
                        >
                            <option value="">Todas</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.account_alias}
                                </option>
                            ))}
                        </select>
                    </div>

                </div>
            )}

            <div
                className="expenses-table-scroll"
                style={{
                    width: '100%',
                    maxWidth: '100%',
                    overflowX: 'auto',
                    boxSizing: 'border-box',
                }}
            >
                <table style={{ width: '100%', minWidth: '760px', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                    <colgroup>
                        <col style={{ width: '0%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '10%' }} />
                        {/* <col style={{ width: '7%' }} /> */}
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
                        {paginatedExpenses.map((expense) => (
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
                {filteredExpenses.length === 0 ? (
                    <p className="expenses-mobile-empty">No hay movimientos para mostrar.</p>
                ) : (
                    paginatedExpenses.map((expense) => (
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

            <div className="expenses-pagination" aria-label="Paginación de movimientos">
                <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                >
                    Anterior
                </button>
                {visiblePages.map((page, index) => (
                    <span className="expenses-pagination-item" key={page}>
                        {index > 0 && page - visiblePages[index - 1] > 1 && (
                            <span className="expenses-pagination-ellipsis">...</span>
                        )}
                        <button
                            type="button"
                            className={page === safeCurrentPage ? 'is-active' : ''}
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </button>
                    </span>
                ))}
                <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                    disabled={safeCurrentPage === pageCount}
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}

export default ExpensesTable;
