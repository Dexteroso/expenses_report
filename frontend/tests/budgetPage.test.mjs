import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
let frames = [];
window.requestAnimationFrame = (callback) => frames.push(callback);
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const require = createRequire(import.meta.url);
const result = await build({
  configFile: false, logLevel: 'silent',
  plugins: [{ name: 'shared-react', enforce: 'pre', resolveId(id) {
    if (/^[a-z@]/i.test(id) && !id.startsWith('file:')) return { id: pathToFileURL(require.resolve(id)).href, external: true };
  } }],
  build: { write: false, minify: false, lib: { entry: new URL('../src/components/BudgetPage.jsx', import.meta.url).pathname, formats: ['es'] } },
});
const { default: BudgetPage } = await import(`data:text/javascript;base64,${Buffer.from(result[0].output[0].code).toString('base64')}`);
const fixture = [
  { category_id: 2, category: 'Alimentos', category_type: 'expense', concept_id: 21, concept: 'Supermercado', month: 1, amount: 20 },
  { category_id: 1, category: 'Ingresos', category_type: 'income', concept_id: 12, concept: 'Extra', month: 1, amount: 50 },
  { category_id: 1, category: 'Ingresos', category_type: 'income', concept_id: 11, concept: 'Sueldo', month: 1, amount: 100 },
];
let calls;
async function mount(t, failSave = false) {
  const rows = structuredClone(fixture);
  calls = [];
  frames = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, ...init });
    if (init.method === 'PUT') {
      if (!failSave) for (const item of JSON.parse(init.body).items) {
        const row = rows.find((entry) => entry.concept_id === item.concept_id && entry.month === item.month);
        if (row) row.amount = item.amount;
      }
      return { ok: !failSave };
    }
    return { ok: true, json: async () => structuredClone(rows) };
  };
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => root.render(createElement(BudgetPage)));
}
const toggles = () => [...document.querySelectorAll('.budget-category-toggle')];
const toggle = (name) => toggles().find((button) => button.textContent === name);
const input = () => document.querySelector('[aria-label="Sueldo — Ene"]');
const pending = () => document.querySelector('.budget-pending-count').textContent;
const save = () => document.querySelector('.budget-save-button');
async function click(element) { assert.ok(element); await act(async () => element.click()); }
async function edit(field = input(), value = '$250.00') {
  await act(async () => {
    field.focus();
    field.setSelectionRange(0, field.value.length);
    const event = new window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => value } });
    field.dispatchEvent(event);
  });
}
function assertTotals() {
  const cells = toggle('Ingresos').closest('tr').cells;
  assert.equal(cells[1].textContent, '$300.00');
  assert.equal(cells[13].textContent, '$300.00');
  const summary = document.querySelector('.budget-summary-card tbody').rows;
  assert.equal(summary[0].cells[13].textContent, '$300.00');
  assert.equal(summary[2].cells[13].textContent, '$280.00');
}

test('categories start collapsed, retain order/totals and toggle exclusively by button or row', async (t) => {
  await mount(t);
  assert.deepEqual(toggles().map((button) => button.textContent), ['Ingresos', 'Alimentos']);
  assert.ok(toggles().every((button) => button.getAttribute('aria-expanded') === 'false'));
  assert.equal(document.querySelectorAll('.budget-input').length, 0);
  assert.equal(toggle('Ingresos').closest('tr').cells[13].textContent, '$150.00');
  await click(toggle('Ingresos'));
  assert.equal(toggle('Ingresos').getAttribute('aria-expanded'), 'true');
  assert.ok(toggle('Ingresos').querySelector('.bx-chevron-down'));
  assert.equal(document.querySelectorAll('.budget-input').length, 24);
  assert.equal(document.querySelector('.budget-input').getAttribute('aria-label'), 'Sueldo — Ene');
  await click(toggle('Ingresos'));
  assert.equal(input(), null);
  await click(toggle('Ingresos').closest('tr'));
  await click(toggle('Alimentos'));
  assert.equal(toggle('Ingresos').getAttribute('aria-expanded'), 'false');
  assert.equal(toggle('Alimentos').getAttribute('aria-expanded'), 'true');
  assert.equal(document.querySelectorAll('.budget-input').length, 12);
  await click(toggle('Ingresos'));
  assert.equal(toggle('Alimentos').getAttribute('aria-expanded'), 'false');
});

