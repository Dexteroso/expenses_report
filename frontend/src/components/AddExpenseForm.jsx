/* eslint-disable react-hooks/set-state-in-effect -- Form prefill/highlight effects intentionally synchronize local UI state. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import CurrencyInput from './ui/CurrencyInput';
import DateInput from './DateInput';
import PrimaryButton from './ui/PrimaryButton';
import BudgetReassignmentPanel from './BudgetReassignmentPanel';
import { toCents } from '../utils/currencyInput';
import { formatCurrencyMXN } from '../utils/formatters';

function AddExpenseForm({
    selectedExpense,
    onExpenseCreated,
    onCancelEdit,
    onDeleteExpense,
    favoritePrefill,
    onFavoritePrefillClear,
    onboardingActive = false,
}) {
    const theme = lightTheme;

    const [categories, setCategories] = useState([]);
    const [concepts, setConcepts] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const initialForm = {
        date: '',
        type: 'expense',
        category_id: '',
        concept_id: '',
        description: '',
        amount: 0,
        account_id: '',
    };

    const [formData, setFormData] = useState(initialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const pendingRef = useRef(null);
    const [pendingConfirmation, setPendingConfirmation] = useState(null);
    const dialogRef = useRef(null);
    const hasPendingConfirmation = Boolean(pendingConfirmation);
    const [dialogView, setDialogView] = useState('warning');
    const [discovery, setDiscovery] = useState(null);
    const [selections, setSelections] = useState({});
    const [loadingSources, setLoadingSources] = useState(false);
    const [outcomeUnknown, setOutcomeUnknown] = useState(false);
    const sourceRequestRef = useRef(0);
    const reassignmentButtonRef = useRef(null);
    const previousViewRef = useRef('warning');

    useEffect(() => {
        if (dialogView === 'reassignment') dialogRef.current?.querySelector('#budget-reassignment-title')?.focus();
        else if (hasPendingConfirmation && previousViewRef.current === 'reassignment') reassignmentButtonRef.current?.focus();
        previousViewRef.current = dialogView;
    }, [dialogView, hasPendingConfirmation]);

    useLayoutEffect(() => {
        if (!hasPendingConfirmation) return;
        const dialog = dialogRef.current;
        const content = dialog.closest('.app-content');
        const previousFocus = document.activeElement;
        const position = () => {
            const bounds = content?.getBoundingClientRect();
            const left = Math.max(0, bounds?.left ?? 0);
            const right = Math.max(0, bounds ? window.innerWidth - bounds.right : 0);
            dialog.style.setProperty('--frequent-content-left', `${left}px`);
            dialog.style.setProperty('--frequent-content-right', `${right}px`);
            dialog.style.setProperty('--frequent-content-width', `${window.innerWidth - left - right}px`);
        };
        position();
        const observer = content ? new ResizeObserver(position) : null;
        if (content) observer.observe(content);
        window.addEventListener('resize', position);
        dialog.showModal();
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', position);
            dialog.close();
            previousFocus?.focus();
        };
    }, [hasPendingConfirmation]);
    const [validationMessage, setValidationMessage] = useState('');
    const [isFormHighlightActive, setIsFormHighlightActive] = useState(false);
    const [contextMessage, setContextMessage] = useState('');
    const cardRef = useRef(null);
    const amountInputRef = useRef(null);
    const contextMessageTimerRef = useRef(null);
    const highlightTimerRef = useRef(null);
    const fieldStyle = {
        display: 'grid',
        gridTemplateColumns: '90px minmax(0, 1fr)',
        alignItems: 'center',
        gap: 5,
    };
    const labelStyle = {
        color: theme.textBody,
        fontSize: 12,
        fontWeight: 'bold',
    };
    const inputStyle = {
        width: '100%',
        padding: '5px 10px',
        borderRadius: 8,
        border: `1px solid ${theme.inputBorder}`,
        background: theme.inputBackground,
        color: theme.inputText,
        fontWeight: 'normal',
        fontSize: 12,
        boxSizing: 'border-box',
    };
    const isExpenseValid = Boolean(
        formData.date &&
        formData.type &&
        formData.category_id &&
        formData.concept_id &&
        formData.amount &&
        formData.account_id &&
        formData.amount > 0
    );
    const hasClearableFormValues = Object.keys(initialForm).some(
        (field) => field !== 'type' && String(formData[field] ?? '') !== String(initialForm[field] ?? '')
    );
    const shouldHighlightClear = Boolean(selectedExpense || favoritePrefill || hasClearableFormValues);
    const isCashAccount = (account) => (
        account?.account_type === 'cash' ||
        String(account?.account_alias || '').toLowerCase() === 'efectivo' ||
        String(account?.bank_name || '').toLowerCase() === 'efectivo'
    );
    const accountOptions = accounts.reduce((options, account) => {
        if (isCashAccount(account)) {
            if (!options.some(isCashAccount)) {
                return [{ ...account, account_alias: 'Efectivo' }, ...options];
            }
            return options;
        }

        return [...options, account];
    }, []);
    const isCardHighlighted = isFormHighlightActive;

    const showFormContextFeedback = (message) => {
        if (contextMessageTimerRef.current) {
            clearTimeout(contextMessageTimerRef.current);
        }
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
        }

        setContextMessage(message);
        setIsFormHighlightActive(true);

        requestAnimationFrame(() => {
            cardRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });

        window.setTimeout(() => {
            amountInputRef.current?.focus();
            amountInputRef.current?.select();
        }, 250);

        highlightTimerRef.current = window.setTimeout(() => {
            setIsFormHighlightActive(false);
        }, 1800);

        contextMessageTimerRef.current = window.setTimeout(() => {
            setContextMessage('');
        }, 2800);
    };

    const clearFormState = () => {
        setFormData(initialForm);
        setValidationMessage('');
        setContextMessage('');
        setIsFormHighlightActive(false);

        if (contextMessageTimerRef.current) {
            clearTimeout(contextMessageTimerRef.current);
            contextMessageTimerRef.current = null;
        }
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = null;
        }
    };

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/categories`)
            .then((response) => response.json())
            .then((data) => setCategories(data));

        authFetch(`${API_BASE_URL}/api/accounts?includeSystem=true`)
            .then((response) => response.json())
            .then((data) => setAccounts(data));
    }, []);

    useEffect(() => {
        // Options belong to the category, not to an individual template prefill.
        setConcepts([]);
        if (!formData.category_id) return;
        let active = true;

        fetch(`${API_BASE_URL}/api/concepts?category_id=${formData.category_id}`)
            .then((response) => response.json())
            .then((data) => { if (active) setConcepts(data); })
            .catch((error) => { if (active) console.error('Error fetching concepts:', error); });
        return () => { active = false; };
    }, [formData.category_id]);

    useEffect(() => {
        if (!selectedExpense) {
            setFormData(initialForm);
            return;
        }

        setFormData({
            date: selectedExpense.date,
            type: selectedExpense.type,
            category_id: selectedExpense.category_id,
            concept_id: selectedExpense.concept_id,
            description: selectedExpense.description || '',
            amount: Number(selectedExpense.amount) || 0,
            account_id: selectedExpense.account_id || '',
        });

        showFormContextFeedback(`Editando movimiento ${selectedExpense.expense_code || ''}`.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialForm identity is intentionally excluded to preserve current reset behavior.
    }, [selectedExpense]);

    useEffect(() => {
        if (!favoritePrefill) return;

        setFormData({
            date: favoritePrefill.date || '',
            type: favoritePrefill.type || 'expense',
            category_id: favoritePrefill.category_id || '',
            concept_id: favoritePrefill.concept_id || '',
            description: favoritePrefill.description || '',
            amount: Number(favoritePrefill.amount) || 0,
            account_id: favoritePrefill.account_id || '',
        });
        setValidationMessage('');
        showFormContextFeedback(`Frecuente “${favoritePrefill.alias || 'frecuente'}” cargado`);
    }, [favoritePrefill]);

    useEffect(() => {
        if (!onboardingActive) return;

        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
        }

        setIsFormHighlightActive(true);

        requestAnimationFrame(() => {
            cardRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });

        window.setTimeout(() => {
            amountInputRef.current?.focus();
        }, 300);
    }, [onboardingActive]);

    useEffect(() => () => {
        if (contextMessageTimerRef.current) {
            clearTimeout(contextMessageTimerRef.current);
        }
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
        }
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
            ...(name === 'category_id' && String(previous.category_id) !== String(value)
                ? { concept_id: '' } : {}),
            ...(name === 'type' && previous.type !== value
                ? { category_id: '', concept_id: '' } : {}),
        }));

        if (validationMessage) {
            setValidationMessage('');
        }
    };

    const handleClearForm = () => {
        clearFormState();

        if (onCancelEdit) {
            onCancelEdit();
        }

        if (onFavoritePrefillClear) {
            onFavoritePrefillClear();
        }

    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submittingRef.current || pendingRef.current) return;

        if (
            !formData.date ||
            !formData.type ||
            !formData.category_id ||
            !formData.concept_id ||
            !formData.amount ||
            !formData.account_id
        ) {
            setValidationMessage('Completa los campos obligatorios.');
            return;
        }

        if (formData.amount <= 0) {
            setValidationMessage('La cantidad debe ser mayor a 0.');
            return;
        }

        setValidationMessage('');

        const payload = {
            ...formData,
            amount: formData.amount,
            account_id: formData.account_id || null,
            ...(!selectedExpense && favoritePrefill?.id
                ? { source_favorite_id: favoritePrefill.id }
                : {}),
        };

        const url = selectedExpense
            ? `${API_BASE_URL}/api/expenses/${selectedExpense.id}`
            : `${API_BASE_URL}/api/expenses`;

        const method = selectedExpense ? 'PUT' : 'POST';

        await saveMovement(Object.freeze(payload), url, method);
    };

    const cancelBudgetConfirmation = () => {
        if (submittingRef.current) return;
        pendingRef.current = null;
        setPendingConfirmation(null);
        setValidationMessage('');
        resetReassignment();
    };

    const resetReassignment = () => {
        sourceRequestRef.current++;
        setDialogView('warning');
        setDiscovery(null);
        setSelections({});
        setLoadingSources(false);
        setOutcomeUnknown(false);
    };

    const loadSources = async () => {
        const pending = pendingRef.current;
        if (!pending) return;
        const requestId = ++sourceRequestRef.current;
        setLoadingSources(true);
        setValidationMessage('');
        try {
            const params = new URLSearchParams({ date: pending.payload.date, concept_id: pending.payload.concept_id, amount: pending.payload.amount });
            if (pending.method === 'PUT') params.set('expense_id', pending.url.split('/').pop());
            const response = await authFetch(`${API_BASE_URL}/api/budgets/reassignment-sources?${params}`);
            const data = await response.json();
            if (requestId !== sourceRequestRef.current || pending !== pendingRef.current) return;
            if (!response.ok) throw new Error(data.error || 'No se pudieron consultar las fuentes.');
            setDiscovery(data);
        } catch (error) {
            if (requestId === sourceRequestRef.current) setValidationMessage(error.message || 'No se pudieron consultar las fuentes.');
        } finally {
            if (requestId === sourceRequestRef.current) setLoadingSources(false);
        }
    };

    const openReassignment = () => {
        setDialogView('reassignment');
        if (!discovery && !loadingSources) loadSources();
    };

    const confirmReassignment = () => {
        const pending = pendingRef.current;
        if (!pending || submittingRef.current || loadingSources || outcomeUnknown || !discovery) return;
        const available = new Map(discovery.categories.flatMap((group) => group.concepts).map((row) => [row.conceptId, toCents(row.available)]));
        const entries = Object.entries(selections).filter(([, amount]) => toCents(amount) > 0);
        if (entries.reduce((sum, [, amount]) => sum + toCents(amount), 0) > toCents(discovery.destination.requiredAmount)) return;
        if (!entries.length || entries.some(([id, amount]) => toCents(amount) > (available.get(Number(id)) || 0))) return;
        const sources = entries.map(([id, amount]) => ({ concept_id: Number(id), amount: (toCents(amount) / 100).toFixed(2) }));
        saveMovement({ ...pending.payload, budget_confirmation: true, budget_reassignment: { sources } }, pending.url, pending.method);
    };

    const saveMovement = async (payload, url, method) => {
        if (submittingRef.current || outcomeUnknown) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        setValidationMessage('');
        try {
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!payload.budget_confirmation && response.status === 409 &&
                ['BUDGET_CONFIRMATION_REQUIRED', 'BUDGET_CHECK_UNAVAILABLE'].includes(data.code)) {
                const pending = { payload, url, method, impact: data.budgetImpact, error: data.error };
                pendingRef.current = pending;
                setPendingConfirmation(pending);
                return;
            }
            if (data.code === 'REASSIGNMENT_SOURCE_CHANGED' && data.discovery) {
                // Keep selected rows visible even if their refreshed balance is zero.
                const refreshed = data.discovery;
                const present = new Set(refreshed.categories.flatMap((group) => group.concepts).map((row) => row.conceptId));
                for (const group of discovery?.categories || []) {
                    for (const row of group.concepts) {
                        if (!present.has(row.conceptId) && toCents(selections[row.conceptId] || 0) > 0) {
                            let target = refreshed.categories.find((item) => item.categoryId === group.categoryId);
                            if (!target) { target = { ...group, available: '0.00', concepts: [] }; refreshed.categories.push(target); }
                            const conflict = data.conflicts?.find((item) => item.conceptId === row.conceptId);
                            target.concepts.push({ ...row, available: conflict?.available || '0.00' });
                        }
                    }
                }
                setDiscovery(refreshed);
            }
            if (!response.ok) {
                if (payload.budget_reassignment && response.status >= 500 && data.rolledBack !== true) {
                    setOutcomeUnknown(true);
                    setValidationMessage('No se pudo confirmar el resultado. Revisa Movimientos y Presupuesto antes de volver a intentar.');
                    return;
                }
                setValidationMessage(data.error || 'No se pudo guardar el movimiento.');
                return;
            }

            pendingRef.current = null;
            setPendingConfirmation(null);
            resetReassignment();
            setFormData(initialForm);
            onFavoritePrefillClear?.();
            onExpenseCreated?.({ sourceFavoriteId: payload.source_favorite_id });
        } catch (error) {
            console.error('Error saving movement:', error);
            if (payload.budget_reassignment) {
                setOutcomeUnknown(true);
                setValidationMessage('No se pudo confirmar el resultado. Revisa Movimientos y Presupuesto antes de volver a intentar.');
            } else setValidationMessage('No se pudo guardar el movimiento. Intenta de nuevo.');
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }

    };

    const impact = pendingConfirmation?.impact;
    const alreadyExceeded = impact?.status === 'ALREADY_EXCEEDED';

    return (
        <div
            ref={cardRef}
            className="responsive-card expense-form-card"
            style={{
                position: 'sticky',
                top: '16px',
                zIndex: 20,
                background: isCardHighlighted ? 'rgba(37, 99, 235, 0.04)' : theme.surface,
                border: isCardHighlighted ? '1px solid rgba(37, 99, 235, 0.35)' : `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: isCardHighlighted ? '0 10px 30px rgba(37, 99, 235, 0.12)' : theme.shadow,
                marginBottom: '20px',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
            }}
        >
            <div className="expense-form-header">
                <span className="movements-card-title-icon" aria-hidden="true">
                    <i className="bx bx-plus-circle"></i>
                </span>
                <h2>
                    {selectedExpense
                        ? `Editando: ${selectedExpense.expense_code}`
                        : 'Nuevo movimiento'}
                </h2>
            </div>

            <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
                <fieldset disabled={isSubmitting || hasPendingConfirmation} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <div className="expense-type-segment" role="group" aria-label="Tipo de movimiento">
                    <button
                        type="button"
                        className={formData.type === 'expense' ? 'is-active' : ''}
                        onClick={() => handleChange({ target: { name: 'type', value: 'expense' } })}
                    >
                        Egreso
                    </button>
                    <button
                        type="button"
                        className={formData.type === 'income' ? 'is-active' : ''}
                        onClick={() => handleChange({ target: { name: 'type', value: 'income' } })}
                    >
                        Ingreso
                    </button>
                </div>

                <div
                    className="expense-form-grid"
                    style={{
                        display: 'flex',
                        gap: 30,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                    }}
                >
                    <div className="responsive-field expense-field-date" style={fieldStyle}>
                            <label style={labelStyle}>Fecha</label>
                            <DateInput
                                name="date"
                                value={formData.date}
                                onChange={(value) => handleChange({ target: { name: 'date', value } })}
                                placeholder="Selecciona fecha"
                                required
                                style={inputStyle}
                            />
                    </div>

                    <div className="responsive-field expense-field-category" style={fieldStyle}>
                            <label style={labelStyle}>Categoría</label>
                            <select
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            >
                                <option value="">Elige categoría</option>
                                {categories
                                    .filter((category) => category.type === formData.type)
                                    .map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                            </select>
                    </div>

                    <div className="responsive-field expense-field-concept" style={fieldStyle}>
                            <label style={labelStyle}>Concepto</label>
                            <select
                                name="concept_id"
                                value={formData.concept_id}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            >
                                <option value="">Elige concepto</option>
                                {concepts.map((concept) => (
                                    <option key={concept.id} value={concept.id}>
                                        {concept.name}
                                    </option>
                                ))}
                            </select>
                    </div>

                    <div className="responsive-field expense-field-description" style={fieldStyle}>
                            <label style={labelStyle}>Descripción <span>(opcional)</span></label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="Súper, Amazon, etc."
                            />
                    </div>

                    <div className="responsive-field expense-field-amount" style={fieldStyle}>
                            <label style={labelStyle}>Cantidad</label>
                            <CurrencyInput
                                name="amount"
                                ref={amountInputRef}
                                value={formData.amount}
                                onValueChange={(amount) => {
                                    setFormData((prev) => ({ ...prev, amount }));
                                    setValidationMessage('');
                                }}
                                aria-label="Cantidad"
                                required
                                style={inputStyle}
                            />
                    </div>

                    <div className="responsive-field expense-field-account" style={fieldStyle}>
                            <label style={labelStyle}>Pago</label>
                            <select
                                name="account_id"
                                value={formData.account_id}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            >
                                <option value="">Método de pago</option>
                                {accountOptions.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {isCashAccount(account) ? 'Efectivo' : account.account_alias}
                                    </option>
                                    ))}
                            </select>
                    </div>
                </div>

                <div
                    className={`form-actions ${selectedExpense ? 'expense-edit-actions' : ''}`}
                    style={{
                        display: 'flex',
                        gap: 10,
                        marginTop: 12,
                    }}
                >
                    {selectedExpense && (
                        <PrimaryButton
                            type="button"
                            variant="danger"
                            onClick={() => onDeleteExpense(selectedExpense)}
                        >
                            Eliminar
                        </PrimaryButton>
                    )}

                    {selectedExpense && (
                        <PrimaryButton
                            type="button"
                            variant="secondary"
                            onClick={onCancelEdit}
                        >
                            Cancelar
                        </PrimaryButton>
                    )}

                    {!selectedExpense && (
                        <PrimaryButton
                            type="button"
                            variant="secondary"
                            className={`clear-form-button ${shouldHighlightClear ? 'is-active' : ''}`}
                            onClick={handleClearForm}
                            disabled={!shouldHighlightClear}
                        >
                            Limpiar
                        </PrimaryButton>
                    )}

                    <PrimaryButton
                        type="submit"
                        disabled={isSubmitting || !isExpenseValid}
                    >
                        {selectedExpense ? 'Guardar' : 'Agregar'}
                    </PrimaryButton>
                </div>

                {validationMessage && (
                    <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>
                        {validationMessage}
                    </p>
                )}

                </fieldset>
            </form>
            {pendingConfirmation && (
                <dialog ref={dialogRef} className={`budget-warning-dialog expense-delete-modal${dialogView === 'reassignment' ? ' is-reassignment' : ''}`}
                    aria-labelledby={dialogView === 'reassignment' ? 'budget-reassignment-title' : 'budget-warning-title'}
                    aria-describedby={dialogView === 'reassignment' ? (discovery ? 'budget-reassignment-summary' : undefined) : 'budget-warning-description budget-warning-impact'}
                    aria-busy={isSubmitting}
                    onCancel={(event) => { event.preventDefault(); cancelBudgetConfirmation(); }}>
                    {dialogView === 'reassignment' ? <BudgetReassignmentPanel
                        discovery={discovery} selections={selections} loading={loadingSources} busy={isSubmitting}
                        outcomeUnknown={outcomeUnknown} error={validationMessage}
                        onChange={(id, amount) => setSelections((previous) => ({ ...previous, [id]: amount }))}
                        onRetry={loadSources} onBack={() => { setDialogView('warning'); if (!outcomeUnknown) setValidationMessage(''); }}
                        onCancel={cancelBudgetConfirmation} onConfirm={confirmReassignment} /> : <>
                    <div className="expense-delete-icon" aria-hidden="true"><i className="bx bx-error-circle" /></div>
                    <h2 id="budget-warning-title" className="expense-delete-title">
                        {!impact ? 'No se pudo consultar el presupuesto' : alreadyExceeded ? 'Presupuesto excedido' : 'Presupuesto insuficiente'}
                    </h2>
                    <p id="budget-warning-description" className="expense-delete-question">
                        {!impact ? pendingConfirmation.error : alreadyExceeded
                            ? <>Ya has excedido el presupuesto de {impact.categoryName} · {impact.conceptName} en <strong className="financial-negative-value">{formatCurrencyMXN(impact.currentOverage)}</strong>.</>
                            : <>Tienes {formatCurrencyMXN(impact.available)} disponibles en {impact.categoryName} · {impact.conceptName}.</>}
                    </p>
                    <div id="budget-warning-impact" className="expense-delete-summary">
                        <p>Nuevo importe: <strong>{formatCurrencyMXN(impact?.newAmount ?? pendingConfirmation.payload.amount)}</strong></p>
                        {impact && <p>Excedente después del movimiento: <strong className="financial-negative-value">{formatCurrencyMXN(impact.projectedOverage)}</strong></p>}
                    </div>
                    {validationMessage && <p className="financial-negative-value" role="alert">{validationMessage}</p>}
                    <div className="budget-warning-actions">
                        <PrimaryButton variant="secondary" disabled={isSubmitting} onClick={cancelBudgetConfirmation}>Cancelar</PrimaryButton>
                        <PrimaryButton variant="secondary" disabled={isSubmitting || outcomeUnknown} onClick={() => {
                            const pending = pendingRef.current;
                            if (pending) saveMovement({ ...pending.payload, budget_confirmation: true }, pending.url, pending.method);
                        }}>{isSubmitting ? 'Guardando...' : 'Registrar de todos modos'}</PrimaryButton>
                        <PrimaryButton ref={reassignmentButtonRef} disabled={isSubmitting || outcomeUnknown} onClick={openReassignment}>Reasignar presupuesto</PrimaryButton>
                    </div>
                    </>}
                </dialog>
            )}
            {contextMessage && (
                <div className="expense-form-context-toast" role="status" aria-live="polite">
                    <i className={selectedExpense ? 'bx bx-edit-alt' : 'bx bx-check'}></i>
                    <span>{contextMessage}</span>
                </div>
            )}


        </div>
    );
}

export default AddExpenseForm;
