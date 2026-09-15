import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';

// Compile the actual JSX and exercise its event contract without adding a DOM dependency.
const result = await build({
  configFile: false,
  logLevel: 'silent',
  esbuild: { jsx: 'automatic' },
  build: {
    write: false,
    minify: false,
    lib: { entry: new URL('../src/components/ui/CurrencyInput.jsx', import.meta.url).pathname, formats: ['es'] },
  },
});
const { default: CurrencyInput } = await import(`data:text/javascript;base64,${Buffer.from(result[0].output[0].code).toString('base64')}`);

function field(initial = 0, extra = {}) {
  let value = initial;
  const input = { value: '', selectionStart: 0, selectionEnd: 0,
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } };
  const render = () => CurrencyInput({ value, onValueChange: (next) => { value = next; }, ...extra }).props;
  input.value = render().value;
  input.setSelectionRange(input.value.length, input.value.length);
  const event = (data = {}) => ({ currentTarget: input, nativeEvent: {}, preventDefault() { this.defaultPrevented = true; }, ...data });
  return { input, render, event, value: () => value };
}

test('keyboard entry/deletion, shortcuts, navigation, reset and disabled fields', () => {
  const f = field();
  for (const key of '1234') f.render().onKeyDown(f.event({ key }));
  assert.equal(f.value(), 12.34);
  assert.equal(f.input.value, '$12.34');
  for (const expected of [1.23, 0.12, 0.01, 0]) {
    f.render().onKeyDown(f.event({ key: 'Backspace' }));
    assert.equal(f.value(), expected);
  }
  for (const key of ['Tab', 'ArrowLeft', 'Home', 'End', 'Enter']) {
    const event = f.event({ key }); f.render().onKeyDown(event);
    assert.equal(event.defaultPrevented, undefined);
  }
  const copy = f.event({ key: 'c', metaKey: true }); f.render().onKeyDown(copy);
  assert.equal(copy.defaultPrevented, undefined);
  assert.equal(field(0).render().value, '$0.00');
  const disabled = field(5, { disabled: true });
  disabled.render().onKeyDown(disabled.event({ key: '1' }));
  assert.equal(disabled.value(), 5);
});

test('existing amounts, paste, selection replacement and cut retain numeric values', () => {
  const f = field('1234.56');
  assert.equal(f.render().value, '$1,234.56');
  f.render().onPaste(f.event({ clipboardData: { getData: () => '$9,876.54' } }));
  assert.equal(f.value(), 9876.54);
  f.input.setSelectionRange(0, f.input.value.length);
  f.render().onKeyDown(f.event({ key: '7' }));
  assert.equal(f.value(), 0.07);
  f.input.setSelectionRange(0, f.input.value.length);
  let copied;
  f.render().onCut(f.event({ clipboardData: { setData: (_, text) => { copied = text; } } }));
  assert.equal(copied, '$0.07');
  assert.equal(f.value(), 0);
});

test('mobile beforeinput, fallback deletion, clear, and invalid input', () => {
  const f = field();
  f.render().onBeforeInput(f.event({ data: '1234' }));
  assert.equal(f.value(), 12.34);
  f.render().onChange(f.event({ nativeEvent: { inputType: 'deleteContentBackward' } }));
  assert.equal(f.value(), 1.23);
  f.render().onBeforeInput(f.event({ data: 'x' }));
  assert.equal(f.value(), 1.23);
  f.input.value = '';
  f.render().onChange(f.event());
  assert.equal(f.value(), 0);
  assert.equal(f.input.value, '$0.00');
  assert.equal(f.render().inputMode, 'numeric');
});