test('toggle supports focus and native keyboard-generated click semantics', async (t) => {
  await mount(t);
  const button = toggle('Ingresos');
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.type, 'button');
  assert.equal(button.tabIndex, 0);
  button.focus();
  assert.equal(document.activeElement, button);
  // jsdom cannot synthesize Enter/Space activation. Exercise its browser-delivered detail=0 click.
  await act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 })));
  assert.equal(button.getAttribute('aria-expanded'), 'true');
});

test('edits, pending count and totals survive collapse, switching and reopening', async (t) => {
  await mount(t);
  await click(toggle('Ingresos'));
  await edit();
  assert.equal(toggle('Ingresos').getAttribute('aria-expanded'), 'true');
  assert.equal(input().value, '$250.00');
  assert.equal(pending(), 'Cambios pendientes: 1');
  await click(toggle('Ingresos'));
  assert.equal(input(), null);
  assertTotals();
  assert.equal(pending(), 'Cambios pendientes: 1');
  await click(toggle('Alimentos'));
  await click(toggle('Ingresos'));
  assert.equal(input().value, '$250.00');
  assert.equal(pending(), 'Cambios pendientes: 1');
});

test('save includes collapsed edits, refreshes values and preserves current expansion', async (t) => {
  await mount(t);
  await click(toggle('Ingresos'));
  await edit();
  await click(toggle('Alimentos'));
  await click(save());
  const writes = calls.filter((call) => call.method === 'PUT');
  assert.equal(writes.length, 1);
  assert.ok(writes[0].url.endsWith('/api/budgets'));
  assert.deepEqual(JSON.parse(writes[0].body), { year: 2026, items: [{ concept_id: 11, month: 1, amount: 250 }] });
  assert.equal(calls.filter((call) => !call.method).length, 2);
  assert.equal(pending(), 'Cambios pendientes: 0');
  assert.equal(save().disabled, true);
  assert.equal(toggle('Alimentos').getAttribute('aria-expanded'), 'true');
  assertTotals();
  await click(toggle('Ingresos'));
  assert.equal(input().value, '$250.00');
});

test('failed save retains edits, pending count and expansion and permits retry', async (t) => {
  await mount(t, true);
  t.mock.method(console, 'error', () => {});
  await click(toggle('Ingresos'));
  await edit();
  await click(save());
  assert.ok(document.querySelector('.budget-top-card').textContent.includes('No se pudieron guardar los cambios.'));
  assert.equal(pending(), 'Cambios pendientes: 1');
  assert.equal(save().disabled, false);
  assert.equal(toggle('Ingresos').getAttribute('aria-expanded'), 'true');
  assert.equal(input().value, '$250.00');
  assert.equal(calls.filter((call) => !call.method).length, 1);
});

