import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';
import { formatCurrencyMXN } from '../utils/formatters';
import CurrencyInput from './ui/CurrencyInput';
import PrimaryButton from './ui/PrimaryButton';

const favoriteEmojis = ['😎', '🛒', '🍕', '🥑', '🍎', '🍔', '⛽', '☕', '🍿', '🛍️', '🏠', '🐶', '🚕', '💊', '🎵', '💳'];

// Each editing session owns a copy; cancel never mutates the saved template.
export default function FavoriteMovementForm({ template, onCancel, onSaved }) {
  const [values, setValues] = useState(() => ({
    type: template?.type || 'expense',
    category_id: template?.category_id || '',
    concept_id: template?.concept_id || '',
    description: template?.description || '',
    amount: Number(template?.amount) || 0,
    account_id: template?.account_id || '',
    emoji: template?.emoji || favoriteEmojis[0],
    alias: template?.alias || '',
    color: template?.color || '#ffffff',
  }));
  const [categories, setCategories] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialogRef = useRef(null);
  const deleteRef = useRef(null);
  const pending = useRef(false);

  // Native dialogs live in the top layer, so anchor their horizontal bounds to
  // the actual content column instead of assuming a sidebar width/breakpoint.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const content = dialog.closest('.app-content');
    if (!content) return;
    const position = () => {
      const bounds = content.getBoundingClientRect();
      const left = Math.max(0, bounds.left);
      const right = Math.max(0, window.innerWidth - bounds.right);
      dialog.style.setProperty('--frequent-content-left', `${left}px`);
      dialog.style.setProperty('--frequent-content-right', `${right}px`);
      dialog.style.setProperty('--frequent-content-width', `${window.innerWidth - left - right}px`);
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(content);
    window.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (!confirmDelete) return;
    const dialog = deleteRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, [confirmDelete]);

  useEffect(() => {
    let active = true;
    const read = async (url, authenticated = false) => {
      const response = await (authenticated ? authFetch(url) : fetch(url));
      if (!response.ok) throw new Error('No se pudieron cargar las opciones. Cierra el formulario e intenta de nuevo.');
      return response.json();
    };
    Promise.all([
      read(`${API_BASE_URL}/api/categories`),
      read(`${API_BASE_URL}/api/concepts`),
      read(`${API_BASE_URL}/api/accounts?includeSystem=true`, true),
    ]).then(([nextCategories, nextConcepts, nextAccounts]) => {
      if (!active) return;
      setCategories(nextCategories);
      setConcepts(nextConcepts);
      setAccounts(nextAccounts);
      setLoading(false);
    }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);

  const change = (name, value) => {
    setValues((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'type' ? { category_id: '', concept_id: '' } : {}),
      ...(name === 'category_id' ? { concept_id: '' } : {}),
    }));
    setError('');
  };
  const persist = async (method) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await authFetch(`${API_BASE_URL}/api/favorite-movements${template ? `/${template.id}` : ''}`, {
        method,
        ...(method === 'DELETE' ? {} : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, alias: values.alias.trim(), description: values.description.trim(), amount: values.amount || null }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el frecuente.');
      onSaved();
    } catch (cause) {
      setError(cause.message || 'No se pudo conectar. Intenta de nuevo.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const availableCategories = categories.filter((item) => item.type === values.type);
  const availableConcepts = concepts.filter((item) => String(item.category_id) === String(values.category_id));
  const aliasValid = values.alias.trim().length <= 13 || values.alias === template?.alias;
  const valid = aliasValid && values.alias.trim() && values.description.trim() && values.emoji && values.color &&
    availableCategories.some((item) => String(item.id) === String(values.category_id)) &&
    availableConcepts.some((item) => String(item.id) === String(values.concept_id)) &&
    accounts.some((item) => String(item.id) === String(values.account_id));
  const select = (name, label, options, placeholder) => (
    <div className="responsive-field">
      <label htmlFor={`frequent-${name}`}>{label}</label>
      <select id={`frequent-${name}`} value={values[name]} onChange={(event) => change(name, event.target.value)} required>
        <option value="">{placeholder}</option>
        {values[name] && !options.some((item) => String(item.id) === String(values[name])) && (
          <option value={values[name]} disabled>Selección no disponible; elige otra</option>
        )}
        {options.map((item) => <option key={item.id} value={item.id}>{item.name || item.account_alias}</option>)}
      </select>
    </div>
  );

  return (
    <dialog ref={dialogRef} className="expense-form-card frequent-template-dialog" aria-labelledby="frequent-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
      <div className="expense-form-header">
        <span className="movements-card-title-icon" aria-hidden="true"><i className="bx bx-star" /></span>
        <h2 id="frequent-title">{template ? 'Editar movimiento frecuente' : 'Nuevo movimiento frecuente'}</h2>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); if (valid && !loading) persist(template ? 'PUT' : 'POST'); }}>
        <fieldset disabled={busy || loading} className="frequent-template-fields">
          <legend>Datos del movimiento</legend>
          <div className="expense-type-segment" role="group" aria-label="Tipo de movimiento">
            {['expense', 'income'].map((type) => <button key={type} type="button" aria-pressed={values.type === type}
              className={values.type === type ? 'is-active' : ''} onClick={() => change('type', type)}>{type === 'expense' ? 'Egreso' : 'Ingreso'}</button>)}
          </div>
          <div className="expense-form-grid">
            {select('category_id', 'Categoría', availableCategories, 'Elige categoría')}
            {select('concept_id', 'Concepto', availableConcepts, 'Elige concepto')}
          </div>
          <div className="expense-form-grid frequent-detail-grid">
            <div className="responsive-field">
              <label htmlFor="frequent-description">Descripción</label>
              <input id="frequent-description" value={values.description} maxLength={255} required onChange={(event) => change('description', event.target.value)} />
            </div>
            <div className="responsive-field">
              <label htmlFor="frequent-amount">Cantidad</label>
              <CurrencyInput id="frequent-amount" value={values.amount} onValueChange={(amount) => change('amount', amount)} />
            </div>
            {select('account_id', 'Pago / Cuenta', accounts, 'Método de pago')}
          </div>
        </fieldset>
        <fieldset disabled={busy || loading} className="frequent-template-fields">
          <legend>Personalización</legend>
          <div className="frequent-personalization">
            <div className="favorite-form-field">
              <label id="frequent-emoji-label">Emoji</label>
              <div className="favorite-picker-wrap">
                <button type="button" className="favorite-selector-button favorite-emoji-selector" aria-label="Seleccionar emoji"
                  aria-expanded={emojiOpen} onClick={() => setEmojiOpen(!emojiOpen)}>{values.emoji}</button>
                {emojiOpen && <div className="favorite-picker-popover favorite-emoji-grid">
                  {favoriteEmojis.map((emoji) => <button key={emoji} type="button" aria-label={`Usar emoji ${emoji}`} aria-pressed={values.emoji === emoji}
                    className={`favorite-emoji-choice ${values.emoji === emoji ? 'is-selected' : ''}`}
                    onClick={() => { change('emoji', emoji); setEmojiOpen(false); }}>{emoji}</button>)}
                </div>}
              </div>
            </div>
            <div className="favorite-form-field">
              <label htmlFor="frequent-color">Color</label>
              <input id="frequent-color" type="color" value={values.color}
                onChange={(event) => change('color', event.target.value)} />
            </div>
            <div className="favorite-form-field">
              <label htmlFor="frequent-alias">Alias</label>
              <input id="frequent-alias" value={values.alias} maxLength={13} required onChange={(event) => change('alias', event.target.value)} />
            </div>
          </div>
          {!aliasValid && <p className="frequent-form-error" role="alert">El alias debe tener máximo 13 caracteres.</p>}
          {values.alias.length > 13 && values.alias === template?.alias && (
            <p className="frequent-alias-note">Puedes conservar este alias anterior o cambiarlo por uno de hasta 13 caracteres.</p>
          )}
        </fieldset>
        {loading && !error && <p role="status">Cargando opciones...</p>}
        {error && !confirmDelete && <p className="frequent-form-error" role="alert">{error}</p>}
        <div className="form-actions frequent-template-actions">
          {template && <PrimaryButton type="button" variant="danger" disabled={busy} onClick={() => { setError(''); setConfirmDelete(true); }}>Eliminar</PrimaryButton>}
          <PrimaryButton type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</PrimaryButton>
          <PrimaryButton type="submit" disabled={busy || loading || !valid}>{busy ? 'Guardando...' : template ? 'Guardar cambios' : 'Guardar frecuente'}</PrimaryButton>
        </div>
      </form>
      {confirmDelete && <dialog ref={deleteRef} className="expense-delete-modal frequent-confirm-dialog" aria-labelledby="frequent-delete-title"
        aria-describedby="frequent-delete-question frequent-delete-warning"
        onCancel={(event) => { event.preventDefault(); if (!busy) { setConfirmDelete(false); setError(''); } }}>
        <div className="expense-delete-icon" aria-hidden="true"><i className="bx bx-trash" /></div>
        <h2 id="frequent-delete-title" className="expense-delete-title">Eliminar movimiento frecuente</h2>
        <p id="frequent-delete-question" className="expense-delete-question">¿Seguro que quieres eliminar este movimiento frecuente?</p>
        <p id="frequent-delete-warning" className="expense-delete-warning">Esta acción no se puede deshacer.</p>
        <div className="expense-delete-summary">
          <strong className="expense-delete-concept">{template.emoji} {template.alias}</strong>
          <p className="expense-delete-meta">{formatCurrencyMXN(template.amount || 0)}</p>
        </div>
        {error && <p role="alert" className="frequent-form-error">{error}</p>}
        <div className="expense-delete-actions">
          <PrimaryButton className="expense-delete-button" type="button" variant="secondary" disabled={busy} onClick={() => { setConfirmDelete(false); setError(''); }}>Cancelar</PrimaryButton>
          <PrimaryButton className="expense-delete-button" type="button" variant="danger" disabled={busy} onClick={() => persist('DELETE')}>{busy ? 'Eliminando...' : 'Eliminar'}</PrimaryButton>
        </div>
      </dialog>}
    </dialog>
  );
}
