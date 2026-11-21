const STORE_CONFIG = window.MANDALARIA_CONFIG;
const STORE_WHATSAPP = STORE_CONFIG.whatsappVerified === true && /^\d{10,15}$/.test(STORE_CONFIG.whatsapp || '') ? STORE_CONFIG.whatsapp : '';
const SALES_READY = STORE_CONFIG.salesReady === true;
const STORAGE_CART = 'mandalaria_cart_v2';
const $ = selector => document.querySelector(selector);
const currency = amount => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
let products = [];
let categories = [];
let adminProducts = [];
let adminCategories = [];
let adminOrders = [];
let me = { authenticated: false, admin: false };
let cart = load(STORAGE_CART, {});
let activeCategory = 'Todos';
let searchTerm = '';
let currentProduct = null;
let adminTab = 'products';
let adminEditing = null;
let roomPhotoUrl = null;
let arPendingReturn = false;
let arReturnGuardUntil = 0;
let catalogError = false;
let accountMode = 'signin';
let demoCatalog = false;
const categoryName = name => name === 'Velas artesanais aromáticas' ? 'Velas aromáticas' : name;

function openDialog(selector) { const dialog = $(selector); if (!dialog.open) dialog.showModal(); }
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }
let cartReturnFocus = null;
function cartBackground(inert) { document.querySelectorAll('main,.site-header,footer,.announcement,.storage-notice,.store-preparation').forEach(node => { node.inert = inert; }); }
function openCart() { if (!$('#cartDrawer').classList.contains('open')) cartReturnFocus = document.activeElement; closeDialogs(); cartBackground(true); $('#overlay').hidden = false; $('#cartDrawer').inert = false; $('#cartDrawer').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; $('#cartDrawer [data-close]').focus(); }
function closeCart() { const wasOpen = $('#cartDrawer').classList.contains('open'); $('#overlay').hidden = true; $('#cartDrawer').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); $('#cartDrawer').inert = true; document.body.style.overflow = ''; cartBackground(false); if (wasOpen) cartReturnFocus?.focus(); }
function contactStore(message = '') { if (!/^\d{10,15}$/.test(STORE_WHATSAPP)) { showInfo('Atendimento em preparação', 'O canal oficial ainda está pendente. Nenhum dado foi enviado. Consulte os dados da loja no rodapé.'); return; } location.href = `https://wa.me/${STORE_WHATSAPP}${message ? '?text=' + encodeURIComponent(message) : ''}`; }

