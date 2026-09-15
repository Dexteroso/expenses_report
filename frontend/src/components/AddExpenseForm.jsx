/* eslint-disable react-hooks/set-state-in-effect -- Form prefill/highlight effects intentionally synchronize local UI state. */
import { useEffect, useRef, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import CurrencyInput from './ui/CurrencyInput';
import DateInput from './DateInput';
import PrimaryButton from './ui/PrimaryButton';

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
        if (submittingRef.current) return;

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

        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const response = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                setValidationMessage(data.error || 'No se pudo guardar el movimiento.');
                return;
            }

            setFormData(initialForm);
            onFavoritePrefillClear?.();
            onExpenseCreated?.({ sourceFavoriteId: payload.source_favorite_id });
        } catch (error) {
            console.error('Error saving movement:', error);
            setValidationMessage('No se pudo guardar el movimiento. Intenta de nuevo.');
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }

    };

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
                <fieldset disabled={isSubmitting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
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
