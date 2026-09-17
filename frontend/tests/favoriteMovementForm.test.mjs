import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { build } from 'vite';
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const require = createRequire(import.meta.url);
async function compile(name, exported = 'default') {
  const result = await build({ configFile: false, logLevel: 'silent',
    plugins: [{ name: 'shared-react', enforce: 'pre', resolveId(id) {
      if (/^[a-z@]/i.test(id) && !id.startsWith('file:')) return { id: pathToFileURL(require.resolve(id)).href, external: true };
    } }],
    build: { write: false, minify: false, lib: { entry: new URL(`../src/components/${name}.jsx`, import.meta.url).pathname, formats: ['es'] } },
  });
  try {
    return (await import(`data:text/javascript;base64,${Buffer.from(result[0].output[0].code + `\n//# sourceURL=${name}.compiled.mjs`).toString('base64')}`))[exported];
  } catch (error) { throw new Error(error.message, { cause: error }); }
}
const Form = await compile('FavoriteMovementForm');
const Expenses = await compile('../App', 'Expenses');
const template = { id: 71, type: 'expense', category_id: 1, concept_id: 2, description: 'Weekly shop', amount: 12.34, account_id: 3, emoji: '🛒', alias: 'Groceries', color: '#005496', usage_count: 17 };
const options = {
  '/api/categories': [{ id: 1, type: 'expense', name: 'Food' }, { id: 4, type: 'income', name: 'Income' }],
  '/api/concepts': [{ id: 2, category_id: 1, name: 'Shop' }, { id: 5, category_id: 4, name: 'Pay' }],
  '/api/accounts': [{ id: 3, account_alias: 'Efectivo' }],
  '/api/favorite-movements': [template],
};
let calls;
function setupFetch(fail = false) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    if (init.method) {
      calls.push({ url, ...init });
      return { ok: !fail, json: async () => fail ? { error: 'Try again' } : { favorite: template } };
    }
    return { ok: true, json: async () => options[new URL(url, 'http://localhost').pathname] || [] };
  };
}
let root;
async function mount(Component, props = {}) {
  root = createRoot(document.getElementById('root'));
  await act(async () => { root.render(createElement(Component, props)); });
}
async function cleanup() { await act(async () => root.unmount()); }
const buttons = (text, within = document) => [...within.querySelectorAll('button')].filter((button) => button.textContent === text);
async function click(button) { assert.ok(button); await act(async () => button.click()); }
async function change(id, value) {
  const input = document.getElementById(id);
  const prototype = input.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit() { await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))); }

test('create has one form, no date, and writes only a template with a variable amount', async () => {
  setupFetch(); let saved = 0;
  await mount(Form, { onSaved: () => saved++, onCancel() {} });
  assert.equal(document.querySelectorAll('form').length, 1);
  assert.equal(document.querySelector('input[name="date"]'), null);
  await change('frequent-category_id', '1'); await change('frequent-concept_id', '2');
  await change('frequent-account_id', '3'); await change('frequent-description', 'Coffee'); await change('frequent-alias', 'Cafe');
  await submit();
  assert.equal(saved, 1); assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith('/api/favorite-movements')); assert.equal(calls[0].method, 'POST');
  const body = JSON.parse(calls[0].body);
  assert.equal(body.amount, null); assert.equal(body.alias, 'Cafe'); assert.equal(Object.keys(body).length, 9);
  assert.equal(body.date, undefined); assert.equal(body.usage_count, undefined);
  await cleanup();
});

test('edit preloads all fields and updates stable ID without sending usage count', async () => {
  setupFetch(); await mount(Form, { template, onSaved() {}, onCancel() {} });
  for (const name of ['category_id', 'concept_id', 'description', 'account_id', 'alias']) assert.equal(document.getElementById(`frequent-${name}`).value, String(template[name]));
  assert.equal(document.getElementById('frequent-amount').value, '$12.34');
  assert.equal(document.querySelector('[aria-label="Seleccionar emoji"]').textContent, template.emoji);
  assert.equal(document.getElementById('frequent-color').type, 'color');
  assert.equal(document.getElementById('frequent-color').value, template.color);
  await change('frequent-alias', 'Updated'); await change('frequent-description', 'Changed');
  await click(document.querySelector('[aria-label="Seleccionar emoji"]'));
  await click(document.querySelector('[aria-label="Usar emoji ☕"]'));
  await change('frequent-color', '#23d2aa');
  await submit();
  assert.equal(calls[0].method, 'PUT'); assert.ok(calls[0].url.endsWith('/71'));
  assert.deepEqual(JSON.parse(calls[0].body), { type: 'expense', category_id: 1, concept_id: 2, description: 'Changed', amount: 12.34, account_id: 3, emoji: '☕', alias: 'Updated', color: '#23d2aa' });
  assert.equal(template.alias, 'Groceries'); assert.equal(template.usage_count, 17);
  await cleanup();
});

test('cancel create/edit makes no writes and preserves saved data', async () => {
  for (const initial of [null, template]) {
    setupFetch(); let canceled = 0;
    await mount(Form, { template: initial, onCancel: () => canceled++, onSaved() {} });
    await change('frequent-alias', 'Unsaved'); await click(buttons('Cancelar')[0]);
    assert.equal(canceled, 1); assert.equal(calls.length, 0); assert.equal(template.alias, 'Groceries');
    await cleanup();
  }
});

test('cancel deletion retains draft; confirmation deletes only the template', async () => {
  setupFetch(); let saved = 0;
  await mount(Form, { template, onCancel() {}, onSaved: () => saved++ });
  await change('frequent-alias', 'Unsaved'); await click(buttons('Eliminar')[0]);
  let confirmation = document.querySelector('.frequent-confirm-dialog'); assert.ok(confirmation.open);
  await click(buttons('Cancelar', confirmation)[0]);
  assert.equal(document.querySelector('.frequent-confirm-dialog'), null);
  assert.equal(document.getElementById('frequent-alias').value, 'Unsaved'); assert.equal(calls.length, 0);
  await click(buttons('Eliminar')[0]); confirmation = document.querySelector('.frequent-confirm-dialog');
  await click(buttons('Eliminar', confirmation)[0]);
  assert.equal(saved, 1); assert.equal(calls.length, 1); assert.equal(calls[0].method, 'DELETE'); assert.ok(calls[0].url.endsWith('/71'));
  await cleanup();
});

test('failed persistence retains draft and shows an error', async () => {
  setupFetch(true); let saved = 0;
  await mount(Form, { template, onCancel() {}, onSaved: () => saved++ });
  await change('frequent-alias', 'Keep this'); await submit();
  assert.equal(saved, 0); assert.equal(document.getElementById('frequent-alias').value, 'Keep this');
  assert.equal(document.querySelector('[role="alert"]').textContent, 'Try again');
  await cleanup();
});