function showInfo(title, text) { $('#infoTitle').textContent = title; $('#infoText').textContent = text; openDialog('#infoDialog'); }
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
function getAuthClient() {
  const client = window.MANDALARIA_AUTH;
  if (!client) throw new Error('Não foi possível carregar o login. Recarregue a página e tente novamente.');
  return client;
}
async function mutate(path, method, body) {
  return api(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
function displayProduct(item) {
  const parts = [item.widthCm, item.heightCm, item.depthCm].filter(value => value != null);
  return { ...item, category: categoryName(item.category), price: item.priceCents / 100, stock: !item.photoOnly && item.priceCents > 0 && (item.stockQuantity > 0 || item.madeToOrder),
    size: parts.length ? `${parts.join(' × ')} cm` : 'A definir',
    badge: item.demo ? 'Demonstração' : item.madeToOrder ? 'Sob encomenda' : item.featured ? 'Destaque' : 'Feito à mão',
    model: Boolean(item.glbUrl) };
}
async function loadCatalog() {
  try {
    const data = await api('/api/catalog');
    categories = [...new Set(data.categories.map(item => categoryName(item.name)))];
    demoCatalog = data.demo === true;
    products = data.products.map(displayProduct);
    const realMandala = products.find(item => !item.demo && item.category === 'Mandalas' && item.imageUrl);
    const categoryArt = $('.cat-mandalas .category-art');
    if (realMandala && categoryArt) {
      categoryArt.style.backgroundImage = `url(${JSON.stringify(realMandala.imageUrl)})`;
      categoryArt.style.backgroundSize = 'cover';
      categoryArt.style.backgroundPosition = 'center 55%';
    }
    cart = Object.fromEntries(Object.entries(cart).filter(([id, qty]) => products.some(item => item.id === id) && Number.isSafeInteger(qty) && qty > 0));
    try { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); } catch { /* O carrinho continua disponível nesta sessão. */ }
    if (activeCategory !== 'Todos' && !categories.includes(activeCategory)) activeCategory = 'Todos';
    catalogError = false;
    const highest = Math.max(300, ...products.map(item => Math.ceil(item.price / 50) * 50));
    $('#maxPrice').max = highest;
    $('#maxPrice').value = highest;
  } catch (error) {
    catalogError = true;
    categories = [];
    products = [];
    console.error(error);
  }
  renderProducts();
  renderCart();
}
async function loadMe() {
  try { me = await api('/api/me'); }
  catch { me = { authenticated: false, admin: false }; }
  $('#accountButton').setAttribute('aria-label', me.authenticated ? 'Minha conta' : 'Login');
  $('#adminDemo').textContent = me.authenticated ? 'Minha conta' : 'Login';
}
function renderCategories() {
  $('#categoryTabs').innerHTML = ['Todos', ...categories].map(category => {
    const label = category === 'Velas artesanais aromáticas' ? 'Velas aromáticas' : category;
    return `<button data-category="${escapeHtml(category)}" class="${category === activeCategory ? 'active' : ''}" aria-pressed="${category === activeCategory}">${escapeHtml(label)}</button>`;
  }).join('');
}
function filteredProducts() {
  const maxPrice = Number($('#maxPrice').value);
  const onlyStock = $('#stockOnly').checked;
  const query = searchTerm.toLocaleLowerCase('pt-BR');
  const list = products.filter(item => (activeCategory === 'Todos' || item.category === activeCategory) && item.price <= maxPrice && (!onlyStock || item.stock) && (!query || `${item.name} ${item.category} ${item.description} ${item.material}`.toLocaleLowerCase('pt-BR').includes(query)));
  const sort = $('#sortProducts').value;
  if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price);
  if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price);
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return list;
}
function photo(item, className) {
  if (item.demo && item.imagePosition) return `<span class="${className} demo-product-photo" role="img" aria-label="Imagem ilustrativa de ${escapeHtml(item.name)}" style="background-position:${escapeHtml(item.imagePosition)}"></span>`;
  return item.imageUrl ? `<img class="${className}" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<img class="${className} product-placeholder" src="assets/logo-symbol-transparent.png" alt="" aria-hidden="true">`;
}
function renderProducts() {
  renderCategories();
  const notice = $('#catalogNotice');
  notice.hidden = !demoCatalog && (products.length > 0 || catalogError);
  notice.textContent = demoCatalog ? (products.some(item => !item.demo) ? 'Mandalas com fotos reais. As demais peças são exemplos fictícios para testar a loja sem pagamentos.' : 'Catálogo de demonstração: produtos, imagens e preços fictícios. Teste o carrinho sem realizar pagamentos.') : 'O catálogo da loja está sendo preparado. Novos produtos aparecerão aqui quando forem publicados.';
  const list = filteredProducts();
  $('#resultsCount').textContent = `${list.length} ${list.length === 1 ? 'peça encontrada' : 'peças encontradas'}` + (searchTerm ? ` para “${searchTerm}”` : '');
  $('#noResults').hidden = list.length > 0;
  $('#noResults h3').textContent = catalogError ? 'Catálogo temporariamente indisponível' : products.length ? 'Nenhuma peça encontrada' : 'Novidades em breve';
  $('#emptyCatalogMessage').textContent = catalogError ? 'Tente novamente em alguns instantes.' : products.length ? 'Tente outro termo ou ajuste os filtros.' : 'Estamos preparando o catálogo com as peças reais da Mandalaria.';
  $('#productGrid').innerHTML = list.map(item => item.photoOnly
    ? `<article class="product-card photo-only-card"><button type="button" class="product-image real-product-image photo-only-open" data-open-product="${escapeHtml(item.id)}" aria-label="Ampliar foto de ${escapeHtml(item.name)}">${photo(item, 'product-photo')}</button></article>`
    : `<article class="product-card"><div class="product-image real-product-image"><button type="button" class="product-photo-open" data-open-product="${escapeHtml(item.id)}" aria-label="Ver ${escapeHtml(item.name)}">${photo(item, 'product-photo')}</button><span class="product-badge">${escapeHtml(item.badge)}</span>${item.stock ? `<button class="quick-add" data-add="${escapeHtml(item.id)}" aria-label="Adicionar ${escapeHtml(item.name)} ao carrinho">+</button>` : ''}</div><div class="product-meta"><div><div class="product-category">${escapeHtml(item.category)}</div><div class="product-name">${escapeHtml(item.name)}</div><div class="product-price">${currency(item.price)}</div></div></div><div class="product-actions"><button data-open-product="${escapeHtml(item.id)}">Ver detalhes</button>${item.model ? `<button data-open-3d="${escapeHtml(item.id)}">◈ Ver em 3D</button>` : ''}</div></article>`).join('');
  const count = ($('#maxPrice').value !== $('#maxPrice').max ? 1 : 0) + ($('#stockOnly').checked ? 1 : 0);
  $('#activeFilterCount').textContent = count ? `(${count})` : '';
  $('#priceLabel').textContent = currency(Number($('#maxPrice').value));
}
function saveCart() { try { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); } catch { /* Mantém o carrinho em memória. */ } renderCart(); }
function quantityLimit(item) { return item.madeToOrder ? 50 : Math.min(50, item.stockQuantity); }
function cartEntries() {
  return Object.entries(cart).map(([id, qty]) => ({ item: products.find(product => product.id === id), qty })).filter(entry => entry.item && Number.isSafeInteger(entry.qty) && entry.qty > 0);
}
function addToCart(id, qty = 1) {
  const item = products.find(product => product.id === id && product.stock);
  if (!item || !Number.isSafeInteger(qty) || qty < 1) return;
  const current = cart[id] || 0;
  cart[id] = Math.min(current + qty, quantityLimit(item));
  saveCart(); openCart();
  $('#cartStatus').textContent = cart[id] === current ? 'Você já selecionou a quantidade disponível desta peça.' : `${item.name} adicionado ao carrinho.`;
}
function cartRecommendations(entries) {
  if (!entries.length) return [];
  const selected = new Set(entries.map(({ item }) => item.id));
  const selectedCategories = new Set(entries.map(({ item }) => item.category));
  const complements = { 'Mandalas': 'Porta-chaves', 'Porta-chaves': 'Mandalas', 'Incensários': 'Velas aromáticas', 'Velas aromáticas': 'Incensários' };
  const complementaryCategories = new Set([...selectedCategories].map(category => complements[category]));
  const score = item => (complementaryCategories.has(item.category) ? 4 : 0) + (!selectedCategories.has(item.category) ? 2 : 0) + (item.featured ? 1 : 0);
  const candidates = products.filter(item => item.stock && !selected.has(item.id)).sort((a, b) => score(b) - score(a) || a.price - b.price);
  const chosen = [], usedCategories = new Set();
  for (const item of candidates) {
    if (!usedCategories.has(item.category)) { chosen.push(item); usedCategories.add(item.category); }
    if (chosen.length === 3) return chosen;
  }
  return [...chosen, ...candidates.filter(item => !chosen.includes(item))].slice(0, 3);
}
function renderRecommendations(entries) {
  const suggestions = cartRecommendations(entries);
  $('#cartRecommendations').hidden = !suggestions.length;
  $('#cartRecommendationsList').innerHTML = suggestions.map(item => `<article class="cart-recommendation"><div class="recommendation-photo">${photo(item, 'cart-photo')}</div><div><small>${escapeHtml(item.category)}</small><strong>${escapeHtml(item.name)}</strong><span>${currency(item.price)}</span></div><button type="button" data-recommend-add="${escapeHtml(item.id)}" aria-label="Adicionar ${escapeHtml(item.name)} ao carrinho">+ Adicionar</button></article>`).join('');
}
function openCheckout() {
  const entries = cartEntries();
  if (!entries.length) return;
  closeCart();
  if (entries.some(({ item }) => item.demo)) {
    $('#demoOrderSummary').innerHTML = entries.map(({ item, qty }) => `<div class="demo-summary-line"><span>${qty} × ${escapeHtml(item.name)}</span><strong>${currency(item.price * qty)}</strong></div>`).join('');
    $('#demoOrderTotal').textContent = currency(entries.reduce((sum, { item, qty }) => sum + item.price * qty, 0));
    openDialog('#demoCheckoutDialog');
    return;
  }
  if (!SALES_READY) { showInfo('Loja em preparação', 'Compras reais estão indisponíveis até a conclusão dos dados legais da loja.'); return; }
  openDialog('#checkoutDialog');
}
function renderCart() {
  $('#cartStatus').textContent = '';
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const total = entries.reduce((sum, entry) => sum + entry.qty * entry.item.price, 0);
  $('#cartCount').textContent = count; $('#cartCountTitle').textContent = `(${count})`; $('#cartSubtotal').textContent = currency(total);
  $('#cartItems').innerHTML = entries.length ? entries.map(({ item, qty }) => `<div class="cart-item"><div class="cart-thumb real-cart-thumb">${photo(item, 'cart-photo')}</div><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}</small><div class="qty-control"><button data-cart-dec="${escapeHtml(item.id)}" aria-label="Diminuir quantidade">−</button><span>${qty}</span><button data-cart-inc="${escapeHtml(item.id)}" aria-label="Aumentar quantidade" ${qty >= quantityLimit(item) ? 'disabled' : ''}>+</button></div><br><button class="remove-item" data-cart-remove="${escapeHtml(item.id)}">Remover</button></div><div class="cart-item-price">${currency(item.price * qty)}</div></div>`).join('') : `<div class="empty-cart"><span>✺</span><h3>Seu carrinho está vazio</h3><p>Encontre uma peça que combine com seu espaço e volte aqui.</p></div>`;
  $('#checkoutButton').disabled = !entries.length;
  const isDemo = demoCatalog || entries.some(({ item }) => item.demo);
  $('#checkoutButton').textContent = isDemo ? 'Simular finalização ↗' : 'Finalizar compra ↗';
  $('#cartShippingNote').textContent = isDemo ? 'Valores ilustrativos. Nenhum frete ou pagamento será cobrado.' : 'Frete fixo informado na finalização do pedido.';
  $('#cartPaymentNote').textContent = isDemo ? 'Demonstração sem pedido ou cobrança reais.' : (SALES_READY ? 'Pagamento processado pelo Mercado Pago.' : 'Compras reais indisponíveis: dados da loja pendentes.');
  renderRecommendations(entries);
}
function openProduct(id, showModel = false) {
  const item = products.find(product => product.id === id); if (!item) return;
  currentProduct = id;
  if (item.photoOnly) {
    $('#productDetail').innerHTML = `<div class="photo-only-detail">${photo(item, 'detail-photo')}</div>`;
    closeCart(); closeDialogs(); openDialog('#productDialog');
    return;
  }
  $('#productDetail').innerHTML = `<div class="product-detail-grid"><div class="detail-image real-detail-image">${photo(item, 'detail-photo')}</div><div class="detail-copy"><div class="product-category">${escapeHtml(item.category)} · PEÇA ARTESANAL</div><h2>${escapeHtml(item.name)}</h2><div class="detail-price">${currency(item.price)}</div><p>${escapeHtml(item.description)}</p><ul><li><strong>Dimensões:</strong> ${escapeHtml(item.size)}</li><li><strong>Materiais:</strong> ${escapeHtml(item.material || 'A definir')}</li><li><strong>Produção:</strong> feita à mão</li></ul><div class="detail-actions"><div class="qty-control"><button id="detailDec" aria-label="Diminuir quantidade">−</button><span id="detailQty">1</span><button id="detailInc" aria-label="Aumentar quantidade">+</button></div><button class="button button-dark" id="detailAdd" ${item.stock ? '' : 'disabled'}>${item.stock ? 'Adicionar ao carrinho ↗' : 'Indisponível'}</button></div>${item.model ? `<div class="model-viewer-wrap"><button class="model-trigger" id="modelTrigger">◈ Ver em 3D na parede</button><div class="model-box ${showModel ? 'open' : ''}" id="modelBox"><p class="preview-intro">A visualização depende das medidas e do modelo 3D cadastrados para esta peça.</p><model-viewer id="arViewer" src="${escapeHtml(item.glbUrl)}" ${item.imageUrl ? `poster="${escapeHtml(item.imageUrl)}"` : ''} ${item.usdzUrl ? `ios-src="${escapeHtml(item.usdzUrl)}"` : ''} alt="Modelo 3D de ${escapeHtml(item.name)}" ar ar-modes="scene-viewer quick-look webxr" ar-placement="wall" ar-scale="auto" interaction-prompt="none" shadow-intensity="0.4"></model-viewer><button type="button" class="button button-terracotta full-button" id="arStart" disabled>Carregando visualização...</button><p class="ar-support" id="arSupport">Aguarde o carregamento para verificar a compatibilidade do aparelho.</p>${item.imageUrl ? `<details class="room-preview"><summary>Ver em uma foto do meu ambiente</summary><p>Envie uma foto da parede e arraste a peça para testar a composição. A foto fica apenas no seu aparelho.</p><label class="room-upload">Escolher foto da parede<input id="roomPhotoInput" type="file" accept="image/*"></label><div class="room-canvas" id="roomCanvas" hidden><img id="roomImage" alt="Foto do seu ambiente"><img id="roomProduct" tabindex="0" role="img" aria-label="Posicionar produto: use as setas do teclado" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)} sobreposta à foto"></div><label class="room-scale" id="roomScaleLabel" hidden>Tamanho na foto<input id="roomScale" type="range" min="15" max="65" value="32"></label></details>` : ''}</div></div>` : ''}</div></div>`;
  if (item.model) setupPreview();
  closeCart(); openDialog('#productDialog');
}
function setupPreview() {
  const viewer = $('#arViewer'), button = $('#arStart'), support = $('#arSupport');
  const update = () => { const available = Boolean(viewer.canActivateAR); button.disabled = !available; button.textContent = available ? 'Abrir câmera e posicionar na parede ↗' : 'AR indisponível neste aparelho'; support.textContent = available ? 'Aponte a câmera para uma parede bem iluminada e mova o celular devagar.' : 'Use a visualização 3D ou a opção com foto do ambiente.'; };
  viewer.addEventListener('load', update);
  viewer.addEventListener('error', () => { button.disabled = true; button.textContent = 'Não foi possível carregar o modelo 3D'; support.textContent = 'Confira o arquivo 3D cadastrado para este produto.'; });
  viewer.addEventListener('ar-status', event => { if (arPendingReturn && ['not-presenting', 'failed'].includes(event.detail?.status)) { arReturnGuardUntil = Date.now() + 2200; arPendingReturn = false; } });
  customElements.whenDefined('model-viewer').then(() => setTimeout(update, 100));
  const roomProduct = $('#roomProduct'), roomCanvas = $('#roomCanvas');
  if (!roomProduct) return;
  let dragging = false;
  roomProduct.addEventListener('pointerdown', event => { dragging = true; roomProduct.setPointerCapture(event.pointerId); event.preventDefault(); });
  roomProduct.addEventListener('pointermove', event => { if (!dragging) return; const rect = roomCanvas.getBoundingClientRect(); roomProduct.style.left = `${Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))}%`; roomProduct.style.top = `${Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))}%`; });
  roomProduct.addEventListener('keydown', event => { const delta = {ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]}[event.key]; if (!delta) return; event.preventDefault(); roomProduct.style.left = `${Math.max(0,Math.min(100,(parseFloat(roomProduct.style.left)||50)+delta[0]))}%`; roomProduct.style.top = `${Math.max(0,Math.min(100,(parseFloat(roomProduct.style.top)||50)+delta[1]))}%`; });
  roomProduct.addEventListener('pointerup', () => { dragging = false; });
  roomProduct.addEventListener('pointercancel', () => { dragging = false; });
}
function updateSearch() { searchTerm = $('#searchInput').value.trim(); $('#catalogSearch').value = searchTerm; activeCategory = 'Todos'; renderProducts(); closeDialogs(); $('#colecao').scrollIntoView({ behavior: 'smooth' }); }
function makeOrderMessage(form) { const data = Object.fromEntries(new FormData(form).entries()); return `Olá! Gostaria de solicitar uma encomenda personalizada na Mandalaria D'ogum.\n\n*Nome:* ${data.name.trim()}\n*Tipo de peça:* ${data.type}\n*Cores desejadas:* ${data.colors.trim()}\n*Tamanho:* ${data.size}\n*Prazo desejado:* ${data.deadline || 'A combinar'}\n*Orçamento:* ${data.budget}\n*Detalhes:* ${data.details.trim() || 'A conversar'}\n\nPodemos conversar sobre o projeto?`; }
function renderAccount() {
  const host = $('#accountContent');
  $('#accountTitle').textContent = me.authenticated ? 'Minha conta' : accountMode === 'signup' ? 'Criar conta' : 'Login';
  if (accountMode === 'reset') {
    $('#accountTitle').textContent = me.authenticated ? 'Criar ou redefinir senha' : 'Recuperar senha';
    host.innerHTML = `<p>Receba um código no seu e-mail e escolha uma senha para a loja. Isso não altera a senha da sua conta Google.</p><form id="passwordResetForm" class="admin-form"><label>E-mail<input id="passwordResetEmail" name="email" type="email" autocomplete="email" required ${me.authenticated ? `value="${escapeHtml(me.email)}" readonly` : ''}></label><button type="button" class="button button-outline full-button" id="sendPasswordResetCode">Enviar código</button><label>Código recebido<input name="otp" inputmode="numeric" autocomplete="one-time-code" required></label><label>Nova senha<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label><label>Confirmar nova senha<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label><p>Use de 8 a 128 caracteres. Após salvar, entre novamente com a nova senha.</p><button type="submit" class="button button-dark full-button">Salvar nova senha</button>${me.authenticated ? '<button type="button" class="text-button" id="backToAccount">Voltar à minha conta</button>' : '<button type="button" class="text-button" data-auth-mode="signin">Voltar ao login</button>'}</form><p id="authMessage" class="auth-message" role="status" aria-live="polite"></p>`;
    return;
  }
  if (me.authenticated && accountMode === 'password') {
    $('#accountTitle').textContent = 'Alterar senha';
    host.innerHTML = `<p>Altere a senha de acesso à loja. Os outros acessos à sua conta serão encerrados.</p><form id="changePasswordForm" class="admin-form"><label>Senha atual<input name="currentPassword" type="password" autocomplete="current-password" required maxlength="128"></label><label>Nova senha<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label><label>Confirmar nova senha<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label><p>Use de 8 a 128 caracteres e uma senha diferente da atual.</p><button type="submit" class="button button-dark full-button">Salvar nova senha</button><button type="button" class="text-button" id="resetPasswordFromAccount">Criar ou redefinir senha por e-mail</button><button type="button" class="text-button" id="backToAccount">Voltar à minha conta</button></form><p id="authMessage" class="auth-message" role="status" aria-live="polite"></p>`;
    return;
  }
  if (!me.authenticated) {
    host.innerHTML = `<p>${accountMode === 'signup' ? 'Crie sua conta com Google ou cadastre seu e-mail.' : 'Acesse sua conta com Google ou com seu e-mail e senha.'}</p><div class="account-mode-options" role="group" aria-label="Acessar ou criar conta"><button type="button" data-auth-mode="signin" aria-pressed="${accountMode === 'signin'}">Entrar</button><button type="button" data-auth-mode="signup" aria-pressed="${accountMode === 'signup'}">Criar conta</button></div><button type="button" class="button google-login-button full-button" id="googleSignIn"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg><span>Continuar com Google</span></button><div class="auth-divider"><span>ou use seu e-mail</span></div><form id="accountAuthForm" class="admin-form">${accountMode === 'signup' ? '<label>Nome<input name="name" required autocomplete="name" maxlength="100"></label>' : ''}<label>E-mail<input name="email" type="email" required autocomplete="email"></label><label>Senha<input name="password" type="password" required minlength="8" autocomplete="${accountMode === 'signup' ? 'new-password' : 'current-password'}"></label><p class="form-privacy">Nome e e-mail são usados para sua conta. Ao continuar com Google, o provedor compartilha os dados necessários ao login. <a href="legal/privacidade.html" target="_blank" rel="noopener">Privacidade</a> · <a href="legal/termos.html" target="_blank" rel="noopener">Termos de uso</a>.</p><button class="button button-dark full-button" type="submit">${accountMode === 'signup' ? 'Criar conta' : 'Entrar'}</button>${accountMode === 'signin' ? '<button class="text-button" type="button" id="forgotPassword">Esqueci minha senha</button>' : ''}</form><p id="authMessage" class="auth-message" role="status" aria-live="polite"></p>`;
    return;
  }
  const verification = !me.emailVerified && me.emailVerificationRequired !== false ? `<form id="verifyEmailForm" class="admin-form"><p>Confirme seu e-mail para ativar sua conta.</p><label>Código de verificação<input name="otp" inputmode="numeric" autocomplete="one-time-code" required></label><button class="button button-dark full-button" type="submit">Verificar e-mail</button><button class="text-button" type="button" id="sendVerificationCode">Enviar código de verificação</button><p id="authMessage" role="status"></p></form>` : '';
  host.innerHTML = `<p>Conectado como <strong>${escapeHtml(me.displayName || me.email)}</strong><br><small>${escapeHtml(me.email)}</small></p>${verification}${me.admin ? '<button class="button button-terracotta full-button" id="openAdminFromAccount">Abrir painel da loja</button>' : me.emailVerified ? '<p role="status">Você está conectado à sua conta.</p>' : ''}<button type="button" class="button button-outline full-button account-link" id="changePasswordButton">Alterar senha</button><p id="accountMessage" role="status" aria-live="polite"></p><button class="button button-outline full-button account-link" id="signOutButton">Sair da conta</button>`;
}
function validateNewPassword(password, confirmation) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('A nova senha deve ter de 8 a 128 caracteres.');
  if (password !== confirmation) throw new Error('A confirmação da nova senha não confere.');
}
async function openAccount() {
  if (window.MANDALARIA_CONFIG.staticMode) {
    location.assign('https://mandalaria-dogum.vertice-digital.workers.dev/?login=1');
    return;
  }
  await loadMe();
  if (!me.authenticated) accountMode = 'signin';
  renderAccount();
  closeDialogs();
  openDialog('#accountDialog');
}
async function openAdmin() {
  if (window.MANDALARIA_CONFIG.staticMode) {
    location.assign('https://mandalaria-dogum.vertice-digital.workers.dev/?admin=1');
    return;
  }
  await loadMe();
  if (!me.authenticated) accountMode = 'signin';
  if (!me.admin) { renderAccount(); openDialog('#accountDialog'); return; }
  try {
    const data = await api('/api/admin/catalog');
    adminProducts = data.products.map(displayProduct); adminCategories = data.categories;
    adminTab = 'products'; renderAdmin(); closeDialogs(); openDialog('#adminDialog');
  } catch (error) { showInfo('Painel indisponível', error.message); }
}
function renderAdmin() {
  document.querySelectorAll('[data-admin-tab]').forEach(button => button.classList.toggle('selected', button.dataset.adminTab === adminTab));
  const host = $('#adminContent');
  if (adminTab === 'products') {
    host.innerHTML = `<button class="button button-terracotta admin-new" id="adminNew">+ Novo produto</button><div id="adminFormHost"></div><div>${adminProducts.map(item => `<div class="admin-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${item.photoOnly ? 'Preço a definir' : currency(item.price)} · ${item.status === 'active' ? (item.photoOnly ? 'Foto publicada' : 'Publicado') : item.status === 'draft' ? 'Rascunho' : 'Arquivado'}</small></div><div><button data-admin-edit="${escapeHtml(item.id)}">Editar</button><button data-admin-delete="${escapeHtml(item.id)}">Excluir</button></div></div>`).join('') || '<p class="admin-empty">Nenhum produto cadastrado.</p>'}</div>`;
  } else if (adminTab === 'categories') {
    host.innerHTML = `<form id="categoryForm" class="admin-form"><h3>Adicionar categoria</h3><div class="form-grid"><label>Nome<input name="name" required placeholder="Ex.: Mandalas"></label><label>Descrição<input name="description" placeholder="Opcional"></label></div><button class="button button-terracotta" type="submit">Adicionar</button></form><div>${adminCategories.map(item => `<div class="admin-row"><div><strong>${escapeHtml(item.name)}</strong><small>${item.active ? 'Visível' : 'Oculta'}</small></div><div><button data-category-edit="${escapeHtml(item.id)}">Editar</button><button data-category-delete="${escapeHtml(item.id)}">Excluir</button></div></div>`).join('') || '<p class="admin-empty">Nenhuma categoria cadastrada.</p>'}</div>`;
  } else {
    const statusLabels = { pending_payment: 'Aguardando pagamento', paid: 'Pago', preparing: 'Em preparação', shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado' };
    host.innerHTML = adminOrders.map(order => {
      const address = order.shipping_address || {};
      const editable = order.payment_status === 'approved' && ['paid', 'preparing', 'shipped'].includes(order.status);
      const nextStatus = order.status === 'paid' ? 'preparing' : order.status === 'preparing' ? 'shipped' : 'delivered';
      const items = (order.items || []).map(item => `${escapeHtml(item.quantity)} × ${escapeHtml(item.name)}`).join(', ');
      return `<div class="admin-row order-row"><div><strong>Pedido ${escapeHtml(order.id.slice(0, 8))} · ${currency(Number(order.total_cents) / 100)}</strong><small>${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_email)} · ${escapeHtml(order.customer_phone || '')}</small><small>${items}</small><small>${escapeHtml(address.street || '')}, ${escapeHtml(address.number || '')} · ${escapeHtml(address.neighborhood || '')} · ${escapeHtml(address.city || '')}/${escapeHtml(address.state || '')} · CEP ${escapeHtml(address.zipCode || '')}</small><small>${statusLabels[order.status] || escapeHtml(order.status)} · pagamento ${escapeHtml(order.payment_status)} · ${new Date(order.created_at).toLocaleString('pt-BR')}</small></div>${editable ? `<button data-order-save="${escapeHtml(order.id)}" data-next-status="${nextStatus}">Marcar ${nextStatus === 'preparing' ? 'em preparação' : nextStatus === 'shipped' ? 'como enviado' : 'como entregue'}</button>` : ''}</div>`;
    }).join('') || '<p class="admin-empty">Ainda não há pedidos.</p>';
  }
}
function renderAdminForm(id = null) {
  adminEditing = id;
  const item = id ? adminProducts.find(product => product.id === id) : null;
  $('#adminFormHost').innerHTML = `<form id="productForm" class="admin-form"><h3>${item ? 'Editar produto' : 'Novo produto'}</h3><p class="admin-price-help">Com preço 0, a vitrine mostra apenas a foto. Informe preço e estoque para preparar a venda; compras reais também dependem da conclusão dos dados legais da loja.</p><div class="form-grid"><label>Nome<input name="name" required maxlength="140" value="${escapeHtml(item?.name || '')}"></label><label>Categoria<select name="categoryId" required><option value="">Selecione</option>${adminCategories.map(cat => `<option value="${escapeHtml(cat.id)}" ${item?.categoryId === cat.id ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`).join('')}</select></label><label>Preço (R$; 0 = apenas foto)<input name="price" type="number" min="0" step="0.01" required value="${item ? item.price.toFixed(2) : ''}"></label><label>Estoque<input name="stockQuantity" type="number" min="0" step="1" required value="${item?.stockQuantity ?? 0}"></label><label>Largura (cm)<input name="widthCm" type="number" min="0.01" step="0.01" value="${item?.widthCm ?? ''}"></label><label>Altura (cm)<input name="heightCm" type="number" min="0.01" step="0.01" value="${item?.heightCm ?? ''}"></label><label>Profundidade (cm)<input name="depthCm" type="number" min="0.01" step="0.01" value="${item?.depthCm ?? ''}"></label><label>Materiais<input name="materials" maxlength="500" value="${escapeHtml(item?.material || '')}"></label><label>Estado<select name="status"><option value="draft" ${item?.status !== 'active' && item?.status !== 'archived' ? 'selected' : ''}>Rascunho</option><option value="active" ${item?.status === 'active' ? 'selected' : ''}>Publicado</option><option value="archived" ${item?.status === 'archived' ? 'selected' : ''}>Arquivado</option></select></label><label>Tipo<select name="madeToOrder"><option value="false" ${!item?.madeToOrder ? 'selected' : ''}>Pronta entrega</option><option value="true" ${item?.madeToOrder ? 'selected' : ''}>Sob encomenda</option></select></label><label>Foto (URL HTTPS, opcional)<input name="imageUrl" type="text" inputmode="url" placeholder="https://..." value="${escapeHtml(item?.imageUrl || '')}"></label><label>Enviar foto (JPG/PNG/WebP, até 10 MB)<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Modelo 3D GLB (URL HTTPS, opcional)<input name="glbUrl" type="text" inputmode="url" placeholder="https://..." value="${escapeHtml(item?.glbUrl || '')}"></label><label>Enviar modelo GLB (até 50 MB)<input name="glbFile" type="file" accept=".glb,model/gltf-binary"></label><label>Modelo iPhone USDZ (URL HTTPS, opcional)<input name="usdzUrl" type="text" inputmode="url" placeholder="https://..." value="${escapeHtml(item?.usdzUrl || '')}"></label><label>Enviar modelo USDZ (até 50 MB)<input name="usdzFile" type="file" accept=".usdz,model/vnd.usdz+zip"></label><label>Destaque<select name="featured"><option value="false" ${!item?.featured ? 'selected' : ''}>Não</option><option value="true" ${item?.featured ? 'selected' : ''}>Sim</option></select></label></div><label class="admin-wide">Descrição<textarea name="description" rows="4" maxlength="4000">${escapeHtml(item?.description || '')}</textarea></label><button class="button button-dark" type="submit">Salvar produto</button><button type="button" class="text-button" id="cancelAdminForm">Cancelar</button></form>`;
}
async function refreshAdminAndCatalog() { const data = await api('/api/admin/catalog'); adminProducts = data.products.map(displayProduct); adminCategories = data.categories; await loadCatalog(); if (adminTab === 'orders') { const orders = await api('/api/admin/orders'); adminOrders = orders.orders; } renderAdmin(); }
async function uploadMedia(file) {
  const form = new FormData(); form.append('file', file);
  const response = await fetch('/api/media', { method: 'POST', credentials: 'same-origin', body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o arquivo.');
  return result.url;
}
async function submitProduct(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const fileOrUrl = async (field, fileField) => data[fileField]?.size ? uploadMedia(data[fileField]) : data[field];
  const [imageUrl, glbUrl, usdzUrl] = await Promise.all([
    fileOrUrl('imageUrl', 'imageFile'), fileOrUrl('glbUrl', 'glbFile'), fileOrUrl('usdzUrl', 'usdzFile'),
  ]);
  const priceCents = Math.round(Number(data.price) * 100);
  const body = { id: adminEditing, name: data.name, categoryId: data.categoryId, priceCents,
    stockQuantity: Number(data.stockQuantity), widthCm: data.widthCm, heightCm: data.heightCm,
    depthCm: data.depthCm, materials: data.materials, description: data.description,
    status: data.status, madeToOrder: data.madeToOrder === 'true', featured: data.featured === 'true',
    imageUrl, glbUrl, usdzUrl };
  await mutate('/api/admin/products', adminEditing ? 'PATCH' : 'POST', body);
  await refreshAdminAndCatalog();
}
async function submitCategory(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  await mutate('/api/admin/categories', 'POST', { name: data.name, description: data.description });
  await refreshAdminAndCatalog();
}

document.addEventListener('click', async event => {
  const target = event.target.closest('button,[data-open-product]'); if (!target) return;
  if (Date.now() < arReturnGuardUntil && (target.dataset.add || target.id === 'detailAdd')) { event.preventDefault(); event.stopPropagation(); return; }
  if (target.matches('[data-close]')) { closeDialogs(); closeCart(); return; }
  if (target.dataset.recommendAdd) {
    addToCart(target.dataset.recommendAdd);
    ($('#cartRecommendationsList button') || $('#checkoutButton')).focus();
    return;
  }
  if (target.dataset.add) { event.stopPropagation(); addToCart(target.dataset.add); return; }
  if (target.dataset.open3d) { openProduct(target.dataset.open3d, true); return; }
  if (target.dataset.openProduct) { openProduct(target.dataset.openProduct); return; }
  if (target.dataset.category && target.closest('#categoryTabs')) { activeCategory = categoryName(target.dataset.category); renderProducts(); return; }
  if (target.dataset.category && target.closest('.category-cards')) { activeCategory = categoryName(target.dataset.category); renderProducts(); $('#colecao').scrollIntoView({ behavior: 'smooth' }); return; }
  if (target.dataset.cartInc) { addToCart(target.dataset.cartInc); return; }
  if (target.dataset.cartDec) { cart[target.dataset.cartDec]--; if (cart[target.dataset.cartDec] <= 0) delete cart[target.dataset.cartDec]; saveCart(); return; }
  if (target.dataset.cartRemove) { delete cart[target.dataset.cartRemove]; saveCart(); return; }
  if (target.id === 'detailInc') { const item = products.find(product => product.id === currentProduct); if (item) $('#detailQty').textContent = Math.min(quantityLimit(item), Number($('#detailQty').textContent) + 1); return; }
  if (target.id === 'detailDec') { $('#detailQty').textContent = Math.max(1, Number($('#detailQty').textContent) - 1); return; }
  if (target.id === 'detailAdd') { const qty = Number($('#detailQty').textContent); closeDialogs(); addToCart(currentProduct, qty); return; }
  if (target.id === 'modelTrigger') { $('#modelBox').classList.toggle('open'); return; }
  if (target.id === 'arStart') { const viewer = $('#arViewer'); if (viewer?.canActivateAR) { arPendingReturn = true; arReturnGuardUntil = Date.now() + 2200; Promise.resolve(viewer.activateAR()).catch(() => { arPendingReturn = false; showInfo('AR indisponível', 'Não foi possível abrir a câmera neste aparelho.'); }); } return; }
  if (target.id === 'openAdminFromAccount') { await openAdmin(); return; }
  if (target.dataset.authMode) { accountMode = target.dataset.authMode === 'signup' ? 'signup' : 'signin'; renderAccount(); return; }
  if (target.id === 'googleSignIn') {
    const button = $('#googleSignIn'), message = $('#authMessage');
    button.disabled = true; message.textContent = 'Abrindo o Google...';
    try {
      const result = await getAuthClient().signIn.social({
        provider: 'google',
        callbackURL: `${location.origin}/?login=1&auth=google`,
        errorCallbackURL: `${location.origin}/?login=1&auth=error`,
      });
      if (result.error) throw new Error(result.error.message || 'Não foi possível entrar com Google.');
    } catch (error) { message.textContent = error.message; button.disabled = false; }
    return;
  }
  if (target.id === 'changePasswordButton') {
    target.disabled = true;
    try {
      const result = await getAuthClient().listAccounts();
      if (result.error) throw new Error(result.error.message || 'Não foi possível consultar sua conta.');
      if (!Array.isArray(result.data)) throw new Error('Não foi possível identificar o tipo de acesso.');
      accountMode = result.data.some(account => account.providerId === 'credential') ? 'password' : 'reset';
      renderAccount();
    } catch (error) { $('#accountMessage').textContent = error.message; target.disabled = false; }
    return;
  }
  if (target.id === 'resetPasswordFromAccount') { accountMode = 'reset'; renderAccount(); return; }
  if (target.id === 'backToAccount') { accountMode = 'signin'; renderAccount(); return; }
  if (target.id === 'forgotPassword') { accountMode = 'reset'; renderAccount(); return; }
  if (target.id === 'sendPasswordResetCode') {
    const input = $('#passwordResetEmail');
    if (!input.reportValidity()) return;
    target.disabled = true;
    try {
      const result = await getAuthClient().emailOtp.sendVerificationOtp({ email: me.authenticated ? me.email : input.value.trim(), type: 'forget-password' });
      if (result.error) throw new Error(result.error.message || 'Não foi possível enviar o código.');
      $('#authMessage').textContent = 'Se houver uma conta com esse e-mail, você receberá um código para alterar a senha.';
    } catch (error) { $('#authMessage').textContent = error.message; }
    finally { target.disabled = false; }
    return;
  }
  if (target.id === 'toggleAuthMode') { accountMode = accountMode === 'signup' ? 'signin' : 'signup'; renderAccount(); return; }
  if (target.id === 'sendVerificationCode') {
    try {
      const result = await getAuthClient().emailOtp.sendVerificationOtp({ email: me.email, type: 'email-verification' });
      if (result.error) throw new Error(result.error.message || 'Não foi possível enviar o código.');
      $('#authMessage').textContent = 'Enviamos um novo código para seu e-mail.';
    } catch (error) { $('#authMessage').textContent = error.message; }
    return;
  }
  if (target.id === 'signOutButton') {
    try {
      const result = await getAuthClient().signOut();
      if (result.error) throw new Error(result.error.message || 'Não foi possível sair.');
      await loadMe(); accountMode = 'signin'; renderAccount();
    }
    catch (error) { showInfo('Não foi possível sair', error.message); }
    return;
  }
  if (target.id === 'adminNew') { renderAdminForm(); return; }
  if (target.dataset.adminEdit) { renderAdminForm(target.dataset.adminEdit); return; }
  if (target.dataset.adminDelete) { const item = adminProducts.find(product => product.id === target.dataset.adminDelete); if (item && confirm(`Excluir ${item.name} da loja?`)) { try { await mutate('/api/admin/products', 'DELETE', { id: item.id }); delete cart[item.id]; saveCart(); await refreshAdminAndCatalog(); } catch (error) { showInfo('Não foi possível excluir', error.message); } } return; }
  if (target.dataset.adminTab) {
    adminTab = target.dataset.adminTab;
    try { if (adminTab === 'orders') { const data = await api('/api/admin/orders'); adminOrders = data.orders; } renderAdmin(); }
    catch (error) { showInfo('Não foi possível carregar pedidos', error.message); }
    return;
  }
  if (target.dataset.orderSave) {
    try { await mutate('/api/admin/orders', 'PATCH', { id: target.dataset.orderSave, status: target.dataset.nextStatus }); const data = await api('/api/admin/orders'); adminOrders = data.orders; renderAdmin(); }
    catch (error) { showInfo('Não foi possível atualizar o pedido', error.message); }
    return;
  }
  if (target.dataset.categoryEdit) { const item = adminCategories.find(cat => cat.id === target.dataset.categoryEdit); const name = prompt('Nome da categoria:', item?.name)?.trim(); if (item && name) { try { await mutate('/api/admin/categories', 'PATCH', { ...item, name }); await refreshAdminAndCatalog(); } catch (error) { showInfo('Não foi possível editar', error.message); } } return; }
  if (target.dataset.categoryDelete) { const item = adminCategories.find(cat => cat.id === target.dataset.categoryDelete); if (item && confirm(`Excluir a categoria ${item.name}?`)) { try { await mutate('/api/admin/categories', 'DELETE', { id: item.id }); activeCategory = 'Todos'; await refreshAdminAndCatalog(); } catch (error) { showInfo('Não foi possível excluir', error.message); } } return; }
  if (target.id === 'demoBackToCart') { closeDialogs(); openCart(); return; }
  if (target.id === 'finishDemoOrder') { cart = {}; saveCart(); closeDialogs(); showInfo('Teste concluído!', 'Você testou a escolha de produtos e a finalização do carrinho. Nenhum pedido foi enviado e nenhum pagamento foi cobrado. Continue explorando a loja.'); return; }
  if (target.id === 'cancelAdminForm') { $('#adminFormHost').innerHTML = ''; return; }
});
document.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-product][role="button"]')) { event.preventDefault(); openProduct(event.target.dataset.openProduct); } });
document.addEventListener('change', event => { if (event.target.id !== 'roomPhotoInput') return; const file = event.target.files?.[0]; if (!file || !file.type.startsWith('image/')) return; if (roomPhotoUrl) URL.revokeObjectURL(roomPhotoUrl); roomPhotoUrl = URL.createObjectURL(file); $('#roomImage').src = roomPhotoUrl; $('#roomCanvas').hidden = false; $('#roomScaleLabel').hidden = false; });
document.addEventListener('input', event => { if (event.target.id === 'roomScale') $('#roomProduct').style.width = `${event.target.value}%`; });
$('#productDialog').addEventListener('close', () => { if (roomPhotoUrl) URL.revokeObjectURL(roomPhotoUrl); roomPhotoUrl = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden || !arPendingReturn) return; arPendingReturn = false; arReturnGuardUntil = Date.now() + 2200; if (!$('#productDialog').open && currentProduct) openDialog('#productDialog'); });
document.addEventListener('submit', async event => {
  if (event.target.id === 'accountAuthForm') {
    event.preventDefault();
    const form = event.target, data = Object.fromEntries(new FormData(form).entries()), button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const result = accountMode === 'signup'
        ? await getAuthClient().signUp.email({ name: data.name, email: data.email, password: data.password })
        : await getAuthClient().signIn.email({ email: data.email, password: data.password });
      if (result.error) throw new Error(result.error.message || 'Não foi possível entrar.');
      if (accountMode === 'signup') {
        const sent = await getAuthClient().emailOtp.sendVerificationOtp({ email: data.email, type: 'email-verification' });
        if (sent.error) throw new Error(sent.error.message || 'Conta criada, mas não foi possível enviar o código.');
      }
      await loadMe();
      if (me.admin) await openAdmin();
      else renderAccount();
    } catch (error) {
      const message = $('#authMessage'); if (message) message.textContent = error.message;
      button.disabled = false;
    }
    return;
  }
  if (event.target.id === 'changePasswordForm') {
    event.preventDefault();
    const form = event.target, data = Object.fromEntries(new FormData(form).entries()), button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      if (!me.authenticated) throw new Error('Entre na sua conta antes de alterar a senha.');
      validateNewPassword(data.password, data.confirmPassword);
      if (data.currentPassword === data.password) throw new Error('Escolha uma senha diferente da atual.');
      const result = await getAuthClient().changePassword({ currentPassword: data.currentPassword, newPassword: data.password, revokeOtherSessions: true });
      if (result.error) throw new Error(result.error.message || 'Não foi possível alterar a senha.');
      accountMode = 'signin'; renderAccount();
      $('#accountMessage').textContent = 'Senha alterada. Os outros acessos à sua conta foram encerrados.';
    } catch (error) { $('#authMessage').textContent = error.message; button.disabled = false; }
    return;
  }
  if (event.target.id === 'passwordResetForm') {
    event.preventDefault();
    const form = event.target, data = Object.fromEntries(new FormData(form).entries()), button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      validateNewPassword(data.password, data.confirmPassword);
      const result = await getAuthClient().emailOtp.resetPassword({ email: me.authenticated ? me.email : data.email.trim(), otp: data.otp.trim(), password: data.password });
      if (result.error) throw new Error(result.error.message || 'Não foi possível alterar a senha.');
      await getAuthClient().signOut().catch(() => {});
      await loadMe(); accountMode = 'signin'; renderAccount();
      const message = $('#authMessage') || $('#accountMessage');
      message.textContent = 'Senha atualizada. Entre com seu e-mail e a nova senha.';
    } catch (error) { $('#authMessage').textContent = error.message; button.disabled = false; }
    return;
  }
  if (event.target.id === 'verifyEmailForm') {
    event.preventDefault();
    const otp = new FormData(event.target).get('otp');
    try {
      const result = await getAuthClient().emailOtp.verifyEmail({ email: me.email, otp });
      if (result.error) throw new Error(result.error.message || 'Código inválido.');
      await loadMe();
      if (me.admin) await openAdmin();
      else renderAccount();
    } catch (error) { $('#authMessage').textContent = error.message; }
    return;
  }
  if (event.target.id === 'customForm') { event.preventDefault(); const message = makeOrderMessage(event.target); $('#customMessage').value = message; $('#customStatus').textContent = STORE_WHATSAPP ? 'Revise a mensagem antes de abrir o WhatsApp oficial.' : 'Canal oficial pendente: a mensagem permanece apenas neste aparelho. Você pode copiá-la para guardar.'; $('#openWhatsApp').hidden = !STORE_WHATSAPP; if (STORE_WHATSAPP) $('#openWhatsApp').href = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`; $('#customResult').hidden = false; $('#customResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
  if (event.target.id === 'productForm' || event.target.id === 'categoryForm') { event.preventDefault(); const form = event.target, button = form.querySelector('[type="submit"]'); button.disabled = true; try { if (form.id === 'productForm') await submitProduct(form); else await submitCategory(form); } catch (error) { showInfo('Não foi possível salvar', error.message); button.disabled = false; } }
});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
$('#overlay').addEventListener('click', closeCart);
$('#cartButton').addEventListener('click', event => { if (Date.now() < arReturnGuardUntil) { event.preventDefault(); return; } openCart(); });
$('#searchTrigger').addEventListener('click', () => { openDialog('#searchDialog'); setTimeout(() => $('#searchInput').focus(), 30); });
$('#searchInput').addEventListener('keydown', event => { if (event.key === 'Enter') updateSearch(); });
$('#searchSubmit').addEventListener('click', updateSearch);
$('#catalogSearch').addEventListener('input', event => { searchTerm = event.target.value.trim(); renderProducts(); });
$('#accountButton').addEventListener('click', openAccount);
$('#filterToggle').addEventListener('click', () => { const panel = $('#filterPanel'); panel.hidden = !panel.hidden; $('#filterToggle').setAttribute('aria-expanded', String(!panel.hidden)); });
$('#maxPrice').addEventListener('input', renderProducts); $('#stockOnly').addEventListener('change', renderProducts); $('#sortProducts').addEventListener('change', renderProducts);
$('#clearFilters').addEventListener('click', () => { $('#maxPrice').value = $('#maxPrice').max; $('#stockOnly').checked = false; $('#sortProducts').value = 'featured'; renderProducts(); });
$('#resetSearch').addEventListener('click', () => { searchTerm = ''; activeCategory = 'Todos'; $('#searchInput').value = ''; $('#catalogSearch').value = ''; $('#maxPrice').value = $('#maxPrice').max; $('#stockOnly').checked = false; renderProducts(); });
$('#customButton').addEventListener('click', () => openDialog('#customDialog'));
$('#copyMessage').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#customMessage').value); $('#copyMessage').textContent = 'Copiado ✓'; setTimeout(() => $('#copyMessage').textContent = 'Copiar mensagem', 2200); } catch { showInfo('Não foi possível copiar', 'Selecione o texto da mensagem e copie manualmente.'); } });
$('#checkoutButton').addEventListener('click', openCheckout);
document.addEventListener('submit', async event => {
  if (event.target.id !== 'checkoutForm') return;
  event.preventDefault();
  const form = event.target, button = form.querySelector('[type="submit"]'), message = $('#checkoutMessage');
  button.disabled = true; message.textContent = 'Preparando seu pedido...';
  try {
    if (!SALES_READY) throw new Error('Compras reais indisponíveis: dados da loja pendentes.');
    const data = Object.fromEntries(new FormData(form).entries());
    const { termsAccepted, ...customer } = data;
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    const result = await mutate('/api/checkout', 'POST', { customer, items, termsAccepted: termsAccepted === 'on', policyVersion: STORE_CONFIG.policyVersion });
    location.assign(result.checkoutUrl);
  } catch (error) { message.textContent = error.message; button.disabled = false; }
});
$('#footerContact').addEventListener('click', () => contactStore());
$('#footerWhatsApp').addEventListener('click', () => contactStore("Olá! Vim pelo site da Mandalaria D'ogum e gostaria de conversar."));
$('#newsletterContact').addEventListener('click', () => contactStore("Olá! Gostaria de acompanhar as novidades da Mandalaria D'ogum."));
const NOTICE_KEY = 'mandalaria_storage_notice';
const notice = load(NOTICE_KEY, {});
$('#storageNotice').hidden = notice.version === STORE_CONFIG.policyVersion && notice.until > Date.now();
$('#storePreparation').hidden = SALES_READY;
$('#storageNoticeDismiss').addEventListener('click', () => { try { localStorage.setItem(NOTICE_KEY, JSON.stringify({version:STORE_CONFIG.policyVersion,until:Date.now()+180*24*60*60*1000})); } catch {} $('#storageNotice').hidden=true; });
$('#storageSettings').addEventListener('click', () => { $('#storageNotice').hidden=false; $('#storageNoticeDismiss').focus(); });
document.addEventListener('keydown', event => {
  const drawer = $('#cartDrawer'); if (!drawer.classList.contains('open')) return;
  if (event.key === 'Escape') { event.preventDefault(); closeCart(); return; }
  if (event.key !== 'Tab') return;
  const controls = [...drawer.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')].filter(node => !node.closest('[hidden]'));
  const first=controls[0],last=controls.at(-1);
  if (!first) { event.preventDefault(); drawer.focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$('#adminDemo').addEventListener('click', openAccount);
$('#currentYear').textContent = new Date().getFullYear();
const paymentResult = new URLSearchParams(location.search).get('payment');
if (paymentResult) {
  const messages = {
    success: ['Pagamento em verificação', 'Estamos confirmando seu pagamento. A confirmação final é enviada pelo Mercado Pago.'],
    pending: ['Pagamento pendente', 'O Mercado Pago ainda está processando seu pagamento.'],
    failure: ['Pagamento não concluído', 'Seu pedido ainda não foi confirmado. Você pode tentar novamente pelo carrinho.'],
  };
  if (messages[paymentResult]) showInfo(...messages[paymentResult]);
}
renderProducts(); renderCart();
Promise.all([loadCatalog(), loadMe()]).then(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('auth') === 'google' && me.admin) return openAdmin();
  if (params.get('login') === '1') {
    return openAccount().then(() => {
      if (params.get('auth') === 'error' && $('#authMessage')) $('#authMessage').textContent = 'O login com Google não foi concluído. Tente novamente ou entre com seu e-mail.';
    });
  }
  if (params.get('admin') === '1') return openAdmin();
});
