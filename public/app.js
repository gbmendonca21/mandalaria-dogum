const STORE_WHATSAPP = window.MANDALARIA_CONFIG.whatsapp;
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

function openDialog(selector) { const dialog = $(selector); if (!dialog.open) dialog.showModal(); }
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }
function openCart() { $('#overlay').hidden = false; $('#cartDrawer').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
function closeCart() { $('#overlay').hidden = true; $('#cartDrawer').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
function showInfo(title, text) { $('#infoTitle').textContent = title; $('#infoText').textContent = text; openDialog('#infoDialog'); }
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
async function mutate(path, method, body) {
  return api(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
function displayProduct(item) {
  const parts = [item.widthCm, item.heightCm, item.depthCm].filter(value => value != null);
  return { ...item, price: item.priceCents / 100, stock: item.stockQuantity > 0 || item.madeToOrder,
    size: parts.length ? `${parts.join(' × ')} cm` : 'A definir',
    badge: item.madeToOrder ? 'Sob encomenda' : item.featured ? 'Destaque' : 'Feito à mão',
    model: Boolean(item.glbUrl) };
}
async function loadCatalog() {
  try {
    const data = await api('/api/catalog');
    categories = data.categories.map(item => item.name);
    products = data.products.map(displayProduct);
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
  $('#accountButton').setAttribute('aria-label', me.admin ? 'Abrir painel do administrador' : 'Entrar na área do administrador');
  $('#adminAccessLabel').textContent = me.admin ? 'Painel da loja' : 'Área admin';
  $('#adminDemo').textContent = me.admin ? 'Painel da loja' : 'Login do administrador';
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
  return item.imageUrl ? `<img class="${className}" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy">` : `<img class="${className} product-placeholder" src="assets/logo-symbol-transparent.png" alt="" aria-hidden="true">`;
}
function renderProducts() {
  renderCategories();
  const list = filteredProducts();
  $('#resultsCount').textContent = `${list.length} ${list.length === 1 ? 'peça encontrada' : 'peças encontradas'}` + (searchTerm ? ` para “${searchTerm}”` : '');
  $('#noResults').hidden = list.length > 0;
  $('#noResults h3').textContent = catalogError ? 'Catálogo temporariamente indisponível' : products.length ? 'Nenhuma peça encontrada' : 'Novidades em breve';
  $('#emptyCatalogMessage').textContent = catalogError ? 'Tente novamente em alguns instantes.' : products.length ? 'Tente outro termo ou ajuste os filtros.' : 'Estamos preparando o catálogo com as peças reais da Mandalaria.';
  $('#productGrid').innerHTML = list.map(item => `<article class="product-card"><div class="product-image real-product-image" data-open-product="${escapeHtml(item.id)}" role="button" tabindex="0" aria-label="Ver ${escapeHtml(item.name)}">${photo(item, 'product-photo')}<span class="product-badge">${escapeHtml(item.badge)}</span>${item.stock ? `<button class="quick-add" data-add="${escapeHtml(item.id)}" aria-label="Adicionar ${escapeHtml(item.name)} ao carrinho">+</button>` : ''}</div><div class="product-meta"><div><div class="product-category">${escapeHtml(item.category)}</div><div class="product-name">${escapeHtml(item.name)}</div><div class="product-price">${currency(item.price)}</div></div></div><div class="product-actions"><button data-open-product="${escapeHtml(item.id)}">Ver detalhes</button>${item.model ? `<button data-open-3d="${escapeHtml(item.id)}">◈ Ver em 3D</button>` : ''}</div></article>`).join('');
  const count = ($('#maxPrice').value !== $('#maxPrice').max ? 1 : 0) + ($('#stockOnly').checked ? 1 : 0);
  $('#activeFilterCount').textContent = count ? `(${count})` : '';
  $('#priceLabel').textContent = currency(Number($('#maxPrice').value));
}
function saveCart() { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); renderCart(); }
function addToCart(id, qty = 1) { if (!products.some(item => item.id === id && item.stock)) return; cart[id] = (cart[id] || 0) + qty; saveCart(); openCart(); }
function renderCart() {
  const entries = Object.entries(cart).map(([id, qty]) => ({ item: products.find(product => product.id === id), qty })).filter(entry => entry.item && entry.qty > 0);
  const count = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const total = entries.reduce((sum, entry) => sum + entry.qty * entry.item.price, 0);
  $('#cartCount').textContent = count; $('#cartCountTitle').textContent = `(${count})`; $('#cartSubtotal').textContent = currency(total);
  $('#cartItems').innerHTML = entries.length ? entries.map(({ item, qty }) => `<div class="cart-item"><div class="cart-thumb real-cart-thumb">${photo(item, 'cart-photo')}</div><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}</small><div class="qty-control"><button data-cart-dec="${escapeHtml(item.id)}" aria-label="Diminuir quantidade">−</button><span>${qty}</span><button data-cart-inc="${escapeHtml(item.id)}" aria-label="Aumentar quantidade">+</button></div><br><button class="remove-item" data-cart-remove="${escapeHtml(item.id)}">Remover</button></div><div class="cart-item-price">${currency(item.price * qty)}</div></div>`).join('') : `<div class="empty-cart"><span>✺</span><h3>Seu carrinho está vazio</h3><p>Encontre uma peça que combine com seu espaço e volte aqui.</p></div>`;
  $('#checkoutButton').disabled = !entries.length;
}
function openProduct(id, showModel = false) {
  const item = products.find(product => product.id === id); if (!item) return;
  currentProduct = id;
  $('#productDetail').innerHTML = `<div class="product-detail-grid"><div class="detail-image real-detail-image">${photo(item, 'detail-photo')}</div><div class="detail-copy"><div class="product-category">${escapeHtml(item.category)} · PEÇA ARTESANAL</div><h2>${escapeHtml(item.name)}</h2><div class="detail-price">${currency(item.price)}</div><p>${escapeHtml(item.description)}</p><ul><li><strong>Dimensões:</strong> ${escapeHtml(item.size)}</li><li><strong>Materiais:</strong> ${escapeHtml(item.material || 'A definir')}</li><li><strong>Produção:</strong> feita à mão</li></ul><div class="detail-actions"><div class="qty-control"><button id="detailDec" aria-label="Diminuir quantidade">−</button><span id="detailQty">1</span><button id="detailInc" aria-label="Aumentar quantidade">+</button></div><button class="button button-dark" id="detailAdd" ${item.stock ? '' : 'disabled'}>${item.stock ? 'Adicionar ao carrinho ↗' : 'Indisponível'}</button></div>${item.model ? `<div class="model-viewer-wrap"><button class="model-trigger" id="modelTrigger">◈ Ver em 3D na parede</button><div class="model-box ${showModel ? 'open' : ''}" id="modelBox"><p class="preview-intro">A visualização depende das medidas e do modelo 3D cadastrados para esta peça.</p><model-viewer id="arViewer" src="${escapeHtml(item.glbUrl)}" ${item.imageUrl ? `poster="${escapeHtml(item.imageUrl)}"` : ''} ${item.usdzUrl ? `ios-src="${escapeHtml(item.usdzUrl)}"` : ''} alt="Modelo 3D de ${escapeHtml(item.name)}" ar ar-modes="scene-viewer quick-look webxr" ar-placement="wall" ar-scale="auto" interaction-prompt="none" shadow-intensity="0.4"></model-viewer><button type="button" class="button button-terracotta full-button" id="arStart" disabled>Carregando visualização...</button><p class="ar-support" id="arSupport">Aguarde o carregamento para verificar a compatibilidade do aparelho.</p>${item.imageUrl ? `<details class="room-preview"><summary>Ver em uma foto do meu ambiente</summary><p>Envie uma foto da parede e arraste a peça para testar a composição. A foto fica apenas no seu aparelho.</p><label class="room-upload">Escolher foto da parede<input id="roomPhotoInput" type="file" accept="image/*"></label><div class="room-canvas" id="roomCanvas" hidden><img id="roomImage" alt="Foto do seu ambiente"><img id="roomProduct" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)} sobreposta à foto"></div><label class="room-scale" id="roomScaleLabel" hidden>Tamanho na foto<input id="roomScale" type="range" min="15" max="65" value="32"></label></details>` : ''}</div></div>` : ''}</div></div>`;
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
  roomProduct.addEventListener('pointerup', () => { dragging = false; });
  roomProduct.addEventListener('pointercancel', () => { dragging = false; });
}
function updateSearch() { searchTerm = $('#searchInput').value.trim(); $('#catalogSearch').value = searchTerm; activeCategory = 'Todos'; renderProducts(); closeDialogs(); $('#colecao').scrollIntoView({ behavior: 'smooth' }); }
function makeOrderMessage(form) { const data = Object.fromEntries(new FormData(form).entries()); return `Olá! Gostaria de solicitar uma encomenda personalizada na Mandalaria D'ogum.\n\n*Nome:* ${data.name.trim()}\n*Tipo de peça:* ${data.type}\n*Cores desejadas:* ${data.colors.trim()}\n*Tamanho:* ${data.size}\n*Prazo desejado:* ${data.deadline || 'A combinar'}\n*Orçamento:* ${data.budget}\n*Detalhes:* ${data.details.trim() || 'A conversar'}\n\nPodemos conversar sobre o projeto?`; }
function renderAccount() {
  const host = $('#accountContent');
  $('#accountTitle').textContent = me.authenticated ? 'Área do administrador' : accountMode === 'signup' ? 'Primeiro acesso' : 'Login do administrador';
  if (!me.authenticated) {
    host.innerHTML = `<p>Entre com o e-mail autorizado para adicionar produtos, enviar fotos e gerenciar a loja.</p><form id="accountAuthForm" class="admin-form">${accountMode === 'signup' ? '<label>Nome<input name="name" required autocomplete="name" maxlength="100"></label>' : ''}<label>E-mail<input name="email" type="email" required autocomplete="email"></label><label>Senha<input name="password" type="password" required minlength="8" autocomplete="${accountMode === 'signup' ? 'new-password' : 'current-password'}"></label><button class="button button-dark full-button" type="submit">${accountMode === 'signup' ? 'Criar conta' : 'Entrar'}</button><button class="text-button" type="button" id="toggleAuthMode">${accountMode === 'signup' ? 'Já tenho uma conta' : 'Primeiro acesso? Criar conta'}</button>${accountMode === 'signin' ? '<button class="text-button" type="button" id="forgotPassword">Esqueci minha senha</button>' : ''}<p id="authMessage" role="status"></p></form>`;
    return;
  }
  const verification = !me.emailVerified ? `<form id="verifyEmailForm" class="admin-form"><p>Confirme seu e-mail para liberar o painel administrativo.</p><label>Código de verificação<input name="otp" inputmode="numeric" autocomplete="one-time-code" required></label><button class="button button-dark full-button" type="submit">Verificar e-mail</button><button class="text-button" type="button" id="sendVerificationCode">Enviar código novamente</button><p id="authMessage" role="status"></p></form>` : '';
  host.innerHTML = `<p>Conectado como <strong>${escapeHtml(me.displayName || me.email)}</strong><br><small>${escapeHtml(me.email)}</small></p>${verification}${me.admin ? '<button class="button button-terracotta full-button" id="openAdminFromAccount">Abrir painel da loja</button>' : me.emailVerified ? '<p role="status">Este e-mail não tem permissão para administrar a loja. Saia e entre com uma conta autorizada.</p>' : ''}<button class="button button-outline full-button account-link" id="signOutButton">Sair da conta</button>`;
}
async function openAdmin() {
  if (window.MANDALARIA_CONFIG.staticMode) {
    location.assign('https://mandalaria-dogum.mandalaria-dogum-shop.workers.dev/?admin=1');
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
    host.innerHTML = `<button class="button button-terracotta admin-new" id="adminNew">+ Novo produto</button><div id="adminFormHost"></div><div>${adminProducts.map(item => `<div class="admin-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${currency(item.price)} · ${item.status === 'active' ? 'Publicado' : item.status === 'draft' ? 'Rascunho' : 'Arquivado'}</small></div><div><button data-admin-edit="${escapeHtml(item.id)}">Editar</button><button data-admin-delete="${escapeHtml(item.id)}">Excluir</button></div></div>`).join('') || '<p class="admin-empty">Nenhum produto cadastrado.</p>'}</div>`;
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
  $('#adminFormHost').innerHTML = `<form id="productForm" class="admin-form"><h3>${item ? 'Editar produto' : 'Novo produto'}</h3><div class="form-grid"><label>Nome<input name="name" required maxlength="140" value="${escapeHtml(item?.name || '')}"></label><label>Categoria<select name="categoryId" required><option value="">Selecione</option>${adminCategories.map(cat => `<option value="${escapeHtml(cat.id)}" ${item?.categoryId === cat.id ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`).join('')}</select></label><label>Preço (R$)<input name="price" type="number" min="0" step="0.01" required value="${item ? item.price.toFixed(2) : ''}"></label><label>Estoque<input name="stockQuantity" type="number" min="0" step="1" required value="${item?.stockQuantity ?? 0}"></label><label>Largura (cm)<input name="widthCm" type="number" min="0.01" step="0.01" value="${item?.widthCm ?? ''}"></label><label>Altura (cm)<input name="heightCm" type="number" min="0.01" step="0.01" value="${item?.heightCm ?? ''}"></label><label>Profundidade (cm)<input name="depthCm" type="number" min="0.01" step="0.01" value="${item?.depthCm ?? ''}"></label><label>Materiais<input name="materials" maxlength="500" value="${escapeHtml(item?.material || '')}"></label><label>Estado<select name="status"><option value="draft" ${item?.status !== 'active' && item?.status !== 'archived' ? 'selected' : ''}>Rascunho</option><option value="active" ${item?.status === 'active' ? 'selected' : ''}>Publicado</option><option value="archived" ${item?.status === 'archived' ? 'selected' : ''}>Arquivado</option></select></label><label>Tipo<select name="madeToOrder"><option value="false" ${!item?.madeToOrder ? 'selected' : ''}>Pronta entrega</option><option value="true" ${item?.madeToOrder ? 'selected' : ''}>Sob encomenda</option></select></label><label>Foto (URL HTTPS, opcional)<input name="imageUrl" type="url" placeholder="https://..." value="${escapeHtml(item?.imageUrl || '')}"></label><label>Enviar foto (JPG/PNG/WebP, até 10 MB)<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp"></label><label>Modelo 3D GLB (URL HTTPS, opcional)<input name="glbUrl" type="url" placeholder="https://..." value="${escapeHtml(item?.glbUrl || '')}"></label><label>Enviar modelo GLB (até 50 MB)<input name="glbFile" type="file" accept=".glb,model/gltf-binary"></label><label>Modelo iPhone USDZ (URL HTTPS, opcional)<input name="usdzUrl" type="url" placeholder="https://..." value="${escapeHtml(item?.usdzUrl || '')}"></label><label>Enviar modelo USDZ (até 50 MB)<input name="usdzFile" type="file" accept=".usdz,model/vnd.usdz+zip"></label><label>Destaque<select name="featured"><option value="false" ${!item?.featured ? 'selected' : ''}>Não</option><option value="true" ${item?.featured ? 'selected' : ''}>Sim</option></select></label></div><label class="admin-wide">Descrição<textarea name="description" rows="4" maxlength="4000">${escapeHtml(item?.description || '')}</textarea></label><button class="button button-dark" type="submit">Salvar produto</button><button type="button" class="text-button" id="cancelAdminForm">Cancelar</button></form>`;
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
  if (target.dataset.add) { event.stopPropagation(); addToCart(target.dataset.add); return; }
  if (target.dataset.open3d) { openProduct(target.dataset.open3d, true); return; }
  if (target.dataset.openProduct) { openProduct(target.dataset.openProduct); return; }
  if (target.dataset.category && target.closest('#categoryTabs')) { activeCategory = target.dataset.category; renderProducts(); return; }
  if (target.dataset.category && target.closest('.category-cards')) { activeCategory = target.dataset.category; renderProducts(); $('#colecao').scrollIntoView({ behavior: 'smooth' }); return; }
  if (target.dataset.cartInc) { cart[target.dataset.cartInc]++; saveCart(); return; }
  if (target.dataset.cartDec) { cart[target.dataset.cartDec]--; if (cart[target.dataset.cartDec] <= 0) delete cart[target.dataset.cartDec]; saveCart(); return; }
  if (target.dataset.cartRemove) { delete cart[target.dataset.cartRemove]; saveCart(); return; }
  if (target.id === 'detailInc') { $('#detailQty').textContent = Number($('#detailQty').textContent) + 1; return; }
  if (target.id === 'detailDec') { $('#detailQty').textContent = Math.max(1, Number($('#detailQty').textContent) - 1); return; }
  if (target.id === 'detailAdd') { const qty = Number($('#detailQty').textContent); closeDialogs(); addToCart(currentProduct, qty); return; }
  if (target.id === 'modelTrigger') { $('#modelBox').classList.toggle('open'); return; }
  if (target.id === 'arStart') { const viewer = $('#arViewer'); if (viewer?.canActivateAR) { arPendingReturn = true; arReturnGuardUntil = Date.now() + 2200; Promise.resolve(viewer.activateAR()).catch(() => { arPendingReturn = false; showInfo('AR indisponível', 'Não foi possível abrir a câmera neste aparelho.'); }); } return; }
  if (target.id === 'openAdminFromAccount') { await openAdmin(); return; }
  if (target.id === 'toggleAuthMode') { accountMode = accountMode === 'signup' ? 'signin' : 'signup'; renderAccount(); return; }
  if (target.id === 'sendVerificationCode') {
    try {
      const result = await window.MANDALARIA_AUTH.emailOtp.sendVerificationOtp({ email: me.email, type: 'email-verification' });
      if (result.error) throw new Error(result.error.message || 'Não foi possível enviar o código.');
      $('#authMessage').textContent = 'Enviamos um novo código para seu e-mail.';
    } catch (error) { $('#authMessage').textContent = error.message; }
    return;
  }
  if (target.id === 'signOutButton') {
    try {
      const result = await window.MANDALARIA_AUTH.signOut();
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
        ? await window.MANDALARIA_AUTH.signUp.email({ name: data.name, email: data.email, password: data.password })
        : await window.MANDALARIA_AUTH.signIn.email({ email: data.email, password: data.password });
      if (result.error) throw new Error(result.error.message || 'Não foi possível entrar.');
      if (accountMode === 'signup') {
        const sent = await window.MANDALARIA_AUTH.emailOtp.sendVerificationOtp({ email: data.email, type: 'email-verification' });
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
  if (event.target.id === 'verifyEmailForm') {
    event.preventDefault();
    const otp = new FormData(event.target).get('otp');
    try {
      const result = await window.MANDALARIA_AUTH.emailOtp.verifyEmail({ email: me.email, otp });
      if (result.error) throw new Error(result.error.message || 'Código inválido.');
      await loadMe();
      if (me.admin) await openAdmin();
      else renderAccount();
    } catch (error) { $('#authMessage').textContent = error.message; }
    return;
  }
  if (event.target.id === 'customForm') { event.preventDefault(); const message = makeOrderMessage(event.target); $('#customMessage').value = message; $('#customStatus').textContent = `A mensagem será aberta para ${STORE_WHATSAPP}. Revise os dados antes de enviar.`; $('#openWhatsApp').href = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`; $('#customResult').hidden = false; $('#customResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
  if (event.target.id === 'productForm' || event.target.id === 'categoryForm') { event.preventDefault(); const form = event.target, button = form.querySelector('[type="submit"]'); button.disabled = true; try { if (form.id === 'productForm') await submitProduct(form); else await submitCategory(form); } catch (error) { showInfo('Não foi possível salvar', error.message); button.disabled = false; } }
});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
$('#overlay').addEventListener('click', closeCart);
$('#cartButton').addEventListener('click', event => { if (Date.now() < arReturnGuardUntil) { event.preventDefault(); return; } openCart(); });
$('#searchTrigger').addEventListener('click', () => { openDialog('#searchDialog'); setTimeout(() => $('#searchInput').focus(), 30); });
$('#searchInput').addEventListener('keydown', event => { if (event.key === 'Enter') updateSearch(); });
$('#searchSubmit').addEventListener('click', updateSearch);
$('#catalogSearch').addEventListener('input', event => { searchTerm = event.target.value.trim(); renderProducts(); });
$('#accountButton').addEventListener('click', async () => { await loadMe();
      if (me.admin) await openAdmin();
      else renderAccount(); openDialog('#accountDialog'); });
$('#filterToggle').addEventListener('click', () => { const panel = $('#filterPanel'); panel.hidden = !panel.hidden; $('#filterToggle').setAttribute('aria-expanded', String(!panel.hidden)); });
$('#maxPrice').addEventListener('input', renderProducts); $('#stockOnly').addEventListener('change', renderProducts); $('#sortProducts').addEventListener('change', renderProducts);
$('#clearFilters').addEventListener('click', () => { $('#maxPrice').value = $('#maxPrice').max; $('#stockOnly').checked = false; $('#sortProducts').value = 'featured'; renderProducts(); });
$('#resetSearch').addEventListener('click', () => { searchTerm = ''; activeCategory = 'Todos'; $('#searchInput').value = ''; $('#catalogSearch').value = ''; $('#maxPrice').value = $('#maxPrice').max; $('#stockOnly').checked = false; renderProducts(); });
$('#customButton').addEventListener('click', () => openDialog('#customDialog'));
$('#copyMessage').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#customMessage').value); $('#copyMessage').textContent = 'Copiado ✓'; setTimeout(() => $('#copyMessage').textContent = 'Copiar mensagem', 2200); } catch { showInfo('Não foi possível copiar', 'Selecione o texto da mensagem e copie manualmente.'); } });
$('#checkoutButton').addEventListener('click', () => { closeCart(); openDialog('#checkoutDialog'); });
document.addEventListener('submit', async event => {
  if (event.target.id !== 'checkoutForm') return;
  event.preventDefault();
  const form = event.target, button = form.querySelector('[type="submit"]'), message = $('#checkoutMessage');
  button.disabled = true; message.textContent = 'Preparando seu pedido...';
  try {
    const customer = Object.fromEntries(new FormData(form).entries());
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    const result = await mutate('/api/checkout', 'POST', { customer, items });
    location.assign(result.checkoutUrl);
  } catch (error) { message.textContent = error.message; button.disabled = false; }
});
$('#footerContact').addEventListener('click', () => { location.href = `https://wa.me/${STORE_WHATSAPP}`; });
$('#footerWhatsApp').addEventListener('click', () => { location.href = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá! Vim pelo site da Mandalaria D'ogum e gostaria de conversar.")}`; });
$('#newsletterContact').addEventListener('click', () => { location.href = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá! Gostaria de acompanhar as novidades da Mandalaria D'ogum.")}`; });
$('#adminDemo').addEventListener('click', openAdmin);
$('#currentYear').textContent = new Date().getFullYear();
const paymentResult = new URLSearchParams(location.search).get('payment');
if (paymentResult) {
  const messages = {
    success: ['Pagamento recebido', 'Estamos confirmando seu pagamento. A confirmação final é enviada pelo Mercado Pago.'],
    pending: ['Pagamento pendente', 'O Mercado Pago ainda está processando seu pagamento.'],
    failure: ['Pagamento não concluído', 'Seu pedido ainda não foi confirmado. Você pode tentar novamente pelo carrinho.'],
  };
  if (messages[paymentResult]) showInfo(...messages[paymentResult]);
}
renderProducts(); renderCart();
Promise.all([loadCatalog(), loadMe()]).then(() => {
  if (new URLSearchParams(location.search).get('admin') === '1') return openAdmin();
});
