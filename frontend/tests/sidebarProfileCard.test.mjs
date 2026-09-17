import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { build } from 'vite';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { createElement: h, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const require = createRequire(import.meta.url);
const result = await build({ configFile: false, logLevel: 'silent',
  plugins: [{ name: 'shared-react', enforce: 'pre', resolveId(id) {
    if (/^[a-z@]/i.test(id) && !id.startsWith('file:')) return { id: pathToFileURL(require.resolve(id)).href, external: true };
  } }],
  build: { write: false, minify: false, lib: { entry: new URL('../src/components/SidebarProfileCard.jsx', import.meta.url).pathname, formats: ['es'] } },
});
const { default: Card } = await import(`data:text/javascript;base64,${Buffer.from(result[0].output[0].code).toString('base64')}`);
const user = { name: 'Angel Solano', email: 'angel.solano@very-long-domain.example', role: 'admin' };
async function mount(t, identity = user) {
  const root = createRoot(document.getElementById('root'));
  t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => root.render(h(Card, { user: identity })));
}

test('profile card renders full identity and initials with no role or extra controls', async (t) => {
  await mount(t);
  const card = document.querySelector('.sidebar-account-card');
  assert.equal(card.tagName, 'DIV');
  assert.equal(card.querySelector('.desktop-sidebar-profile-name').textContent, user.name);
  assert.equal(card.querySelector('.sidebar-account-email').textContent, user.email);
  assert.equal(card.querySelector('.desktop-sidebar-avatar').textContent, 'AS');
  assert.doesNotMatch(card.textContent, /Admin|Mi perfil/);
  assert.equal(card.querySelector('a, button, i, svg'), null);
  const locationBefore = window.location.href;
  await act(async () => card.querySelector('.desktop-sidebar-avatar').click());
  assert.equal(window.location.href, locationBefore);
});

test('email truncates independently and avatar is circular within the existing card layout', async (t) => {
  await mount(t);
  const stylesheet = document.createElement('style');
  stylesheet.textContent = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  document.head.append(stylesheet);
  t.after(() => stylesheet.remove());
  const email = window.getComputedStyle(document.querySelector('.sidebar-account-email'));
  assert.equal(email.whiteSpace, 'nowrap');
  assert.equal(email.overflow, 'hidden');
  assert.equal(email.textOverflow, 'ellipsis');
  const name = window.getComputedStyle(document.querySelector('.desktop-sidebar-profile-name'));
  assert.equal(name.whiteSpace, 'nowrap');
  assert.equal(name.textOverflow, 'clip');
  assert.equal(name.overflow, 'visible');
  const avatar = window.getComputedStyle(document.querySelector('.desktop-sidebar-avatar'));
  assert.equal(avatar.width, '30px');
  assert.equal(avatar.borderRadius, '50%');
});

test('missing name retains a sensible initials fallback', async (t) => {
  await mount(t, { email: user.email });
  assert.equal(document.querySelector('.desktop-sidebar-avatar').textContent, 'U');
});
