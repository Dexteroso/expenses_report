import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { formatNumberForInput, parseCurrencyInput } from '../utils/formatters';
import { typography } from '../styles/typography';

function AddExpenseForm({ selectedExpense, onExpenseCreated, onCancelEdit, onDeleteExpense }) {
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
    const [validationMessage, setValidationMessage] = useState('');
    const [isEditHighlightActive, setIsEditHighlightActive] = useState(false);
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
        // color: theme.textSecondary,
        color: isEditHighlightActive ? theme.sidebarBackground: theme.textSecondary,
        fontWeight: isEditHighlightActive ? "bold" : 'normal',
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
    const isFormValid = Boolean(
        formData.date &&
        formData.type &&
        formData.category_id &&
        formData.concept_id &&
        formData.amount &&
        formData.account_id &&
        parseCurrencyInput(formData.amount) > 0
    );

    useEffect(() => {
        fetch('http://localhost:3000/api/categories')
            .then((response) => response.json())
            .then((data) => setCategories(data));

        authFetch('http://localhost:3000/api/accounts')
            .then((response) => response.json())
            .then((data) => setAccounts(data));
    }, []);

    useEffect(() => {
        if (!formData.category_id) return;

        fetch(`http://localhost:3000/api/concepts?category_id=${formData.category_id}`)
            .then((response) => response.json())
            .then((data) => setConcepts(data));
    }, [formData.category_id]);

    useEffect(() => {
        if (selectedExpense) {
            setIsEditHighlightActive(true);
        }

        if (!selectedExpense) {
            setFormData(initialForm);
            setConcepts([]);
            setIsEditHighlightActive(false);
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
    }, [selectedExpense]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData({
            ...formData,
            [name]: value,
        });

        if (validationMessage) {
            setValidationMessage('');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

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
        };

        const url = selectedExpense
            ? `http://localhost:3000/api/expenses/${selectedExpense.id}`
            : 'http://localhost:3000/api/expenses';

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
            style={{
                position: 'sticky',
                top: '16px',
                zIndex: 20,
                background: isEditHighlightActive ? 'rgba(56, 79, 127, 0.04)' : theme.surface,
                border: isEditHighlightActive ? '1px solid rgba(56, 79, 127, 0.45)' : `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: isEditHighlightActive ? '0 10px 30px rgba(56, 79, 127, 0.18)' : theme.shadow,
                marginBottom: '20px',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
            }}
        >
            <h1 style={{ ...typography.pageTitle, margin: 10 }}>
                {selectedExpense ? `Editando: ${selectedExpense.expense_code}` : 'Registro de movimientos'}
            </h1>
            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        display: 'flex',
                        gap: 30,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ display: 'grid', gap: 5, flex: '1 1 280px', maxWidth: 420 }}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Fecha</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            />
                        </div>

                        <div style={fieldStyle}>
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

                        <div style={fieldStyle}>
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

                        <div style={fieldStyle}>
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

                    <div style={{ display: 'grid', gap: 5, flex: '1 1 280px', maxWidth: 420 }}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>Descripción</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                style={inputStyle}
                            />
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Cantidad</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            />
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Cuenta</label>
                            <select
                                name="account_id"
                                value={formData.account_id}
                                onChange={handleChange}
                                required
                                style={inputStyle}
                            >
                                <option value="">Selecciona cuenta</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.account_alias}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div
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
                                {selectedExpense ? 'Guardar cambios' : 'Guardar movimiento'}
                            </button>
                        </div>
                    </div>
                </div>

                {validationMessage && (
                    <p style={{ color: '#b91c1c', fontWeight: 'bold' }}>
                        {validationMessage}
                    </p>
                )}

            </form>
        </div>
    );
}

export default AddExpenseForm;
