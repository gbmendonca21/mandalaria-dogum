import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const compile = file => ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/^import .+;\n/gm, '').replace(/^export /gm, '');
const demoContext = vm.createContext({});
vm.runInContext(compile('lib/demo-catalog.ts'), demoContext);
const catalog = JSON.parse(JSON.stringify(demoContext.getDemoCatalog()));
assert.equal(catalog.products.length, 8);
assert.equal(catalog.categories.length, 4);
assert.equal(new Set(catalog.products.map(item => item.id)).size, 8);
for (const category of catalog.categories) assert.equal(catalog.products.filter(item => item.categoryId === category.id).length, 2);
for (const item of catalog.products) {
  assert.ok(item.demo && item.priceCents > 0 && item.stockQuantity > 0);
  assert.ok(fs.existsSync(path.join(root, 'public', item.imageUrl)));
}

const environment = { DEMO_CATALOG: 'true' };
let storedProducts = [];
const dbContext = vm.createContext({
  env: environment, getDemoCatalog: () => catalog,
  database: () => ({ query: async query => query.includes('FROM categories') ? [] : storedProducts }),
});
vm.runInContext(compile('lib/catalog.ts'), dbContext);
assert.equal((await dbContext.getCatalog()).products.length, 8);
assert.equal((await dbContext.getCatalog(true)).products.length, 0);
environment.DEMO_CATALOG = 'false';
assert.equal((await dbContext.getCatalog()).products.length, 0);
environment.DEMO_CATALOG = 'true';
storedProducts = [{ id: 'real-product', name: 'Peça real', category_name: 'Mandalas', width_cm: null, height_cm: null, depth_cm: null, price_cents: 15000, stock_quantity: 3 }];
assert.equal((await dbContext.getCatalog()).demo, false);
assert.equal((await dbContext.getCatalog()).products.length, 1);

let databaseTouched = false, paymentTouched = false;
const checkoutContext = vm.createContext({
  env: { MERCADOPAGO_ACCESS_TOKEN: 'test-never-used', SHIPPING_CENTS: '0' }, URL, Response,
  json: (data, status = 200) => Response.json(data, { status }),
  isDemoProductId: demoContext.isDemoProductId,
  database: () => { databaseTouched = true; throw new Error('Unexpected database access'); },
  fetch: async () => { paymentTouched = true; throw new Error('Unexpected payment request'); },
});
vm.runInContext(compile('app/api/checkout/route.ts'), checkoutContext);
const denied = await checkoutContext.POST(new Request('https://store.example/api/checkout', {
  method: 'POST', headers: { origin: 'https://store.example', 'content-type': 'application/json' },
  body: JSON.stringify({ items: [{ productId: catalog.products[0].id, quantity: 1 }] }),
}));
assert.equal(denied.status, 409);
assert.equal(databaseTouched, false);
assert.equal(paymentTouched, false);

