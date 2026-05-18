import { useEffect, useRef, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatNumberForInput, parseCurrencyInput } from '../utils/formatters';
import { typography } from '../styles/typography';
import DateInput from './DateInput';

const favoriteEmojis = ['😎', '🛒', '🍕', '🥑', '🍎', '🍔', '⛽', '☕', '🍿', '🛍️', '🏠', '🐶', '🚕', '💊', '🎵', '💳'];
const favoriteColors = ['#ffffff', '#565294', '#9d9d9d', '#005496', '#2dafe6', '#23d2aa', '#ff7f43', '#f3f3f3', '#d9d2e9', '#f3f3f3', '#cfe2f3', '#d0e0e3', '#d9ead3', '#fce5cd'];

function AddExpenseForm({
    selectedExpense,
    onExpenseCreated,
    onCancelEdit,
    onDeleteExpense,
    favoriteMode = false,
    favoritePrefill,
    onFavoriteModeChange,
    onFavoriteSaved,
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
        amount: '',
        account_id: '',
    };

    const [formData, setFormData] = useState(initialForm);
    const [favoriteMeta, setFavoriteMeta] = useState({
        emoji: favoriteEmojis[0],
        alias: '',
        color: favoriteColors[0],
    });
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
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
    const buttonStyle = {
        padding: '5px 14px',
        borderRadius: 8,
        border: 'none',
        background: theme.textPrimary,
        color: theme.sidebarText,
        fontSize: 12,
        cursor: 'pointer',
    };
    const isFavoriteValid = Boolean(
        favoriteMeta.emoji &&
        favoriteMeta.alias.trim() &&
        favoriteMeta.color &&
        formData.type &&
        formData.category_id &&
        formData.concept_id &&
        formData.description.trim() &&
        formData.account_id
    );
    const isExpenseValid = Boolean(
        formData.date &&
        formData.type &&
        formData.category_id &&
        formData.concept_id &&
        formData.amount &&
        formData.account_id &&
        parseCurrencyInput(formData.amount) > 0
    );
    const isFormValid = favoriteMode ? isFavoriteValid : isExpenseValid;
    const hasClearableFormValues = Object.keys(initialForm).some(
        (field) => String(formData[field] ?? '') !== String(initialForm[field] ?? '')
    );
    const shouldHighlightClear = Boolean(selectedExpense || favoritePrefill || hasClearableFormValues);

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
        setConcepts([]);
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
        if (!formData.category_id) return;

        fetch(`${API_BASE_URL}/api/concepts?category_id=${formData.category_id}`)
            .then((response) => response.json())
            .then((data) => setConcepts(data));
    }, [formData.category_id]);

    useEffect(() => {
        if (!selectedExpense) {
            setFormData(initialForm);
            setConcepts([]);
            return;
        }

        setFormData({
            date: selectedExpense.date,
            type: selectedExpense.type,
            category_id: selectedExpense.category_id,
            concept_id: selectedExpense.concept_id,
            description: selectedExpense.description || '',
            amount: formatNumberForInput(selectedExpense.amount),
            account_id: selectedExpense.account_id || '',
        });

        showFormContextFeedback(`Editando movimiento ${selectedExpense.expense_code || ''}`.trim());
    }, [selectedExpense]);

    useEffect(() => {
        if (!favoritePrefill) return;

        setFormData({
            date: favoritePrefill.date || '',
            type: favoritePrefill.type || 'expense',
            category_id: favoritePrefill.category_id || '',
            concept_id: favoritePrefill.concept_id || '',
            description: favoritePrefill.description || '',
            amount: '',
            account_id: favoritePrefill.account_id || '',
        });
        setConcepts([]);
        setValidationMessage('');
        showFormContextFeedback(`Frecuente “${favoritePrefill.alias || 'frecuente'}” cargado`);
    }, [favoritePrefill]);

    useEffect(() => {
        if (!favoriteMode) return;

        setFormData((prev) => ({
            ...prev,
            date: '',
            amount: '',
        }));
        setValidationMessage('');
        setIsFormHighlightActive(false);
    }, [favoriteMode]);

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
        const nextValue = name === 'amount'
            ? value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
            : value;

        setFormData({
            ...formData,
            [name]: nextValue,
        });

        if (validationMessage) {
            setValidationMessage('');
        }
    };

    const handleFavoriteMetaChange = (field, value) => {
        setFavoriteMeta((prev) => ({
            ...prev,
            [field]: value,
        }));
        if (field === 'emoji') {
            setIsEmojiPickerOpen(false);
        }
        if (field === 'color') {
            setIsColorPickerOpen(false);
        }

        if (validationMessage) {
            setValidationMessage('');
        }
    };

    const handleCancelFavoriteMode = () => {
        setFavoriteMeta({
            emoji: favoriteEmojis[0],
            alias: '',
            color: favoriteColors[0],
        });
        setIsEmojiPickerOpen(false);
        setIsColorPickerOpen(false);
        setValidationMessage('');

        if (onFavoriteModeChange) {
            onFavoriteModeChange(false);
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

        if (favoriteMode) {
            if (!isFavoriteValid) {
                setValidationMessage('Completa los campos del movimiento frecuente.');
                return;
            }

            const response = await authFetch(`${API_BASE_URL}/api/favorite-movements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emoji: favoriteMeta.emoji,
                    alias: favoriteMeta.alias.trim(),
                    color: favoriteMeta.color,
                    type: formData.type,
                    category_id: formData.category_id,
                    concept_id: formData.concept_id,
                    description: formData.description.trim(),
                    account_id: formData.account_id,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setValidationMessage(data.error || 'No se pudo guardar el movimiento frecuente.');
                return;
            }

            setFormData(initialForm);
            setConcepts([]);
            setFavoriteMeta({
                emoji: favoriteEmojis[0],
                alias: '',
                color: favoriteColors[0],
            });
            setIsEmojiPickerOpen(false);
            setIsColorPickerOpen(false);
            setValidationMessage('');

            if (onFavoriteSaved) {
                onFavoriteSaved();
            }

            if (onFavoriteModeChange) {
                onFavoriteModeChange(false);
            }

            return;
        }

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

        if (parseCurrencyInput(formData.amount) <= 0) {
            setValidationMessage('La cantidad debe ser mayor a 0.');
            return;
        }

        setValidationMessage('');

        const payload = {
            ...formData,
            amount: parseCurrencyInput(formData.amount),
            account_id: formData.account_id || null,
            ...(!selectedExpense && favoritePrefill?.id
                ? { source_favorite_id: favoritePrefill.id }
                : {}),
        };

        const url = selectedExpense
            ? `${API_BASE_URL}/api/expenses/${selectedExpense.id}`
            : `${API_BASE_URL}/api/expenses`;

        const method = selectedExpense ? 'PUT' : 'POST';

        const response = await authFetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log(data);

        setFormData(initialForm);
        setConcepts([]);

        if (onExpenseCreated) {
            onExpenseCreated();
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
                background: isFormHighlightActive ? 'rgba(56, 79, 127, 0.04)' : theme.surface,
                border: isFormHighlightActive ? '1px solid rgba(56, 79, 127, 0.45)' : `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: isFormHighlightActive ? '0 10px 30px rgba(56, 79, 127, 0.18)' : theme.shadow,
                marginBottom: '20px',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
            }}
        >
            <h1 style={{ ...typography.pageTitle, margin: 10 }}>
                {favoriteMode
                    ? 'Crear movimiento frecuente'
                    : selectedExpense
                        ? `Editando: ${selectedExpense.expense_code}`
                        : 'Registro de movimientos'}
            </h1>

            <form onSubmit={handleSubmit}>
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
                    <div className="expense-form-column" style={{ display: 'grid', gap: 5, flex: '1 1 280px', maxWidth: 420 }}>
                        <div className="responsive-field expense-field-date" style={fieldStyle}>
                            <label style={labelStyle}>Fecha</label>
                            <DateInput
                                name="date"
                                value={formData.date}
                                onChange={(value) => handleChange({ target: { name: 'date', value } })}
                                placeholder="Selecciona fecha"
                                required={!favoriteMode}
                                disabled={favoriteMode}
                                style={inputStyle}
                            />
                        </div>

                        <div className="responsive-field expense-field-type" style={fieldStyle}>
                            <label style={labelStyle}>Tipo</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                style={inputStyle}
                            >
                                <option value="expense">Egreso</option>
                                <option value="income">Ingreso</option>
                            </select>
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
                                <option value="">Selecciona categoría</option>
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
                                <option value="">Selecciona concepto</option>
                                {concepts.map((concept) => (
                                    <option key={concept.id} value={concept.id}>
                                        {concept.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="expense-form-column" style={{ display: 'grid', gap: 5, flex: '1 1 280px', maxWidth: 420 }}>
                        <div className="responsive-field expense-field-description" style={fieldStyle}>
                            <label style={labelStyle}>Descripción</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required={favoriteMode}
                                style={inputStyle}
                                placeholder="Opcional"
                            />
                        </div>

                        {!favoriteMode && (
                            <div className="responsive-field expense-field-amount" style={fieldStyle}>
                                <label style={labelStyle}>Cantidad</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    name="amount"
                                    ref={amountInputRef}
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                    style={inputStyle}
                                    placeholder="0.00"
                                />
                            </div>
                        )}

                        <div className="responsive-field expense-field-account" style={fieldStyle}>
                            <label style={labelStyle}>Pago</label>
                            <select
                                name="account_id"
                                value={formData.account_id}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            >
                                <option value="">Selecciona pago</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.account_alias}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {!favoriteMode && (
                            <div
                                className={`form-actions ${selectedExpense ? 'expense-edit-actions' : ''}`}
                                style={{
                                    display: 'flex',
                                    gap: 10,
                                    justifySelf: 'end',
                                    marginTop: 8,
                                }}
                            >
                                {selectedExpense && (
                                    <button type="button" onClick={() => onDeleteExpense(selectedExpense)} style={buttonStyle}>
                                        Eliminar
                                    </button>
                                )}

                                {selectedExpense && (
                                    <button type="button" onClick={onCancelEdit} style={buttonStyle}>
                                        Cancelar
                                    </button>
                                )}

                                {!selectedExpense && (
                                    <button
                                        type="button"
                                        className={`clear-form-button ${shouldHighlightClear ? 'is-active' : ''}`}
                                        onClick={handleClearForm}
                                        style={{ ...buttonStyle, background: theme.inputDisabledBackground, color: theme.textPrimary, border: `1px solid ${theme.border}` }}
                                    >
                                        Limpiar
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    style={{
                                        ...buttonStyle,
                                        border: !isFormValid ? `1px solid ${theme.border}` : buttonStyle.border,
                                        background: !isFormValid ? theme.inputDisabledBackground : buttonStyle.background,
                                        color: !isFormValid ? theme.textSecondary : buttonStyle.color,
                                        cursor: !isFormValid ? 'not-allowed' : buttonStyle.cursor,
                                    }}
                                >
                                    {selectedExpense ? 'Guardar' : 'Guardar movimiento'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {favoriteMode && (
                    <>
                        <div className="favorite-form-panel">
                            <div className="favorite-form-field favorite-selector-field">
                                <label style={labelStyle}>Emoji</label>
                                <div className="favorite-picker-wrap">
                                    <button
                                        type="button"
                                        className="favorite-selector-button favorite-emoji-selector"
                                        onClick={() => {
                                            setIsEmojiPickerOpen((prev) => !prev);
                                            setIsColorPickerOpen(false);
                                        }}
                                        aria-expanded={isEmojiPickerOpen}
                                        aria-label="Seleccionar emoji"
                                    >
                                        {favoriteMeta.emoji}
                                    </button>
                                    {isEmojiPickerOpen && (
                                        <div className="favorite-picker-popover favorite-emoji-grid">
                                            {favoriteEmojis.map((emoji) => (
                                                <button
                                                    type="button"
                                                    key={emoji}
                                                    className={`favorite-emoji-choice ${favoriteMeta.emoji === emoji ? 'is-selected' : ''}`}
                                                    onClick={() => handleFavoriteMetaChange('emoji', emoji)}
                                                    aria-label={`Usar emoji ${emoji}`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="favorite-form-field favorite-alias-field">
                                <label style={labelStyle}>Alias</label>
                                <input
                                    type="text"
                                    value={favoriteMeta.alias}
                                    onChange={(event) => handleFavoriteMetaChange('alias', event.target.value)}
                                    maxLength={40}
                                    placeholder="Nombre del frecuente"
                                    style={inputStyle}
                                />
                            </div>

                            <div className="favorite-form-field favorite-selector-field">
                                <label style={labelStyle}>Color</label>
                                <div className="favorite-picker-wrap">
                                    <button
                                        type="button"
                                        className="favorite-selector-button favorite-color-selector"
                                        onClick={() => {
                                            setIsColorPickerOpen((prev) => !prev);
                                            setIsEmojiPickerOpen(false);
                                        }}
                                        aria-expanded={isColorPickerOpen}
                                        aria-label="Seleccionar color"
                                    >
                                        <span style={{ background: favoriteMeta.color }} />
                                    </button>
                                    {isColorPickerOpen && (
                                        <div className="favorite-picker-popover favorite-color-grid">
                                            {favoriteColors.map((color) => (
                                                <button
                                                    type="button"
                                                    key={color}
                                                    className={`favorite-color-choice ${favoriteMeta.color === color ? 'is-selected' : ''}`}
                                                    onClick={() => handleFavoriteMetaChange('color', color)}
                                                    aria-label={`Usar color ${color}`}
                                                    style={{ background: color }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className="form-actions favorite-form-actions"
                            style={{
                                display: 'flex',
                                gap: 10,
                                justifyContent: 'flex-end',
                                marginTop: 8,
                            }}
                        >
                            <button type="button" onClick={handleCancelFavoriteMode} style={buttonStyle}>
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={!isFormValid}
                                style={{
                                    ...buttonStyle,
                                    border: !isFormValid ? `1px solid ${theme.border}` : buttonStyle.border,
                                    background: !isFormValid ? theme.inputDisabledBackground : buttonStyle.background,
                                    color: !isFormValid ? theme.textSecondary : buttonStyle.color,
                                    cursor: !isFormValid ? 'not-allowed' : buttonStyle.cursor,
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </>
                )}

                {validationMessage && (
                    <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>
                        {validationMessage}
                    </p>
                )}

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