test('changing type clears category/concept and filters dependent options', async () => {
  setupFetch(); await mount(Form, { template, onCancel() {}, onSaved() {} });
  await click(buttons('Ingreso')[0]);
  assert.equal(document.getElementById('frequent-category_id').value, '');
  assert.equal(document.getElementById('frequent-concept_id').value, '');
  await change('frequent-category_id', '4');
  assert.equal(document.getElementById('frequent-concept_id').options[1].text, 'Pay');
  await cleanup();
});

// Exercise actual parent/card/form wiring instead of duplicating state logic.
test('form cancel stays in edit mode; card cancel exits without writes', async () => {
  setupFetch();
  window.localStorage.setItem('user', JSON.stringify({ onboarding_completed: true }));
  await mount(Expenses, { onExpenseCreated() {} });
  await click(buttons('Editar frecuentes')[0]);
  const card = document.querySelector('.favorite-movements-card');
  assert.equal(buttons('Cancelar', card).length, 1);
  await click(document.querySelector('[aria-label="Editar movimiento frecuente Groceries"]'));
  await change('frequent-alias', 'Unsaved');
  await click(buttons('Cancelar', document.querySelector('.frequent-template-dialog'))[0]);
  assert.equal(document.querySelector('.frequent-template-dialog'), null);
  assert.equal(buttons('Cancelar', card).length, 1);
  await click(buttons('Cancelar', card)[0]);
  assert.equal(buttons('Editar frecuentes', card).length, 1);
  assert.equal(calls.length, 0);
  await cleanup();
});

for (const action of ['save', 'delete']) {
  test(`successful ${action} exits the form and edit mode`, async () => {
    setupFetch();
    await mount(Expenses, { onExpenseCreated() {} });
    await click(buttons('Editar frecuentes')[0]);
    await click(document.querySelector('[aria-label="Editar movimiento frecuente Groceries"]'));
    const dialog = document.querySelector('.frequent-template-dialog');
    if (action === 'save') {
      await click(buttons('Guardar cambios', dialog)[0]);
    } else {
      await click(buttons('Eliminar', dialog)[0]);
      await click(buttons('Cancelar', document.querySelector('.frequent-confirm-dialog'))[0]);
      assert.ok(document.querySelector('.frequent-template-dialog'));
      await click(buttons('Eliminar', dialog)[0]);
      await click(buttons('Eliminar', document.querySelector('.frequent-confirm-dialog'))[0]);
    }
    assert.equal(document.querySelector('.frequent-template-dialog'), null);
    assert.equal(buttons('Editar frecuentes').length, 1);
    assert.equal(buttons('Listo').length, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, action === 'save' ? 'PUT' : 'DELETE');
    await cleanup();
  });
}

test('normal use populates movement form; create opens template form and preserves movement draft', async () => {
  setupFetch();
  globalThis.requestAnimationFrame = (callback) => callback();
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  await mount(Expenses, { onExpenseCreated() {} });
  await click(document.querySelector('[aria-label="Usar movimiento frecuente Groceries"]'));
  assert.equal(document.querySelector('input[name="description"]').value, template.description);
  assert.equal(document.querySelector('input[name="amount"]').value, '$12.34');
  await click(document.querySelector('[aria-label="Agregar movimiento frecuente"]'));
  assert.equal(document.getElementById('frequent-title').textContent, 'Nuevo movimiento frecuente');
  await click(buttons('Cancelar', document.querySelector('.frequent-template-dialog'))[0]);
  assert.equal(document.querySelector('input[name="description"]').value, template.description);
  assert.equal(calls.length, 0);
  await cleanup();
});

test('both dialogs share content bounds and one observer across layout changes', async () => {
  setupFetch();
  const container = document.getElementById('root');
  container.className = 'app-content movements-page';
  const stylesheet = document.createElement('style');
  stylesheet.textContent = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  document.head.append(stylesheet);
  let bounds = { left: 240, right: 1000 };
  container.getBoundingClientRect = () => bounds;
  let resized;
  let disconnected = false;
  let observers = 0;
  globalThis.ResizeObserver = class {
    constructor(callback) { resized = callback; observers++; }
    observe(element) { assert.equal(element, container); }
    disconnect() { disconnected = true; }
  };
  await mount(Form, { template, onSaved() {}, onCancel() {} });
  const dialog = document.querySelector('.frequent-template-dialog');
  assert.equal(dialog.style.getPropertyValue('--frequent-content-left'), '240px');
  assert.equal(dialog.style.getPropertyValue('--frequent-content-right'), `${window.innerWidth - 1000}px`);
  await click(buttons('Eliminar', dialog)[0]);
  const confirmation = document.querySelector('.frequent-confirm-dialog');
  assert.equal(observers, 1);
  assert.equal(confirmation.parentElement, dialog);
  // DOM tests cannot perform layout, but verify both dialogs consume the same
  // inherited bounds. The confirmation keeps its own width and native backdrop.
  for (const element of [dialog, confirmation]) {
    const style = window.getComputedStyle(element);
    assert.equal(style.left, 'var(--frequent-content-left, 0)');
    assert.equal(style.right, 'var(--frequent-content-right, 0)');
  }
  assert.equal(window.getComputedStyle(confirmation).maxWidth, '460px');
  bounds = { left: 16, right: window.innerWidth - 16 };
  resized();
  assert.equal(dialog.style.getPropertyValue('--frequent-content-left'), '16px');
  assert.equal(dialog.style.getPropertyValue('--frequent-content-right'), '16px');
  await click(buttons('Cancelar', confirmation)[0]);
  assert.equal(dialog.open, true);
  assert.equal(document.querySelector('.frequent-confirm-dialog'), null);
  await cleanup();
  stylesheet.remove();
  assert.equal(disconnected, true);
  container.className = '';
});

async function movementField(name, value) {
  const input = document.querySelector(`[name="${name}"]`);
  assert.ok(input, `Missing movement field ${name}`);
  const prototype = input.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  if (name === 'amount') {
    input.setSelectionRange(0, input.value.length);
    for (const key of value) {
      await act(async () => input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    }
  } else {
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
      input.dispatchEvent(new dom.window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  }
}
async function fillManualMovement() {
  await movementField('date', '2026-09-15');
  await movementField('category_id', '1');
  await movementField('concept_id', '2');
  await movementField('account_id', '3');
  await movementField('amount', '500');
}
const tile = (alias) => document.querySelector(`[aria-label="Usar movimiento frecuente ${alias}"]`);

test('origin survives changed fields; successful use refreshes ranking and clears subsequent origin', async () => {
  setupFetch();
  const other = { ...template, id: 72, alias: 'Other' };
  const fallback = globalThis.fetch;
  let favoriteReads = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (!init.method && url.endsWith('/api/favorite-movements')) {
      favoriteReads++;
      return { ok: true, json: async () => favoriteReads === 1 ? [other, template] : [template, other] };
    }
    return fallback(url, init);
  };
  let saved = 0;
  await mount(Expenses, { onExpenseCreated: () => saved++ });
  await click(tile('Groceries'));
  assert.equal(calls.length, 0);
  assert.equal(favoriteReads, 1);
  await movementField('date', '2026-09-15');
  await movementField('description', 'Dinner');
  await movementField('amount', '42500');
  // Change type/category/concept too: origin is independent of the draft values.
  await click(buttons('Ingreso')[0]);
  await movementField('category_id', '4');
  await movementField('concept_id', '5');
  await submit();
  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].body);
  assert.equal(body.source_favorite_id, template.id);
  assert.equal(body.description, 'Dinner');
  assert.equal(body.amount, 425);
  assert.equal(body.type, 'income');
  assert.equal(saved, 1);
  assert.equal(favoriteReads, 2);
  assert.equal(document.querySelector('.favorite-movement-alias').textContent, 'Groceries');
  await fillManualMovement();
  await submit();
  assert.equal(JSON.parse(calls[1].body).source_favorite_id, undefined);
  assert.equal(favoriteReads, 2);
  await cleanup();
});

