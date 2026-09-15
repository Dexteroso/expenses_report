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
  } catch (error) { throw new Error(error.message); }
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
