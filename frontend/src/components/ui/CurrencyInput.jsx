import { formatCurrencyMXN } from '../../utils/formatters';
import { editCurrency, parseCurrencyPaste } from '../../utils/currencyInput';

// Controlled monetary input: the parent owns dollars as a number, never display text.
export default function CurrencyInput({ value = 0, onValueChange, onKeyDown, className = '', ...props }) {
  const numericValue = Number(value) || 0;
  const displayValue = formatCurrencyMXN(numericValue);

  const commit = (input, next) => {
    onValueChange(next);
    input.value = formatCurrencyMXN(next);
    input.setSelectionRange(input.value.length, input.value.length);
  };
  const edit = (input, action, text = '') => commit(input, editCurrency(
    numericValue, displayValue, input.selectionStart, input.selectionEnd, action, text,
  ));

  return (
    <input
      {...props}
      className={`currency-input ${className}`.trim()}
      data-currency-zero={numericValue === 0}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || props.readOnly || props.disabled) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          edit(event.currentTarget, 'insert', event.key);
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault();
          edit(event.currentTarget, 'delete');
        } else if (event.key.length === 1) {
          event.preventDefault();
        }
      }}
      onBeforeInput={(event) => {
        if (props.readOnly || props.disabled) return;
        const text = event.data ?? event.nativeEvent.data;
        if (text) {
          event.preventDefault();
          if (/^\d+$/.test(text)) edit(event.currentTarget, 'insert', text);
        }
      }}
      onChange={(event) => {
        // Mobile keyboards can emit input without a usable keydown event.
        const input = event.currentTarget;
        if (props.readOnly || props.disabled) return;
        const raw = input.value;
        if (raw === '') return commit(input, 0);
        if (event.nativeEvent.inputType?.startsWith('delete')) {
          return commit(input, editCurrency(numericValue, displayValue, 0, 0, 'delete'));
        }
        const inserted = event.nativeEvent.data;
        if (inserted && !/^\d+$/.test(inserted)) return commit(input, numericValue);
        if (/^[\d$,.\s]+$/.test(raw)) {
          const next = parseCurrencyPaste(raw.replace(/\D/g, ''));
          if (next !== null) return commit(input, next);
        }
        commit(input, numericValue);
      }}
      onPaste={(event) => {
        if (props.readOnly || props.disabled) return;
        event.preventDefault();
        const next = parseCurrencyPaste(event.clipboardData.getData('text'));
        if (next !== null) commit(event.currentTarget, next);
      }}
      onCut={(event) => {
        if (props.readOnly || props.disabled) return;
        const input = event.currentTarget;
        if (input.selectionStart === input.selectionEnd) return;
        event.preventDefault();
        event.clipboardData.setData('text', input.value.slice(input.selectionStart, input.selectionEnd));
        edit(input, 'delete');
      }}
    />
  );
}