test('selecting A then B counts only B; clearing drops the origin without a write', async () => {
  setupFetch();
  const other = { ...template, id: 72, alias: 'Other' };
  const fallback = globalThis.fetch;
  globalThis.fetch = (url, init = {}) => !init.method && url.endsWith('/api/favorite-movements')
    ? Promise.resolve({ ok: true, json: async () => [template, other] }) : fallback(url, init);
  await mount(Expenses, { onExpenseCreated() {} });
  await click(tile('Groceries'));
  await click(tile('Other'));
  assert.equal(calls.length, 0);
  await movementField('date', '2026-09-15');
  await submit();
  assert.equal(JSON.parse(calls[0].body).source_favorite_id, 72);
  await click(tile('Groceries'));
  await click(buttons('Limpiar')[0]);
  assert.equal(calls.length, 1);
  await fillManualMovement();
  await submit();
  assert.equal(JSON.parse(calls[1].body).source_favorite_id, undefined);
  await cleanup();
});

test('failed saves preserve origin and draft; validation sends nothing; retry success clears both', async () => {
  setupFetch(true);
  await mount(Expenses, { onExpenseCreated() {} });
  await click(tile('Groceries'));
  await submit(); // No date: client validation.
  assert.equal(calls.length, 0);
  await movementField('date', '2026-09-15');
  await submit();
  assert.equal(calls.length, 1);
  assert.equal(document.querySelector('[name="description"]').value, template.description);
  assert.match(document.querySelector('.expense-form-card').textContent, /Try again/);
  setupFetch();
  await submit();
  assert.equal(JSON.parse(calls[0].body).source_favorite_id, template.id);
  assert.equal(document.querySelector('[name="description"]').value, '');
  await cleanup();
});