test('changing year collapses categories and requests selected year', async (t) => {
  await mount(t);
  await click(toggle('Ingresos'));
  await act(async () => {
    const field = document.querySelector('.budget-year-input');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(field, '2027');
    field.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  assert.ok(toggles().every((button) => button.getAttribute('aria-expanded') === 'false'));
  assert.equal(input(), null);
  assert.ok(calls.at(-1).url.endsWith('?year=2027'));
});

test('mobile header shares detail scroller; horizontal synchronization works both ways', async (t) => {
  await mount(t);
  const detail = document.querySelector('.budget-detail-scroll');
  const summary = document.querySelector('.budget-summary-card .table-scroll');
  assert.equal(document.querySelector('.budget-mobile-detail-header').parentElement, detail);
  assert.equal(detail.querySelectorAll('.budget-mobile-detail-header span').length, 14);
  assert.equal(detail.style.overflowY, 'auto');
  assert.equal(document.querySelector('.budget-page').style.gridTemplateRows, 'auto auto minmax(0, 1fr)');
  summary.scrollLeft = 180;
  await act(async () => summary.dispatchEvent(new window.Event('scroll')));
  assert.equal(detail.scrollLeft, 180);
  frames.splice(0).forEach((callback) => callback());
  detail.scrollLeft = 360;
  await act(async () => detail.dispatchEvent(new window.Event('scroll')));
  assert.equal(summary.scrollLeft, 360);
});


function assertDirtyCategories(names) {
  assert.equal(document.querySelectorAll('.budget-category-pending-dot').length, names.length);
  for (const button of toggles()) {
    const dirty = names.includes(button.textContent);
    const dots = button.querySelectorAll('.budget-category-pending-dot');
    assert.equal(dots.length, dirty ? 1 : 0);
    if (dirty) assert.equal(dots[0].getAttribute('aria-hidden'), 'true');
    assert.equal(button.getAttribute('aria-label'),
      dirty ? `${button.textContent}, con cambios sin guardar` : button.textContent);
  }
}

test('dirty dots derive from real changes, survive toggling and disappear independently on revert', async (t) => {
  await mount(t);
  assertDirtyCategories([]);
  await click(toggle('Ingresos'));
  await edit(input(), '$100.00');
  assertDirtyCategories([]);
  await edit();
  assertDirtyCategories(['Ingresos']);
  await click(toggle('Ingresos'));
  assertDirtyCategories(['Ingresos']);
  await click(toggle('Alimentos'));
  assertDirtyCategories(['Ingresos']);
  await edit(document.querySelector('[aria-label="Supermercado — Ene"]'), '$30.00');
  assertDirtyCategories(['Ingresos', 'Alimentos']);
  await click(toggle('Ingresos'));
  await edit(document.querySelector('[aria-label="Extra — Ene"]'), '$60.00');
  await edit(document.querySelector('[aria-label="Sueldo — Feb"]'), '$10.00');
  assertDirtyCategories(['Ingresos', 'Alimentos']);
  await edit(input(), '$100.00');
  assertDirtyCategories(['Ingresos', 'Alimentos']);
  await edit(document.querySelector('[aria-label="Extra — Ene"]'), '$50.00');
  assertDirtyCategories(['Ingresos', 'Alimentos']);
  await edit(document.querySelector('[aria-label="Sueldo — Feb"]'), '$0.00');
  assertDirtyCategories(['Alimentos']);
  await click(toggle('Alimentos'));
  await edit(document.querySelector('[aria-label="Supermercado — Ene"]'), '$20.00');
  assertDirtyCategories([]);
  assert.equal(pending(), 'Cambios pendientes: 0');
});

test('successful save clears dots for expanded and collapsed categories', async (t) => {
  await mount(t);
  await click(toggle('Ingresos'));
  await edit();
  await click(toggle('Alimentos'));
  await edit(document.querySelector('[aria-label="Supermercado — Ene"]'), '$30.00');
  assertDirtyCategories(['Ingresos', 'Alimentos']);
  await click(save());
  assertDirtyCategories([]);
  assert.equal(pending(), 'Cambios pendientes: 0');
});

test('failed save preserves dots for expanded and collapsed categories', async (t) => {
  await mount(t, true);
  t.mock.method(console, 'error', () => {});
  await click(toggle('Ingresos'));
  await edit();
  await click(toggle('Alimentos'));
  await edit(document.querySelector('[aria-label="Supermercado — Ene"]'), '$30.00');
  await click(save());
  assertDirtyCategories(['Ingresos', 'Alimentos']);
  assert.equal(pending(), 'Cambios pendientes: 2');
});
