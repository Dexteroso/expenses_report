import { useEffect, useState } from 'react';
import { lightTheme } from '../theme/theme';
import { authFetch } from '../utils/auth';
import { typography } from '../styles/typography';

const initialFormState = {
  bank_name: '',
  last_four: '',
  account_type: 'debit',
  created_at: '',
  billing_cycle_end_day: '',
};

const accountTypeLabels = {
  credit: 'Crédito',
  debit: 'Débito',
};

function AccountsPage() {
  const theme = lightTheme;
  const cardStyle = {
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
  const headerCellStyle = {
    textAlign: 'center',
    padding: '8px 6px',
    fontWeight: 'bold',
  };
  const bodyCellStyle = {
    padding: '8px 6px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: 12,
  };
  const actionButtonStyle = {
    padding: '5px 14px',
    borderRadius: 8,
    border: 'none',
    background: theme.textPrimary,
    color: theme.sidebarText,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 'normal',
  };
  const fieldLabelStyle = {
    color: theme.textBody,
    fontSize: 12,
    fontWeight: 'bold',
  };
  const fieldStyle = {
    display: 'grid',
    gridTemplateColumns: '120px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 8,
  };
  const inputStyle = {
    width: '100%',
    padding: '5px 10px',
    borderRadius: 8,
    border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBackground,
    color: theme.inputText,
    fontSize: 12,
    boxSizing: 'border-box',
  };
  const [accounts, setAccounts] = useState([]);
  const [pageMessage, setPageMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchAccounts = async () => {
    try {
      setPageMessage('');
      const response = await authFetch('http://localhost:3000/api/accounts');
      const data = await response.json();

      if (!response.ok) {
        setPageMessage(data.error || 'No se pudieron cargar las cuentas.');
        return;
      }

      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setPageMessage('No se pudieron cargar las cuentas.');
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openCreateModal = () => {
    setEditingAccount(null);
    setOriginalFormData(null);
    setFormData(initialFormState);
    setFormMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    const nextFormData = {
      bank_name: account.bank_name || '',
      last_four: account.last_four || '',
      account_type: account.account_type || 'credit',
      billing_cycle_end_day:
        account.account_type === 'credit' && account.billing_cycle_end_day !== null
          ? String(account.billing_cycle_end_day)
          : '',
    };

    setEditingAccount(account);
    setOriginalFormData(nextFormData);
    setFormData(nextFormData);
    setFormMessage('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setOriginalFormData(null);
    setFormData(initialFormState);
    setFormMessage('');
    setIsSubmitting(false);
    setIsDeactivating(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'last_four'
          ? value.replace(/\D/g, '').slice(0, 4)
          : value,
      ...(name === 'account_type' && value !== 'credit'
        ? { billing_cycle_end_day: '' }
        : {}),
    }));

    if (formMessage) {
      setFormMessage('');
    }
  };

  const validateForm = () => {
    if (!formData.bank_name || !formData.last_four || !formData.account_type) {
      return 'Completa los campos obligatorios.';
    }

    if (formData.last_four.length !== 4) {
      return 'Los últimos 4 dígitos deben tener exactamente 4 números.';
    }

    if (formData.account_type === 'credit') {
      const cutoffDay = Number(formData.billing_cycle_end_day);

      if (!formData.billing_cycle_end_day) {
        return 'Completa los campos obligatorios.';
      }

      if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 31) {
        return 'El día de corte debe estar entre 1 y 31.';
      }
    }

    return '';
  };

  const normalizeAccountFormData = (accountFormData) => ({
    bank_name: String(accountFormData?.bank_name ?? '').trim(),
    last_four: String(accountFormData?.last_four ?? '').trim(),
    account_type: String(accountFormData?.account_type ?? '').trim(),
    billing_cycle_end_day: String(accountFormData?.billing_cycle_end_day ?? '').trim(),
  });

  const hasAccountChanges = Boolean(editingAccount && originalFormData) && (() => {
    const normalizedCurrentFormData = normalizeAccountFormData(formData);
    const normalizedOriginalFormData = normalizeAccountFormData(originalFormData);

    return (
      normalizedCurrentFormData.bank_name !== normalizedOriginalFormData.bank_name ||
      normalizedCurrentFormData.last_four !== normalizedOriginalFormData.last_four ||
      normalizedCurrentFormData.account_type !== normalizedOriginalFormData.account_type ||
      normalizedCurrentFormData.billing_cycle_end_day !== normalizedOriginalFormData.billing_cycle_end_day
    );
  })();
  const isSaveDisabled = isSubmitting || Boolean(editingAccount && !hasAccountChanges);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSaveDisabled) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setFormMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormMessage('');

    try {
      const response = await authFetch(
        editingAccount
          ? `http://localhost:3000/api/accounts/${editingAccount.id}`
          : 'http://localhost:3000/api/accounts',
        {
          method: editingAccount ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bank_name: formData.bank_name.trim(),
            last_four: formData.last_four,
            account_type: formData.account_type,
            billing_cycle_end_day:
              formData.account_type === 'credit'
                ? Number(formData.billing_cycle_end_day)
                : null,
          }),
        });

      const data = await response.json();

      if (!response.ok) {
        setFormMessage(
          data.error || (editingAccount ? 'No se pudo actualizar la cuenta.' : 'No se pudo crear la cuenta.')
        );
        return;
      }

      await fetchAccounts();
      closeModal();
    } catch (error) {
      console.error(error);
      setFormMessage(editingAccount ? 'No se pudo actualizar la cuenta.' : 'No se pudo crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!editingAccount) {
      return;
    }

    setIsDeactivating(true);
    setFormMessage('');

    try {
      const response = await authFetch(`http://localhost:3000/api/accounts/${editingAccount.id}/deactivate`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (!response.ok) {
        setFormMessage(data.error || 'No se pudo desactivar la cuenta.');
        return;
      }

      await fetchAccounts();
      closeModal();
    } catch (error) {
      console.error(error);
      setFormMessage('No se pudo desactivar la cuenta.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <div style={cardStyle}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={pageTitleStyle}>Cuentas</h1>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={openCreateModal}
              style={actionButtonStyle}
            >
              + Nueva cuenta
            </button>
          </div>
        </div>

        {pageMessage && (
          <p style={{ color: '#b91c1c', marginTop: 0 }}>
            {pageMessage}
          </p>
        )}

        <div style={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, tableLayout: 'fixed' }}>
            <thead style={{ fontSize: 12, color: theme.textSecondary, borderBottom: `2px solid ${theme.border}` }}>
              <tr>
                <th style={headerCellStyle}>Creada</th>
                <th style={headerCellStyle}>Banco</th>
                <th style={headerCellStyle}>Alias</th>
                <th style={headerCellStyle}>Tipo</th>
                <th style={headerCellStyle}>Día de corte</th>
                <th style={headerCellStyle}>Acciones</th>
              </tr>
            </thead>

            <tbody style={{ fontSize: 10, color: theme.textBody }}>
              {accounts.map((account) => (
                <tr key={account.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={bodyCellStyle}>{account.created_at || '-'}</td>
                  <td style={bodyCellStyle}>{account.bank_name}</td>
                  <td style={bodyCellStyle}>{account.account_alias}</td>
                  <td style={bodyCellStyle}>{accountTypeLabels[account.account_type] || account.account_type}</td>
                  <td style={bodyCellStyle}>{account.billing_cycle_end_day ?? '-'}</td>
                  <td style={bodyCellStyle}>
                    <button
                      type="button"
                      onClick={() => openEditModal(account)}
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
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: theme.overlaySurface,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 24,
              boxShadow: theme.shadow,
              boxSizing: 'border-box',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, color: theme.textPrimary }}>
              {editingAccount ? 'Editar cuenta' : 'Nueva cuenta'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
              <div style={fieldStyle}>
                <label style={fieldLabelStyle}>Banco</label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={fieldLabelStyle}>Últimos 4 dígitos</label>
                <input
                  type="text"
                  name="last_four"
                  value={formData.last_four}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={4}
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={fieldLabelStyle}>Tipo de cuenta</label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="credit">Crédito</option>
                  <option value="debit">Débito</option>
                </select>
              </div>

              {formData.account_type === 'credit' && (
                <div style={fieldStyle}>
                  <label style={fieldLabelStyle}>Día de corte</label>
                  <input
                    type="text"
                    name="billing_cycle_end_day"
                    value={formData.billing_cycle_end_day}
                    onChange={handleChange}
                    inputMode="numeric"
                    style={inputStyle}
                  />
                </div>
              )}

              {formMessage && (
                <p style={{ color: editingAccount ? theme.textSecondary : '#b91c1c', margin: '4px 0 0' }}>
                  {formMessage}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {editingAccount && (
                  <button
                    type="button"
                    onClick={handleDeactivateAccount}
                    disabled={isDeactivating || isSubmitting}
                    style={{
                      ...actionButtonStyle,
                      background: isDeactivating || isSubmitting ? theme.inputDisabledBackground : theme.textPrimary,
                      color: isDeactivating || isSubmitting ? theme.textSecondary : theme.sidebarText,
                      cursor: isDeactivating || isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isDeactivating ? 'Desactivando...' : 'Desactivar cuenta'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    ...actionButtonStyle,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaveDisabled}
                  style={{
                    ...actionButtonStyle,
                    background:
                      isSaveDisabled
                        ? theme.inputDisabledBackground
                        : actionButtonStyle.background,
                    color:
                      isSaveDisabled
                        ? theme.textSecondary
                        : actionButtonStyle.color,
                    border:
                      isSaveDisabled
                        ? `1px solid ${theme.border}`
                        : 'none',
                    cursor:
                      isSaveDisabled
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {editingAccount
                    ? 'Guardar cambios'
                    : isSubmitting
                      ? 'Guardando...'
                      : 'Guardar cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default AccountsPage;