test('duplicate submission events create one request and one success callback', async () => {
  setupFetch();
  const fallback = globalThis.fetch;
  let release;
  let posts = 0;
  globalThis.fetch = (url, init = {}) => {
    if (init.method === 'POST' && url.endsWith('/api/expenses')) {
      posts++;
      return new Promise((resolve) => { release = () => resolve({ ok: true, json: async () => ({ expense_id: 90, usage_tracking_failed: true }) }); });
    }
    return fallback(url, init);
  };
  let saved = 0;
  await mount(Expenses, { onExpenseCreated: () => saved++ });
  await click(tile('Groceries'));
  await movementField('date', '2026-09-15');
  const form = document.querySelector('form');
  await act(async () => {
    for (let index = 0; index < 2; index++) form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  assert.equal(posts, 1);
  assert.equal(form.getAttribute('aria-busy'), 'true');
  await act(async () => release());
  assert.equal(saved, 1);
  assert.equal(posts, 1);
  assert.equal(document.querySelector('[name="description"]').value, '');
  await cleanup();
});

test('switching to historical editing discards the draft origin; editing and the next manual create omit it', async () => {
  setupFetch();
  const historical = { ...template, id: 90, date: '2026-09-01', expense_code: 'EX260090', concept: 'Shop', category: 'Food', account_alias: 'Cash' };
  const fallback = globalThis.fetch;
  globalThis.fetch = (url, init = {}) => !init.method && new URL(url, 'http://localhost').pathname === '/api/expenses'
    ? Promise.resolve({ ok: true, json: async () => [historical] }) : fallback(url, init);
  await mount(Expenses, { onExpenseCreated() {} });
  await click(tile('Groceries'));
  await click(document.querySelector('[aria-label="Editar movimiento EX260090"]'));
  await submit();
  assert.equal(calls[0].method, 'PUT');
  assert.equal(JSON.parse(calls[0].body).source_favorite_id, undefined);
  await fillManualMovement();
  await submit();
  assert.equal(calls[1].method, 'POST');
  assert.equal(JSON.parse(calls[1].body).source_favorite_id, undefined);
  await cleanup();
});

const sameCategoryTemplate = { ...template, id: 72, alias: 'Fresko', concept_id: 7, description: 'Supermarket', amount: 55, account_id: 8 };
const differentCategoryTemplate = { ...template, id: 73, alias: 'Salary', type: 'income', category_id: 4, concept_id: 5, description: 'Monthly pay', amount: 90, account_id: 8 };
const prefillConcepts = [...options['/api/concepts'], { id: 7, category_id: 1, name: 'Supermarket' }];
function setupPrefillFetch() {
  setupFetch();
  const fallback = globalThis.fetch;
  globalThis.fetch = (url, init = {}) => {
    if (init.method) return fallback(url, init);
    const parsed = new URL(url, 'http://localhost');
    let data;
    if (parsed.pathname === '/api/favorite-movements') data = [template, sameCategoryTemplate, differentCategoryTemplate];
    if (parsed.pathname === '/api/accounts') data = [...options['/api/accounts'], { id: 8, account_alias: 'Debit' }];
    if (parsed.pathname === '/api/concepts') data = prefillConcepts.filter((item) => String(item.category_id) === parsed.searchParams.get('category_id'));
    return data ? Promise.resolve({ ok: true, json: async () => data }) : fallback(url, init);
  };
}
function assertPrefill(expected) {
  for (const field of ['category_id', 'concept_id', 'description', 'account_id']) {
    assert.equal(document.querySelector(`[name="${field}"]`).value, String(expected[field]), field);
  }
  assert.equal(document.querySelector('[name="amount"]').value, `$${expected.amount.toFixed(2)}`);
  assert.equal(document.querySelector('.expense-type-segment .is-active').textContent.trim(), expected.type === 'income' ? 'Ingreso' : 'Egreso');
}
for (const [label, sequence] of [
  ['different category and concept', [template, differentCategoryTemplate]],
  ['same category and different concept', [template, sameCategoryTemplate]],
  ['repeated same-category A → B → A', [template, sameCategoryTemplate, template]],
]) {
  test(`template switching: ${label} replaces all fields and saves only the final origin`, async () => {
    setupPrefillFetch();
    await mount(Expenses, { onExpenseCreated() {} });
    for (const item of sequence) {
      await click(tile(item.alias));
      assertPrefill(item);
      assert.equal(calls.length, 0);
    }
    await movementField('date', '2026-09-15');
    await submit();
    assert.equal(calls.length, 1);
    const saved = JSON.parse(calls[0].body);
    const final = sequence.at(-1);
    assert.equal(calls[0].method, 'POST');
    assert.equal(saved.source_favorite_id, final.id);
    assert.equal(saved.concept_id, final.concept_id);
    await cleanup();
  });
}

test('manual category and type changes reset dependent selections without changing template origin', async () => {
  setupPrefillFetch();
  await mount(Expenses, { onExpenseCreated() {} });
  await click(tile(template.alias));
  await movementField('category_id', '');
  assert.equal(document.querySelector('[name="concept_id"]').value, '');
  assert.equal(document.querySelector('[name="concept_id"]').options.length, 1);
  await movementField('category_id', '1');
  assert.equal(document.querySelector('[name="concept_id"]').value, '');
  await movementField('concept_id', '7');
  await movementField('description', 'Manual edit');
  assert.equal(document.querySelector('[name="concept_id"]').value, '7');
  await click(buttons('Ingreso')[0]);
  assert.equal(document.querySelector('[name="category_id"]').value, '');
  assert.equal(document.querySelector('[name="concept_id"]').value, '');
  await movementField('category_id', '4');
  assert.equal(document.querySelector('[name="concept_id"]').value, '');
  await movementField('concept_id', '5');
  await movementField('date', '2026-09-15');
  await submit();
  assert.equal(JSON.parse(calls[0].body).source_favorite_id, template.id);
  assert.equal(JSON.parse(calls[0].body).concept_id, '5');
  await cleanup();
});

test('late concept response from a previous category cannot overwrite the current template options', async () => {
  setupPrefillFetch();
  const fallback = globalThis.fetch;
  let release;
  globalThis.fetch = (url, init = {}) => url.includes('/api/concepts?category_id=1')
    ? new Promise((resolve) => { release = () => resolve({ json: async () => prefillConcepts.filter((item) => item.category_id === 1) }); })
    : fallback(url, init);
  await mount(Expenses, { onExpenseCreated() {} });
  await click(tile(template.alias));
  await click(tile(differentCategoryTemplate.alias));
  assertPrefill(differentCategoryTemplate);
  await act(async () => release());
  assertPrefill(differentCategoryTemplate);
  assert.equal(calls.length, 0);
  await cleanup();
});


test('alias accepts 13 characters and blocks saving a longer new alias', async () => {
  setupFetch();
  await mount(Form, { template, onSaved() {}, onCancel() {} });
  const alias = document.getElementById('frequent-alias');
  assert.equal(alias.maxLength, 13);
  await change('frequent-alias', 'Cinepolis4DXP');
  await submit();
  assert.equal(JSON.parse(calls[0].body).alias, 'Cinepolis4DXP');
  await change('frequent-alias', 'Cinepolis4DXPX'); // Programmatic input bypasses native maxLength.
  await submit();
  assert.equal(calls.length, 1);
  assert.equal(buttons('Guardar cambios')[0].disabled, true);
  await cleanup();
});

test('legacy long alias and arbitrary stored hex color preload and survive unrelated edits', async () => {
  setupFetch();
  const legacy = { ...template, alias: 'Legacy alias longer than twelve', color: '#a1b2c3' };
  await mount(Form, { template: legacy, onSaved() {}, onCancel() {} });
  assert.equal(document.getElementById('frequent-alias').value, legacy.alias);
  assert.equal(document.getElementById('frequent-color').value, legacy.color);
  assert.equal(calls.length, 0);
  await change('frequent-description', 'Unrelated edit');
  await submit();
  const saved = JSON.parse(calls[0].body);
  assert.equal(saved.alias, legacy.alias);
  assert.equal(saved.color, legacy.color);
  await cleanup();
});

const budgetImpact = (status = 'WOULD_EXCEED') => ({
  status, categoryName: 'Alimentos', conceptName: 'Supermercado',
  available: status === 'ALREADY_EXCEEDED' ? '-20.00' : '10.00',
  newAmount: '12.34', currentOverage: '20.00',
  projectedOverage: status === 'ALREADY_EXCEEDED' ? '32.34' : '2.34',
});
function setupBudgetFetch(status = 'WOULD_EXCEED', confirmationFails = false) {
  setupFetch();
  const fallback = globalThis.fetch;
  const writes = [];
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === 'POST' && url.endsWith('/api/expenses')) {
      const payload = JSON.parse(init.body);
      writes.push(payload);
      if (!payload.budget_confirmation) return { ok: false, status: 409, json: async () => ({
        code: 'BUDGET_CONFIRMATION_REQUIRED', requiresConfirmation: true, budgetImpact: budgetImpact(status),
      }) };
      return { ok: !confirmationFails, status: confirmationFails ? 500 : 201,
        json: async () => confirmationFails ? { error: 'No se pudo guardar' } : { expense_id: 90 } };
    }
    return fallback(url, init);
  };
  return writes;
}
const budgetDialog = () => document.querySelector('.budget-warning-dialog');
async function openBudgetWarning() {
  await click(tile('Groceries'));
  await movementField('date', '2025-08-31');
  await submit();
}

for (const status of ['WOULD_EXCEED', 'ALREADY_EXCEEDED']) {
  test(`budget warning ${status}: exact copy, inline amounts, enabled reassignment, cancel preserves draft/origin`, async () => {
    const writes = setupBudgetFetch(status);
    await mount(Expenses, { onExpenseCreated() {} });
    await openBudgetWarning();
    const dialog = budgetDialog();
    assert.equal(dialog.open, true);
    assert.equal(dialog.querySelector('h2').textContent, status === 'ALREADY_EXCEEDED' ? 'Presupuesto excedido' : 'Presupuesto insuficiente');
    assert.equal(dialog.querySelector('#budget-warning-description').textContent,
      status === 'ALREADY_EXCEEDED'
        ? 'Ya has excedido el presupuesto de Alimentos · Supermercado en $20.00.'
        : 'Tienes $10.00 disponibles en Alimentos · Supermercado.');
    assert.deepEqual([...dialog.querySelectorAll('#budget-warning-impact p')].map((line) => line.textContent),
      ['Nuevo importe: $12.34', `Excedente después del movimiento: ${status === 'ALREADY_EXCEEDED' ? '$32.34' : '$2.34'}`]);
    assert.equal(buttons('Reasignar presupuesto', dialog)[0].disabled, false);
    assert.equal(document.querySelector('form fieldset').disabled, true);
    await submit();
    assert.equal(writes.length, 1);
    await click(buttons('Cancelar', dialog)[0]);
    assert.equal(budgetDialog(), null);
    assert.equal(document.querySelector('[name="date"]').value, '2025-08-31');
    assert.equal(document.querySelector('[name="description"]').value, template.description);
    await submit();
    assert.deepEqual(writes[1], writes[0]);
    assert.equal(writes[1].source_favorite_id, template.id);
    await cleanup();
  });
}