const appSource = read('public/app.js').replace(/renderProducts\(\); renderCart\(\);\nPromise\.all\(\[loadCatalog\(\), loadMe\(\)\]\)[\s\S]*$/, '');
const elements = new Map(), handlers = new Map(), storage = new Map(), requests = [];
let currentCatalog = catalog;
function element(selector) {
  if (!elements.has(selector)) elements.set(selector, {
    textContent: '', innerHTML: '', value: '', max: '300', checked: false, open: false, hidden: false, listeners: new Map(),
    classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, focus() {}, scrollIntoView() {},
    addEventListener(name, callback) { this.listeners.set(name, callback); },
    showModal() { this.open = true; }, close() { this.open = false; },
  });
  return elements.get(selector);
}
const app = vm.createContext({
  window: { MANDALARIA_CONFIG: { whatsapp: '' } },
  document: { body: { style: {} }, querySelector: element,
    querySelectorAll: selector => selector === 'dialog[open]' ? [...elements.values()].filter(item => item.open) : [],
    addEventListener(name, callback) { handlers.set(name, [...handlers.get(name) || [], callback]); },
  },
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  location: { search: '' }, console, Intl, URLSearchParams,
  fetch: async url => { requests.push(url); if (url !== '/api/catalog') throw new Error('Unexpected API call'); return { ok: true, json: async () => currentCatalog }; },
});
const run = source => vm.runInContext(source, app);
const plain = value => JSON.parse(JSON.stringify(value));
const click = async (id = '', dataset = {}) => {
  const target = { id, dataset, matches: () => false, closest: () => target };
  await handlers.get('click')[0]({ target, preventDefault() {}, stopPropagation() {} });
};
vm.runInContext(appSource, app);
await run('loadCatalog()');
assert.equal(element('#catalogNotice').hidden, false);
assert.match(element('#productGrid').innerHTML, /Demonstração/);
for (const category of catalog.categories) {
  run(`activeCategory = ${JSON.stringify(category.name)}`);
  assert.equal(run('filteredProducts().length'), 2);
}
run("activeCategory = 'Todos'; searchTerm = 'lavanda'");
assert.equal(run('filteredProducts().length'), 1);
run("searchTerm = ''");
element('#maxPrice').value = '70';
assert.equal(run('filteredProducts().length'), 3);
element('#maxPrice').value = '300';
run("addToCart('demo-mandala-aurora')");
assert.equal(Number(element('#cartCount').textContent), 1);
const suggested = plain(run('cartRecommendations(cartEntries())'));
assert.equal(suggested.length, 3);
assert.equal(suggested[0].category, 'Porta-chaves');
assert.equal(suggested.some(item => item.id === 'demo-mandala-aurora'), false);
assert.equal(new Set(suggested.map(item => item.category)).size, 3);
await click('', { recommendAdd: suggested[0].id });
assert.equal(Number(element('#cartCount').textContent), 2);
assert.match(element('#cartSubtotal').textContent, /238/);
assert.equal(run(`cartRecommendations(cartEntries()).some(item => item.id === '${suggested[0].id}')`), false);
await click('', { cartInc: 'demo-mandala-aurora' });
assert.equal(run("cart['demo-mandala-aurora']"), 2);
await click('', { cartDec: 'demo-mandala-aurora' });
assert.equal(run("cart['demo-mandala-aurora']"), 1);
await click('', { cartRemove: suggested[0].id });
assert.equal(Number(element('#cartCount').textContent), 1);
run("addToCart('demo-mandala-aurora', 100)");
assert.equal(run("cart['demo-mandala-aurora']"), 12);
run("cart = {}; saveCart(); addToCart('demo-vela-lavanda'); addToCart('demo-incensario-luar')");
assert.equal(plain(run('cartRecommendations(cartEntries())')).some(item => item.id === 'demo-vela-lavanda' || item.id === 'demo-incensario-luar'), false);
element('#checkoutButton').listeners.get('click')();
assert.equal(element('#demoCheckoutDialog').open, true);
assert.equal(element('#checkoutDialog').open, false);
assert.match(element('#demoOrderTotal').textContent, /128/);
await click('demoBackToCart');
assert.equal(element('#demoCheckoutDialog').open, false);
run('openCheckout()');
await click('finishDemoOrder');
assert.equal(Number(element('#cartCount').textContent), 0);
assert.equal(element('#cartRecommendations').hidden, true);
assert.equal(element('#infoTitle').textContent, 'Teste concluído!');
assert.equal(requests.some(url => url.includes('checkout')), false);
run("cart = Object.fromEntries(products.map(item => [item.id, 1])); renderCart()");
assert.equal(element('#cartRecommendations').hidden, true);
currentCatalog = { demo: false, categories: [{ name: 'Mandalas' }], products: [{ ...catalog.products[0], id: 'real-one', demo: false }] };
await run('loadCatalog()');
assert.equal(run('Object.keys(cart).length'), 0);
assert.equal(element('#catalogNotice').hidden, true);
run("addToCart('real-one'); openCheckout()");
assert.equal(element('#checkoutDialog').open, true);
console.log('PASS: 8 exemplos/4 categorias; filtros e busca; carrinho, quantidades e remoção; sugestões complementares sem duplicação; simulação sem cobrança; bloqueio servidor; substituição pelo catálogo real.');
