import { Fragment, useState } from 'react';
import CurrencyInput from './ui/CurrencyInput';
import PrimaryButton from './ui/PrimaryButton';
import { formatCurrencyMXN } from '../utils/formatters';
import { toCents } from '../utils/currencyInput';

export default function BudgetReassignmentPanel({ discovery, selections, onChange, loading, busy,
    error, outcomeUnknown, onRetry, onBack, onCancel, onConfirm }) {
    const [showOthers, setShowOthers] = useState(false);
    // Undefined keeps the initial destination default while discovery loads;
    // null means the user explicitly collapsed the open category.
    const [expandedCategoryId, setExpandedCategoryId] = useState(undefined);
    const groups = discovery?.categories || [];
    const sources = new Map(groups.flatMap((group) => group.concepts).map((source) => [source.conceptId, source]));
    const selectedCents = Object.values(selections).reduce((sum, value) => sum + toCents(value), 0);
    const exceedsDeficit = selectedCents > toCents(discovery?.destination.requiredAmount || 0);
    const invalid = Object.entries(selections).some(([id, amount]) => toCents(amount) > 0 && toCents(amount) > toCents(sources.get(Number(id))?.available || 0));
    const deficitCents = Math.max(0, toCents(discovery?.destination.requiredAmount || 0) - selectedCents);
    const sameCategory = groups.find((group) => group.isDestinationCategory);
    const disabled = busy || loading || outcomeUnknown;
    return (
        <div className="budget-reassignment-panel">
            <h2 id="budget-reassignment-title" className="expense-delete-title" tabIndex={-1}>Reasignar presupuesto</h2>
            {discovery && <>
                <p className="expense-delete-question">{discovery.destination.categoryName} · {discovery.destination.conceptName}</p>
                <dl id="budget-reassignment-summary" className="budget-reassignment-summary" aria-live="polite">
                    <div><dt>Excedente del movimiento</dt><dd>{formatCurrencyMXN(discovery.destination.requiredAmount)}</dd></div>
                    <div><dt>Reasignado</dt><dd>{formatCurrencyMXN(selectedCents / 100)}</dd></div>
                    <div><dt>Déficit restante</dt><dd className={deficitCents > 0 ? 'financial-negative-value' : ''}>{formatCurrencyMXN(deficitCents / 100)}</dd></div>
                </dl>
            </>}
            {loading && <p role="status">Consultando presupuesto...</p>}
            {error && <p className="financial-negative-value" role="alert">{error}</p>}
            {!loading && !discovery && !outcomeUnknown && <PrimaryButton variant="secondary" onClick={onRetry}>Reintentar consulta</PrimaryButton>}
            {discovery && <>
                {!sameCategory && <p className="expense-delete-warning">No hay presupuesto disponible en otros conceptos de esta categoría.</p>}
                <table className="budget-reassignment-table">
                    <thead><tr><th>Concepto</th><th>Disponible</th><th>Reasignar</th></tr></thead>
                    <tbody>{groups.filter((group) => group.isDestinationCategory || showOthers).map((group, index) => {
                        const open = expandedCategoryId === undefined ? group.isDestinationCategory : expandedCategoryId === group.categoryId;
                        const hasSelections = group.concepts.some((source) => toCents(selections[source.conceptId] || 0) > 0);
                        return <Fragment key={group.categoryId}>
                            <tr className="budget-category-row" style={{ '--budget-category-background': index % 2 ? '#fff' : '#f7f9fd' }}>
                                <td className="budget-category-cell"><button type="button" className="budget-category-toggle"
                                    aria-label={hasSelections ? `${group.categoryName}, con reasignaciones sin guardar` : group.categoryName}
                                    aria-expanded={open} disabled={busy} onClick={() => setExpandedCategoryId(open ? null : group.categoryId)}>
                                    <i className={`bx bx-chevron-${open ? 'down' : 'right'}`} aria-hidden="true" />{group.categoryName}
                                    {hasSelections && <span className="budget-category-pending-dot" aria-hidden="true" />}
                                </button></td>
                                <td className="budget-category-cell">{formatCurrencyMXN(group.available)}</td><td className="budget-category-cell" />
                            </tr>
                            {open && group.concepts.map((source) => {
                                const amount = selections[source.conceptId] || 0;
                                const exceeds = toCents(amount) > 0 && toCents(amount) > toCents(source.available);
                                return <tr className="budget-concept-row" key={source.conceptId}>
                                    <td>{source.conceptName}</td><td>{formatCurrencyMXN(source.available)}</td>
                                    <td><CurrencyInput className="budget-input" value={amount} disabled={disabled}
                                        aria-label={`Reasignar de ${source.conceptName}`} aria-invalid={exceeds}
                                        aria-describedby={exceeds ? `source-error-${source.conceptId}` : undefined}
                                        onValueChange={(value) => onChange(source.conceptId, value)} />
                                        {exceeds && <span id={`source-error-${source.conceptId}`} className="financial-negative-value budget-source-error">Supera el disponible.</span>}
                                    </td>
                                </tr>;
                            })}
                        </Fragment>;
                    })}</tbody>
                </table>
                {!showOthers && groups.some((group) => !group.isDestinationCategory) &&
                    <PrimaryButton variant="secondary" disabled={busy} onClick={() => setShowOthers(true)}>Ver otras categorías</PrimaryButton>}
                {selectedCents > 0 && deficitCents > 0 && <p className="expense-delete-warning">
                    El concepto quedará excedido en <span className="financial-negative-value">{formatCurrencyMXN(deficitCents / 100)}</span> después de guardar el movimiento.
                </p>}
            </>}
            <div className="budget-warning-actions">
                <PrimaryButton variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</PrimaryButton>
                <PrimaryButton variant="secondary" disabled={busy} onClick={onBack}>Volver</PrimaryButton>
                <PrimaryButton className={`budget-reassignment-submit${exceedsDeficit ? ' is-over-limit' : ''}`}
                    disabled={disabled || !discovery || selectedCents <= 0 || invalid || exceedsDeficit} onClick={onConfirm}>
                    {exceedsDeficit ? `Excedente ${formatCurrencyMXN((selectedCents - toCents(discovery?.destination.requiredAmount || 0)) / 100)}`
                        : busy ? 'Guardando...' : `Reasignar ${formatCurrencyMXN(selectedCents / 100)}`}
                </PrimaryButton>
            </div>
        </div>
    );
}