test('budget confirmation uses immutable pending draft, refreshes ranking and clears success once', async () => {
  const writes = setupBudgetFetch();
  let saved = 0;
  let favoriteReads = 0;
  const fallback = globalThis.fetch;
  globalThis.fetch = (url, init = {}) => {
    if (url.includes('/api/favorite-movements') && !init.method) favoriteReads++;
    return fallback(url, init);
  };
  await mount(Expenses, { onExpenseCreated: () => saved++ });
  await openBudgetWarning();
  const original = { ...writes[0] };
  const readsBefore = favoriteReads;
  await movementField('description', 'Changed after warning');
  await click(buttons('Registrar de todos modos', budgetDialog())[0]);
  assert.deepEqual(writes[1], { ...original, budget_confirmation: true });
  assert.equal(saved, 1);
  assert.equal(favoriteReads, readsBefore + 1);
  assert.equal(budgetDialog(), null);
  assert.equal(document.querySelector('[name="description"]').value, '');
  await fillManualMovement();
  await submit();
  assert.equal(writes[2].source_favorite_id, undefined);
  assert.equal(writes[2].budget_confirmation, undefined);
  await cleanup();
});

test('failed confirmation retains dialog, draft and origin and permits confirmed retry', async () => {
  const writes = setupBudgetFetch('ALREADY_EXCEEDED', true);
  let saved = 0;
  await mount(Expenses, { onExpenseCreated: () => saved++ });
  await openBudgetWarning();
  await click(buttons('Registrar de todos modos', budgetDialog())[0]);
  assert.equal(saved, 0);
  assert.equal(budgetDialog().querySelector('[role="alert"]').textContent, 'No se pudo guardar');
  assert.equal(document.querySelector('[name="description"]').value, template.description);
  await submit();
  assert.equal(writes.length, 2);
  await click(buttons('Registrar de todos modos', budgetDialog())[0]);
  assert.deepEqual(writes[2], writes[1]);
  await click(buttons('Cancelar', budgetDialog())[0]);
  await submit();
  assert.deepEqual(writes[3], writes[0]);
  await cleanup();
});

test('duplicate initial and confirmation events remain guarded across warning transition', async () => {
  setupFetch();
  const fallback = globalThis.fetch;
  const writes = [];
  let release;
  globalThis.fetch = (url, init = {}) => {
    if (init.method === 'POST' && url.endsWith('/api/expenses')) {
      writes.push(JSON.parse(init.body));
      return new Promise((resolve) => { release = () => resolve(writes.length === 1
        ? { ok: false, status: 409, json: async () => ({ code: 'BUDGET_CONFIRMATION_REQUIRED', budgetImpact: budgetImpact() }) }
        : { ok: true, status: 201, json: async () => ({ expense_id: 90 }) }); });
    }
    return fallback(url, init);
  };
  let saved = 0;
  await mount(Expenses, { onExpenseCreated: () => saved++ });
  await click(tile('Groceries'));
  await movementField('date', '2025-08-31');
  const form = document.querySelector('form');
  await act(async () => {
    for (let i = 0; i < 2; i++) form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  assert.equal(writes.length, 1);
  await act(async () => release());
  await submit();
  assert.equal(writes.length, 1);
  const confirm = buttons('Registrar de todos modos', budgetDialog())[0];
  await act(async () => { confirm.click(); confirm.click(); });
  assert.equal(writes.length, 2);
  const cancelEvent = new dom.window.Event('cancel', { cancelable: true });
  await act(async () => budgetDialog().dispatchEvent(cancelEvent));
  assert.equal(cancelEvent.defaultPrevented, true);
  assert.ok(budgetDialog());
  await act(async () => release());
  assert.equal(saved, 1);
  assert.equal(budgetDialog(), null);
  await cleanup();
});

test('budget dialog follows app-content bounds, restores focus and handles Escape without writes', async () => {
  const writes = setupBudgetFetch();
  const container = document.getElementById('root');
  container.className = 'app-content movements-page';
  let bounds = { left: 240, right: 1000 };
  container.getBoundingClientRect = () => bounds;
  let resized;
  let disconnected = false;
  globalThis.ResizeObserver = class {
    constructor(callback) { resized = callback; }
    observe(element) { assert.equal(element, container); }
    disconnect() { disconnected = true; }
  };
  await mount(Expenses, { onExpenseCreated() {} });
  await click(tile('Groceries'));
  await movementField('date', '2025-08-31');
  const save = buttons('Agregar')[0];
  save.focus();
  await submit();
  assert.equal(budgetDialog().style.getPropertyValue('--frequent-content-left'), '240px');
  bounds = { left: 16, right: window.innerWidth - 16 };
  resized();
  assert.equal(budgetDialog().style.getPropertyValue('--frequent-content-width'), `${window.innerWidth - 32}px`);
  await act(async () => budgetDialog().dispatchEvent(new dom.window.Event('cancel', { cancelable: true })));
  assert.equal(budgetDialog(), null);
  assert.equal(disconnected, true);
  assert.equal(document.activeElement, save);
  assert.equal(writes.length, 1);
  await cleanup();
  container.className = '';
});

const sourceDiscovery = () => ({ date: '2025-08-31', year: 2025, month: 8, currency: 'MXN',
  destination: { conceptId: 2, categoryId: 1, categoryName: 'Alimentos', conceptName: 'Supermercado', requiredAmount: '2.34' },
  sameCategoryAvailable: '5.00', totalAvailable: '15.00', categories: [
    { categoryId: 1, categoryName: 'Alimentos', isDestinationCategory: true, available: '5.00', concepts: [
      { conceptId: 7, conceptName: 'Restaurantes', available: '5.00' },
    ] },
    { categoryId: 6, categoryName: 'Transporte', isDestinationCategory: false, available: '10.00', concepts: [
      { conceptId: 8, conceptName: 'Gasolina', available: '10.00' },
    ] },
  ] });
function setupReassignmentFetch({ failure, discoveryFailure = false, deferred = false, discovery = sourceDiscovery() } = {}) {
  const writes = setupBudgetFetch();
  const fallback = globalThis.fetch;
  const reads = [];
  let release;
  globalThis.fetch = (url, init = {}) => {
    if (url.includes('/api/budgets/reassignment-sources')) {
      reads.push(url);
      return Promise.resolve({ ok: !discoveryFailure, status: discoveryFailure ? 500 : 200,
        json: async () => discoveryFailure ? { error: 'Consulta no disponible' } : discovery });
    }
    if (init.method && JSON.parse(init.body || '{}').budget_reassignment) {
      const payload = JSON.parse(init.body);
      writes.push(payload);
      const response = () => failure === 'network' ? Promise.reject(new TypeError('Network lost')) : Promise.resolve({
        ok: !failure, status: failure === 'conflict' ? 409 : failure ? 500 : 201,
        json: async () => failure === 'conflict' ? {
          code: 'REASSIGNMENT_SOURCE_CHANGED', rolledBack: true, error: 'Cambió el disponible',
          discovery: { ...sourceDiscovery(), categories: [sourceDiscovery().categories[1]] },
          conflicts: [{ conceptId: 7, available: '0.00' }],
        } : failure ? { code: 'FINANCIAL_OPERATION_FAILED', rolledBack: true, error: 'Operación revertida' } : { expense_id: 91 },
      });
      if (deferred) return new Promise((resolve, reject) => { release = () => response().then(resolve, reject); });
      return response();
    }
    return fallback(url, init);
  };
  return { writes, reads, release: () => release() };
}
async function editContribution(name, digits) {
  const input = document.querySelector(`[aria-label="Reasignar de ${name}"]`);
  assert.ok(input);
  input.setSelectionRange(0, input.value.length);
  for (const key of digits) {
    await act(async () => input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
  }
}
const confirmTransfer = () => budgetDialog().querySelector('.budget-reassignment-submit');
async function openReassignment() {
  await openBudgetWarning();
  const dialog = budgetDialog();
  await click(buttons('Reasignar presupuesto', dialog)[0]);
  assert.equal(budgetDialog(), dialog);
  return dialog;
}

test('reassignment starts at warning, reuses dialog, same-category first and manual amounts preserve collapsed selections', async () => {
  const { writes, reads } = setupReassignmentFetch();
  await mount(Expenses, { onExpenseCreated() {} });
  await openBudgetWarning();
  assert.equal(reads.length, 0);
  const dialog = budgetDialog();
  await click(buttons('Reasignar presupuesto', dialog)[0]);
  assert.equal(budgetDialog(), dialog);
  assert.equal(document.querySelectorAll('dialog').length, 1);
  assert.equal(document.activeElement.id, 'budget-reassignment-title');
  assert.ok(reads[0].includes('date=2025-08-31'));
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]').value, '$0.00');
  assert.equal(document.querySelector('[aria-label="Reasignar de Gasolina"]'), null);
  assert.equal(confirmTransfer().disabled, true);
  await editContribution('Restaurantes', '100');
  assert.deepEqual([...dialog.querySelectorAll('dd')].map((node) => node.textContent), ['$2.34', '$1.00', '$1.34']);
  assert.equal(confirmTransfer().disabled, false);
  await click(dialog.querySelector('.budget-category-toggle'));
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]'), null);
  await click(dialog.querySelector('.budget-category-toggle'));
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]').value, '$1.00');
  await click(buttons('Ver otras categorías', dialog)[0]);
  const toggles = [...dialog.querySelectorAll('.budget-category-toggle')];
  await click(toggles[1]);
  await editContribution('Gasolina', '050');
  assert.equal(confirmTransfer().textContent, 'Reasignar $1.50');
  assert.equal(writes.length, 1);
  await cleanup();
});

test('single-open categories retain drafts, pending dots, totals and multi-source payload', async () => {
  const discovery = sourceDiscovery();
  discovery.categories[0].concepts.push({ conceptId: 9, conceptName: 'Despensa', available: '5.00' });
  discovery.categories.push({ categoryId: 10, categoryName: 'Misceláneos', available: '5.00', isDestinationCategory: false,
    concepts: [{ conceptId: 10, conceptName: 'Regalos', available: '5.00' }] });
  const { writes } = setupReassignmentFetch({ discovery });
  await mount(Expenses, { onExpenseCreated() {} });
  const dialog = await openReassignment();
  const category = (name) => [...dialog.querySelectorAll('.budget-category-toggle')].find((node) => node.textContent === name);
  const dots = (name) => category(name).querySelectorAll('.budget-category-pending-dot').length;
  const expanded = () => [...dialog.querySelectorAll('.budget-category-toggle[aria-expanded="true"]')].map((node) => node.textContent);
  const totals = () => [...dialog.querySelectorAll('dd')].map((node) => node.textContent);
  assert.deepEqual(expanded(), ['Alimentos']);
  assert.equal(dots('Alimentos'), 0);
  await editContribution('Restaurantes', '100');
  await editContribution('Despensa', '025');
  assert.equal(dots('Alimentos'), 1);
  assert.equal(category('Alimentos').getAttribute('aria-label'), 'Alimentos, con reasignaciones sin guardar');
  const initialTotals = totals();
  assert.deepEqual(initialTotals, ['$2.34', '$1.25', '$1.09']);
  await click(buttons('Ver otras categorías', dialog)[0]);
  await click(category('Transporte'));
  assert.deepEqual(expanded(), ['Transporte']);
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]'), null);
  assert.equal(dots('Alimentos'), 1);
  assert.deepEqual(totals(), initialTotals);
  await editContribution('Gasolina', '050');
  assert.equal(dots('Transporte'), 1);
  assert.equal(dots('Alimentos'), 1);
  assert.equal(dots('Misceláneos'), 0);
  const combinedTotals = totals();
  assert.deepEqual(combinedTotals, ['$2.34', '$1.75', '$0.59']);
  await click(category('Misceláneos'));
  assert.deepEqual(expanded(), ['Misceláneos']);
  assert.deepEqual(totals(), combinedTotals);
  await click(category('Misceláneos'));
  assert.deepEqual(expanded(), []);
  assert.deepEqual(totals(), combinedTotals);
  await click(category('Alimentos'));
  assert.deepEqual(expanded(), ['Alimentos']);
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]').value, '$1.00');
  assert.equal(document.querySelector('[aria-label="Reasignar de Despensa"]').value, '$0.25');
  await editContribution('Restaurantes', '0');
  assert.equal(dots('Alimentos'), 1);
  await editContribution('Despensa', ['Backspace']);
  assert.equal(dots('Alimentos'), 0);
  assert.equal(category('Alimentos').getAttribute('aria-label'), 'Alimentos');
  assert.equal(dots('Transporte'), 1);
  await editContribution('Restaurantes', '100');
  await click(category('Transporte'));
  assert.equal(document.querySelector('[aria-label="Reasignar de Gasolina"]').value, '$0.50');
  assert.deepEqual(totals(), ['$2.34', '$1.50', '$0.84']);
  await click(confirmTransfer());
  assert.deepEqual(writes[1], { ...writes[0], budget_confirmation: true,
    budget_reassignment: { sources: [{ concept_id: 7, amount: '1.00' }, { concept_id: 8, amount: '0.50' }] } });
  await cleanup();
});

test('621 deficit caps all categories including collapsed drafts and recovers when reduced', async () => {
  const discovery = sourceDiscovery();
  discovery.destination.requiredAmount = '621.00';
  discovery.categories[0].concepts[0].available = '5000.00';
  discovery.categories[1].concepts[0].available = '5000.00';
  discovery.categories.push({ categoryId: 10, categoryName: 'Vivienda', available: '5000.00',
    concepts: [{ conceptId: 10, conceptName: 'Gas', available: '5000.00' }] });
  const { writes } = setupReassignmentFetch({ discovery });
  await mount(Expenses, { onExpenseCreated() {} });
  const dialog = await openReassignment();
  const toggle = (index) => dialog.querySelectorAll('.budget-category-toggle')[index];
  await editContribution('Restaurantes', '30000');
  assert.equal(confirmTransfer().disabled, false);
  assert.equal(dialog.querySelectorAll('dd')[2].textContent, '$321.00');
  assert.equal(confirmTransfer().textContent, 'Reasignar $300.00');
  assert.equal(confirmTransfer().classList.contains('is-over-limit'), false);
  await click(buttons('Ver otras categorías', dialog)[0]);
  await click(toggle(1));
  await editContribution('Gasolina', '32100');
  assert.equal(confirmTransfer().disabled, false);
  assert.equal(dialog.querySelectorAll('dd')[1].textContent, '$621.00');
  assert.equal(dialog.querySelector('.budget-source-error[role="alert"]'), null);
  await click(toggle(2));
  await editContribution('Gas', '37900');
  assert.equal(confirmTransfer().textContent, 'Excedente $379.00');
  assert.ok(confirmTransfer().classList.contains('is-over-limit'));
  assert.equal(confirmTransfer().disabled, true);
  assert.equal(confirmTransfer().querySelector('i, svg, img'), null);
  assert.doesNotMatch(dialog.textContent, /Supera el excedente por/);
  assert.equal(dialog.querySelector('.budget-source-error[role="alert"]'), null);
  await editContribution('Gas', '0');
  assert.equal(confirmTransfer().textContent, 'Reasignar $621.00');
  assert.equal(confirmTransfer().classList.contains('is-over-limit'), false);
  assert.equal(confirmTransfer().disabled, false);
  await editContribution('Gas', '100');
  assert.equal(confirmTransfer().disabled, true);
  assert.equal(dialog.querySelectorAll('dd')[1].textContent, '$622.00');
  assert.equal(confirmTransfer().textContent, 'Excedente $1.00');
  await click(confirmTransfer());
  assert.equal(writes.length, 1);
  await editContribution('Gas', '142900');
  assert.equal(dialog.querySelectorAll('dd')[1].textContent, '$2,050.00');
  assert.equal(dialog.querySelectorAll('dd')[2].textContent, '$0.00');
  assert.equal(confirmTransfer().disabled, true);
  await click(confirmTransfer());
  assert.equal(writes.length, 1);
  assert.equal(dialog.querySelectorAll('.budget-category-pending-dot').length, 3);
  assert.equal(dialog.querySelectorAll('[aria-expanded="true"]').length, 1);
  await click(toggle(0));
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]').value, '$300.00');
  assert.equal(confirmTransfer().disabled, true);
  await click(toggle(2));
  await editContribution('Gas', '0');
  assert.equal(confirmTransfer().disabled, false);
  assert.equal(dialog.querySelectorAll('.budget-category-pending-dot').length, 2);
  await click(confirmTransfer());
  assert.deepEqual(writes[1].budget_reassignment.sources, [{ concept_id: 7, amount: '300.00' }, { concept_id: 8, amount: '321.00' }]);
  await cleanup();
});

test('partial reassignment submits original movement once and clears normally without another warning', async () => {
  const { writes } = setupReassignmentFetch(); let saved = 0;
  await mount(Expenses, { onExpenseCreated: () => saved++ });
  await openReassignment();
  const original = { ...writes[0] };
  await editContribution('Restaurantes', '100');
  await movementField('description', 'Synthetic background change');
  await click(confirmTransfer());
  assert.equal(saved, 1);
  assert.deepEqual(writes[1], { ...original, budget_confirmation: true, budget_reassignment: { sources: [{ concept_id: 7, amount: '1.00' }] } });
  assert.equal(budgetDialog(), null);
  assert.equal(document.querySelector('[name="description"]').value, '');
  await cleanup();
});

test('excess source input is preserved with inline error and blocks submission', async () => {
  const { writes } = setupReassignmentFetch();
  await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
  await editContribution('Restaurantes', '501');
  const input = document.querySelector('[aria-label="Reasignar de Restaurantes"]');
  assert.equal(input.value, '$5.01'); assert.equal(input.getAttribute('aria-invalid'), 'true');
  const dialog = budgetDialog();
  await click(buttons('Ver otras categorías', dialog)[0]);
  await click(dialog.querySelectorAll('.budget-category-toggle')[1]);
  assert.equal(dialog.querySelector('.budget-category-pending-dot') !== null, true);
  assert.equal(confirmTransfer().disabled, true);
  await click(dialog.querySelectorAll('.budget-category-toggle')[0]);
  const reopened = document.querySelector('[aria-label="Reasignar de Restaurantes"]');
  assert.equal(reopened.value, '$5.01');
  assert.equal(reopened.getAttribute('aria-invalid'), 'true');
  assert.equal(document.getElementById('source-error-7').textContent, 'Supera el disponible.');
  assert.equal(confirmTransfer().disabled, true);
  await click(confirmTransfer()); assert.equal(writes.length, 1);
  await editContribution('Restaurantes', '234');
  assert.equal(confirmTransfer().disabled, false); // Exactly the deficit is valid.
  assert.equal(budgetDialog().querySelectorAll('dd')[2].textContent, '$0.00');
  await cleanup();
});

test('Volver retains choices; Register Anyway omits transfer; cancel and Escape retain movement and favorite', async () => {
  const { writes } = setupReassignmentFetch();
  await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
  await editContribution('Restaurantes', '100');
  await click(buttons('Volver', budgetDialog())[0]);
  assert.equal(document.activeElement.textContent, 'Reasignar presupuesto');
  await click(buttons('Reasignar presupuesto', budgetDialog())[0]);
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]').value, '$1.00');
  await act(async () => budgetDialog().dispatchEvent(new dom.window.Event('cancel', { cancelable: true })));
  assert.equal(budgetDialog(), null);
  assert.equal(document.querySelector('[name="description"]').value, template.description);
  await submit();
  assert.equal(writes[1].source_favorite_id, template.id);
  await click(buttons('Registrar de todos modos', budgetDialog())[0]);
  assert.equal(writes[2].budget_reassignment, undefined);
  await cleanup();
});

test('conflict refresh retains unavailable selected row and requires manual correction', async () => {
  const { writes } = setupReassignmentFetch({ failure: 'conflict' });
  await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
  await editContribution('Restaurantes', '100'); await click(confirmTransfer());
  const input = document.querySelector('[aria-label="Reasignar de Restaurantes"]');
  assert.equal(input.value, '$1.00'); assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(confirmTransfer().disabled, true);
  assert.ok(budgetDialog().textContent.includes('Cambió el disponible'));
  assert.equal(writes.length, 2);
  await cleanup();
});

test('known rollback permits retry without losing selections or original payload', async () => {
  const { writes } = setupReassignmentFetch({ failure: 'rollback' });
  await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
  await editContribution('Restaurantes', '100'); await click(confirmTransfer());
  assert.equal(confirmTransfer().disabled, false);
  await click(confirmTransfer());
  assert.deepEqual(writes[2], writes[1]);
  assert.equal(document.querySelector('[name="date"]').value, '2025-08-31');
  await cleanup();
});

test('discovery failure supports retry and returning to original warning', async () => {
  const { reads, writes } = setupReassignmentFetch({ discoveryFailure: true });
  await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
  assert.ok(budgetDialog().textContent.includes('Consulta no disponible'));
  await click(buttons('Reintentar consulta', budgetDialog())[0]); assert.equal(reads.length, 2);
  await click(buttons('Volver', budgetDialog())[0]);
  assert.equal(budgetDialog().querySelector('h2').textContent, 'Presupuesto insuficiente');
  await click(buttons('Registrar de todos modos', budgetDialog())[0]);
  assert.equal(writes.length, 2); assert.equal(writes[1].budget_reassignment, undefined);
  await cleanup();
});

test('unknown network outcome never automatically retries or falls back to creation', async () => {
  const { writes } = setupReassignmentFetch({ failure: 'network' });
  const originalError = console.error; console.error = () => {};
  try {
    await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
    await editContribution('Restaurantes', '100'); await click(confirmTransfer());
    assert.equal(confirmTransfer().disabled, true);
    assert.ok(budgetDialog().textContent.includes('Revisa Movimientos y Presupuesto'));
    await click(buttons('Volver', budgetDialog())[0]);
    assert.equal(buttons('Registrar de todos modos', budgetDialog())[0].disabled, true);
    assert.equal(writes.length, 2);
    await cleanup();
  } finally { console.error = originalError; }
});

test('duplicate reassignment clicks send one mutation; Escape/background submit cannot interrupt in-flight operation', async () => {
  const state = setupReassignmentFetch({ deferred: true }); let saved = 0;
  await mount(Expenses, { onExpenseCreated: () => saved++ }); await openReassignment();
  await editContribution('Restaurantes', '100');
  const confirm = confirmTransfer();
  await act(async () => { confirm.click(); confirm.click(); });
  assert.equal(state.writes.length, 2);
  await submit();
  await act(async () => budgetDialog().dispatchEvent(new dom.window.Event('cancel', { cancelable: true })));
  assert.ok(budgetDialog()); assert.equal(state.writes.length, 2);
  await act(async () => state.release());
  assert.equal(saved, 1); assert.equal(budgetDialog(), null);
  await cleanup();
});

test('editing warning keeps PUT snapshot and discovery includes owned expense ID', async () => {
  setupFetch(); const fallback = globalThis.fetch; const mutations = []; const reads = [];
  const historical = { ...template, id: 90, date: '2024-08-01', expense_code: 'EX260090', concept: 'Shop', category: 'Food', account_alias: 'Cash' };
  globalThis.fetch = async (url, init = {}) => {
    if (url.includes('/api/budgets/reassignment-sources')) { reads.push(url); return { ok: true, json: async () => sourceDiscovery() }; }
    if (init.method === 'PUT') {
      const payload = JSON.parse(init.body); mutations.push({ url, payload });
      return payload.budget_confirmation ? { ok: true, status: 200, json: async () => ({ message: 'Saved' }) }
        : { ok: false, status: 409, json: async () => ({ code: 'BUDGET_CONFIRMATION_REQUIRED', budgetImpact: budgetImpact() }) };
    }
    if (!init.method && new URL(url, 'http://localhost').pathname === '/api/expenses') return { ok: true, json: async () => [historical] };
    return fallback(url, init);
  };
  await mount(Expenses, { onExpenseCreated() {} });
  await click(document.querySelector('[aria-label="Editar movimiento EX260090"]'));
  await movementField('amount', '2000'); await submit();
  assert.ok(budgetDialog());
  assert.match(budgetDialog().querySelector('#budget-warning-impact').textContent, /Nuevo importe:/);
  assert.doesNotMatch(budgetDialog().querySelector('#budget-warning-impact').textContent, /Nuevo movimiento:|Importe anterior|Incremento|Importe editado/);
  await click(buttons('Reasignar presupuesto', budgetDialog())[0]);
  assert.ok(reads[0].includes('expense_id=90'));
  await editContribution('Restaurantes', '100'); await click(confirmTransfer());
  assert.equal(mutations.length, 2); assert.ok(mutations[1].url.endsWith('/90'));
  assert.equal(mutations[1].payload.source_favorite_id, undefined);
  assert.equal(mutations[1].payload.amount, 20);
  assert.equal(budgetDialog(), null);
  await cleanup();
});

test('overspent refreshed donor can be cleared to zero while another source remains valid', async () => {
  setupReassignmentFetch({ failure: 'conflict' });
  const fallback = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const response = await fallback(url, init);
    if (init.method && JSON.parse(init.body || '{}').budget_reassignment) {
      const data = await response.json();
      data.conflicts[0].available = '-1.00';
      return { ...response, json: async () => data };
    }
    return response;
  };
  await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
  await editContribution('Restaurantes', '100'); await click(confirmTransfer());
  assert.equal(confirmTransfer().disabled, true);
  await editContribution('Restaurantes', '0');
  assert.equal(document.querySelector('[aria-label="Reasignar de Restaurantes"]').getAttribute('aria-invalid'), 'false');
  await click(buttons('Ver otras categorías', budgetDialog())[0]);
  await click([...budgetDialog().querySelectorAll('.budget-category-toggle')].find((button) => button.textContent === 'Transporte'));
  await editContribution('Gasolina', '100');
  assert.equal(confirmTransfer().disabled, false);
  await cleanup();
});

test('reassignment Cancel keeps complete favorite draft and submits no transfer', async () => {
  const { writes } = setupReassignmentFetch();
  await mount(Expenses, { onExpenseCreated() {} }); await openReassignment();
  await editContribution('Restaurantes', '100');
  await click(buttons('Cancelar', budgetDialog())[0]);
  assert.equal(budgetDialog(), null);
  assert.equal(writes.length, 1);
  await submit();
  assert.deepEqual(writes[1], writes[0]);
  await cleanup();
});
