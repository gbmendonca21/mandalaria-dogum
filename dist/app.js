const STORE_WHATSAPP = window.MANDALARIA_CONFIG.whatsapp;
const STORAGE_PRODUCTS = 'mandalaria_demo_products_v1';
const STORAGE_CATEGORIES = 'mandalaria_demo_categories_v1';
const STORAGE_CART = 'mandalaria_demo_cart_v1';
const defaultCategories = ['Mandalas', 'Porta-chaves', 'Incensários', 'Chaveiros'];
const defaultProducts = [
  { id:'mandala-aurora', name:'Mandala Aurora', category:'Mandalas', price:189, sprite:0, badge:'Mais amada', stock:true, description:'Tramas em tons de açafrão e terracota para trazer presença e aconchego à parede.', size:'Aproximadamente 45 cm', material:'Fios, contas e detalhes artesanais', model:true },
  { id:'mandala-solar', name:'Mandala Sol de Dentro', category:'Mandalas', price:159, sprite:1, badge:'Feita à mão', stock:true, description:'Uma mandala delicada em fios naturais e pequenos detalhes dourados.', size:'Aproximadamente 35 cm', material:'Fios naturais e contas', model:false },
  { id:'porta-raizes', name:'Porta-chaves Raízes', category:'Porta-chaves', price:119, sprite:2, badge:'Novo', stock:true, description:'Um lugar bonito para receber suas chaves e dar as boas-vindas ao seu lar.', size:'Aproximadamente 30 cm', material:'Madeira, corda e metal', model:false },
  { id:'incensario-abraco', name:'Incensário Abraço', category:'Incensários', price:89, sprite:3, badge:'Peça especial', stock:true, description:'Uma peça escultórica em tom de terra para acompanhar momentos de pausa.', size:'Aproximadamente 18 cm', material:'Cerâmica artesanal', model:false },
  { id:'chaveiro-caminhos', name:'Chaveiro Caminhos', category:'Chaveiros', price:45, sprite:4, badge:'Para presentear', stock:true, description:'Pequeno no tamanho, cheio de intenção e cuidado em cada detalhe.', size:'Aproximadamente 14 cm', material:'Contas, fios e metal', model:false },
  { id:'incensario-sereno', name:'Incensário Sereno', category:'Incensários', price:109, sprite:5, badge:'Feita à mão', stock:true, description:'Linhas suaves e cores naturais para fazer dos seus rituais um convite à calma.', size:'Aproximadamente 23 cm', material:'Cerâmica artesanal', model:false },
];
const spritePositions = ['0% 0%','50% 0%','100% 0%','0% 100%','50% 100%','100% 100%'];
const $ = (selector) => document.querySelector(selector);
const currency = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
let products = load(STORAGE_PRODUCTS, defaultProducts);
let categories = load(STORAGE_CATEGORIES, defaultCategories);
let cart = load(STORAGE_CART, {});
let activeCategory = 'Todos';
let searchTerm = '';
let currentProduct = null;
let adminTab = 'products';
let adminEditing = null;
let roomPhotoUrl = null;

function saveData() { localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products)); localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(categories)); }
function saveCart() { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); renderCart(); }
function openDialog(selector) { const dialog = $(selector); if (!dialog.open) dialog.showModal(); }
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }
function openCart() { $('#overlay').hidden = false; $('#cartDrawer').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; }
function closeCart() { $('#overlay').hidden = true; $('#cartDrawer').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden','true'); document.body.style.overflow = ''; }
function showInfo(title,text) { $('#infoTitle').textContent = title; $('#infoText').textContent = text; openDialog('#infoDialog'); }

function renderCategories() {
  $('#categoryTabs').innerHTML = ['Todos',...categories].map(category => `<button data-category="${escapeHtml(category)}" class="${category===activeCategory?'active':''}" aria-pressed="${category===activeCategory}">${escapeHtml(category)}</button>`).join('');
}
function filteredProducts() {
  const maxPrice = Number($('#maxPrice').value);
  const onlyStock = $('#stockOnly').checked;
  const query = searchTerm.toLocaleLowerCase('pt-BR');
  const list = products.filter(product => (activeCategory==='Todos'||product.category===activeCategory) && product.price<=maxPrice && (!onlyStock||product.stock) && (!query||`${product.name} ${product.category} ${product.description} ${product.material}`.toLocaleLowerCase('pt-BR').includes(query)));
  const sort = $('#sortProducts').value;
  if(sort==='priceAsc') list.sort((a,b)=>a.price-b.price);
  if(sort==='priceDesc') list.sort((a,b)=>b.price-a.price);
  if(sort==='name') list.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  return list;
}
function renderProducts() {
  renderCategories();
  const list = filteredProducts();
  $('#resultsCount').textContent = `${list.length} ${list.length===1?'peça encontrada':'peças encontradas'}` + (searchTerm ? ` para “${searchTerm}”` : '');
  $('#noResults').hidden = list.length>0;
  $('#productGrid').innerHTML = list.map(product => `<article class="product-card"><div class="product-image" style="--pos:${spritePositions[product.sprite]||spritePositions[0]}" data-open-product="${escapeHtml(product.id)}" role="button" tabindex="0" aria-label="Ver ${escapeHtml(product.name)}"><span class="product-badge">${escapeHtml(product.badge||'Feito à mão')}</span><button class="quick-add" data-add="${escapeHtml(product.id)}" aria-label="Adicionar ${escapeHtml(product.name)} ao carrinho">+</button></div><div class="product-meta"><div><div class="product-category">${escapeHtml(product.category)}</div><div class="product-name">${escapeHtml(product.name)}</div><div class="product-price">${currency(product.price)} <small>valor ilustrativo</small></div></div></div><div class="product-actions"><button data-open-product="${escapeHtml(product.id)}">Ver detalhes</button>${product.model?`<button data-open-3d="${escapeHtml(product.id)}">◈ Prévia na parede</button>`:''}</div></article>`).join('');
  const count = ($('#maxPrice').value!=='300'?1:0)+($('#stockOnly').checked?1:0);
  $('#activeFilterCount').textContent = count?`(${count})`:'';
  $('#priceLabel').textContent = currency(Number($('#maxPrice').value));
}
function addToCart(id,qty=1) { if(!products.some(product=>product.id===id)) return; cart[id]=(cart[id]||0)+qty; saveCart(); openCart(); }
function renderCart() {
  const entries = Object.entries(cart).map(([id,qty])=>({product:products.find(item=>item.id===id),qty})).filter(item=>item.product&&item.qty>0);
  const count = entries.reduce((sum,item)=>sum+item.qty,0);
  const total = entries.reduce((sum,item)=>sum+item.qty*item.product.price,0);
  $('#cartCount').textContent=count; $('#cartCountTitle').textContent=`(${count})`; $('#cartSubtotal').textContent=currency(total);
  $('#cartItems').innerHTML = entries.length ? entries.map(({product,qty})=>`<div class="cart-item"><div class="cart-thumb" style="--pos:${spritePositions[product.sprite]||spritePositions[0]}"></div><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)}</small><div class="qty-control"><button data-cart-dec="${escapeHtml(product.id)}" aria-label="Diminuir quantidade">−</button><span>${qty}</span><button data-cart-inc="${escapeHtml(product.id)}" aria-label="Aumentar quantidade">+</button></div><br><button class="remove-item" data-cart-remove="${escapeHtml(product.id)}">Remover</button></div><div class="cart-item-price">${currency(product.price*qty)}</div></div>`).join('') : `<div class="empty-cart"><span>✺</span><h3>Seu carrinho está vazio</h3><p>Encontre uma peça que combine com seu espaço e volte aqui.</p></div>`;
  $('#checkoutButton').disabled = !entries.length;
}
function openProduct(id,showModel=false) {
  const product=products.find(item=>item.id===id); if(!product) return;
  currentProduct=id;
  $('#productDetail').innerHTML=`<div class="product-detail-grid"><div class="detail-image" style="--pos:${spritePositions[product.sprite]||spritePositions[0]}"></div><div class="detail-copy"><div class="product-category">${escapeHtml(product.category)} · PEÇA ARTESANAL</div><h2>${escapeHtml(product.name)}</h2><div class="detail-price">${currency(product.price)} <small style="font-size:10px;color:#8a7d6e;font-weight:400">valor ilustrativo</small></div><p>${escapeHtml(product.description)}</p><ul><li><strong>Dimensões:</strong> ${escapeHtml(product.size||'A definir')}</li><li><strong>Materiais:</strong> ${escapeHtml(product.material||'A definir')}</li><li><strong>Produção:</strong> feita à mão</li></ul><div class="detail-actions"><div class="qty-control"><button id="detailDec" aria-label="Diminuir quantidade">−</button><span id="detailQty">1</span><button id="detailInc" aria-label="Aumentar quantidade">+</button></div><button class="button button-dark" id="detailAdd">Adicionar ao carrinho ↗</button></div>${product.model?`<div class="model-viewer-wrap"><button class="model-trigger" id="modelTrigger">◈ Prévia na parede</button><div class="model-box ${showModel?'open':''}" id="modelBox"><p class="preview-intro">Prévia fotográfica ilustrativa, com largura aproximada de 45 cm. Para a peça real, será necessário fotografar ou escanear o produto.</p><model-viewer id="arViewer" src="assets/mandala-preview.glb" poster="assets/mandala-recorte.png" alt="Prévia fotográfica de uma mandala na parede" ar ar-modes="scene-viewer quick-look webxr" ar-placement="wall" ar-scale="auto" camera-orbit="0deg 90deg auto" interaction-prompt="none" shadow-intensity="0" exposure="1"></model-viewer><button type="button" class="button button-terracotta full-button" id="arStart" disabled>Carregando prévia...</button><p class="ar-support" id="arSupport">Aguarde o carregamento para verificar a compatibilidade do aparelho.</p><details class="room-preview"><summary>Ver em uma foto do meu ambiente</summary><p>Envie uma foto da parede e arraste a mandala para testar a composição. A foto fica apenas no seu aparelho.</p><label class="room-upload">Escolher foto da parede<input id="roomPhotoInput" type="file" accept="image/*"></label><div class="room-canvas" id="roomCanvas" hidden><img id="roomImage" alt="Foto do seu ambiente"><img id="roomProduct" src="assets/mandala-recorte.png" alt="Mandala sobreposta à foto"></div><label class="room-scale" id="roomScaleLabel" hidden>Tamanho na foto<input id="roomScale" type="range" min="15" max="65" value="32"></label></details></div></div>`:''}</div></div>`;
  if (product.model) setupPreview();
  closeCart(); openDialog('#productDialog');
}
function setupPreview() {
  const viewer = $('#arViewer');
  const arButton = $('#arStart');
  const support = $('#arSupport');
  const updateSupport = () => {
    const available = Boolean(viewer.canActivateAR);
    arButton.disabled = !available;
    arButton.textContent = available ? 'Abrir câmera e posicionar na parede ↗' : 'AR indisponível neste aparelho';
    support.textContent = available
      ? 'Aponte a câmera para uma parede bem iluminada e mova o celular devagar até detectar a superfície.'
      : 'Use a opção com foto do ambiente abaixo. A AR depende do navegador e do aparelho.';
  };
  viewer.addEventListener('load', updateSupport);
  viewer.addEventListener('error', () => {
    arButton.disabled = true;
    arButton.textContent = 'Não foi possível carregar a prévia AR';
    support.textContent = 'A opção com foto do ambiente continua disponível abaixo.';
  });
  customElements.whenDefined('model-viewer').then(() => setTimeout(updateSupport, 100));
  const roomProduct = $('#roomProduct');
  const roomCanvas = $('#roomCanvas');
  let dragging = false;
  roomProduct.addEventListener('pointerdown', event => {
    dragging = true;
    roomProduct.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  roomProduct.addEventListener('pointermove', event => {
    if (!dragging) return;
    const rect = roomCanvas.getBoundingClientRect();
    roomProduct.style.left = `${Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))}%`;
    roomProduct.style.top = `${Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))}%`;
  });
  roomProduct.addEventListener('pointerup', () => { dragging = false; });
  roomProduct.addEventListener('pointercancel', () => { dragging = false; });
}
function updateSearch() { searchTerm=$('#searchInput').value.trim(); $('#catalogSearch').value=searchTerm; activeCategory='Todos'; renderProducts(); closeDialogs(); document.querySelector('#colecao').scrollIntoView({behavior:'smooth'}); }
function makeOrderMessage(form) {
  const data=Object.fromEntries(new FormData(form).entries());
  return `Olá! Gostaria de solicitar uma encomenda personalizada na Mandalaria D'ogum.\n\n*Nome:* ${data.name.trim()}\n*Tipo de peça:* ${data.type}\n*Cores desejadas:* ${data.colors.trim()}\n*Tamanho:* ${data.size}\n*Prazo desejado:* ${data.deadline||'A combinar'}\n*Orçamento:* ${data.budget}\n*Detalhes:* ${data.details.trim()||'A conversar'}\n\nPodemos conversar sobre o projeto?`;
}
function renderAdmin() {
  document.querySelectorAll('[data-admin-tab]').forEach(button=>button.classList.toggle('selected',button.dataset.adminTab===adminTab));
  const content=$('#adminContent');
  if(adminTab==='products') {
    content.innerHTML=`<button class="button button-terracotta admin-new" id="adminNew">+ Novo produto</button><div id="adminFormHost"></div><div>${products.map(product=>`<div class="admin-row"><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${currency(product.price)} · ${product.stock?'Disponível':'Indisponível'}</small></div><div><button data-admin-edit="${escapeHtml(product.id)}">Editar</button><button data-admin-delete="${escapeHtml(product.id)}">Excluir</button></div></div>`).join('')||'<p class="admin-empty">Nenhum produto cadastrado.</p>'}</div>`;
  } else {
    content.innerHTML=`<form id="categoryForm" class="admin-form"><h3>Adicionar categoria</h3><div class="form-grid"><label>Nome<input name="category" required placeholder="Ex.: Decoração"></label></div><button class="button button-terracotta" type="submit">Adicionar</button></form><div>${categories.map(category=>`<div class="admin-row"><strong>${escapeHtml(category)}</strong><div><button data-category-edit="${escapeHtml(category)}">Renomear</button><button data-category-delete="${escapeHtml(category)}">Excluir</button></div></div>`).join('')}</div>`;
  }
}
function renderAdminForm(id=null) {
  adminEditing=id;
  const product=id?products.find(item=>item.id===id):null;
  $('#adminFormHost').innerHTML=`<form id="productForm" class="admin-form"><h3>${product?'Editar produto':'Novo produto'}</h3><div class="form-grid"><label>Nome<input name="name" required value="${escapeHtml(product?.name||'')}"></label><label>Categoria<select name="category">${categories.map(cat=>`<option value="${escapeHtml(cat)}" ${product?.category===cat?'selected':''}>${escapeHtml(cat)}</option>`).join('')}</select></label><label>Preço ilustrativo (R$)<input name="price" type="number" min="1" step="0.01" required value="${product?.price||''}"></label><label>Imagem conceitual<select name="sprite">${['Mandala amarela','Mandala clara','Porta-chaves','Incensário terracota','Chaveiro','Incensário claro'].map((label,index)=>`<option value="${index}" ${product?.sprite===index?'selected':''}>${label}</option>`).join('')}</select></label><label>Dimensões<input name="size" value="${escapeHtml(product?.size||'')}"></label><label>Materiais<input name="material" value="${escapeHtml(product?.material||'')}"></label><label>Etiqueta<input name="badge" value="${escapeHtml(product?.badge||'Feita à mão')}"></label><label>Disponibilidade<select name="stock"><option value="yes" ${product?.stock!==false?'selected':''}>Disponível</option><option value="no" ${product?.stock===false?'selected':''}>Indisponível</option></select></label></div><label style="margin-top:10px">Descrição<input name="description" value="${escapeHtml(product?.description||'')}"></label><button class="button button-dark" type="submit">Salvar produto</button><button type="button" class="text-button" id="cancelAdminForm">Cancelar</button></form>`;
}
function uniqueId(name){return `${name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${Date.now().toString(36)}`;}

document.addEventListener('click',event=>{
  const target=event.target.closest('button,[data-open-product]'); if(!target)return;
  if(target.matches('[data-close]')){closeDialogs();closeCart();return;}
  if(target.dataset.add){event.stopPropagation();addToCart(target.dataset.add);return;}
  if(target.dataset.open3d){openProduct(target.dataset.open3d,true);return;}
  if(target.dataset.openProduct){openProduct(target.dataset.openProduct);return;}
  if(target.dataset.category && target.closest('#categoryTabs')){activeCategory=target.dataset.category;renderProducts();return;}
  if(target.dataset.category && target.closest('.category-cards')){activeCategory=target.dataset.category;renderProducts();document.querySelector('#colecao').scrollIntoView({behavior:'smooth'});return;}
  if(target.dataset.cartInc){cart[target.dataset.cartInc]++;saveCart();return;}
  if(target.dataset.cartDec){cart[target.dataset.cartDec]--;if(cart[target.dataset.cartDec]<=0)delete cart[target.dataset.cartDec];saveCart();return;}
  if(target.dataset.cartRemove){delete cart[target.dataset.cartRemove];saveCart();return;}
  if(target.id==='detailInc'){let q=$('#detailQty');q.textContent=Number(q.textContent)+1;return;}
  if(target.id==='detailDec'){let q=$('#detailQty');q.textContent=Math.max(1,Number(q.textContent)-1);return;}
  if(target.id==='detailAdd'){const qty=Number($('#detailQty').textContent);closeDialogs();addToCart(currentProduct,qty);return;}
  if(target.id==='modelTrigger'){$('#modelBox').classList.toggle('open');return;}
  if(target.id==='arStart'){
    const viewer=$('#arViewer');
    if(viewer?.canActivateAR) Promise.resolve(viewer.activateAR()).catch(()=>showInfo('AR indisponível','Não foi possível abrir a câmera neste aparelho. Tente a opção com foto do ambiente.'));
    return;
  }
  if(target.id==='adminNew'){renderAdminForm();return;}
  if(target.dataset.adminEdit){renderAdminForm(target.dataset.adminEdit);return;}
  if(target.dataset.adminDelete){const product=products.find(item=>item.id===target.dataset.adminDelete);if(product&&confirm(`Excluir ${product.name} desta demonstração?`)){products=products.filter(item=>item.id!==product.id);delete cart[product.id];saveData();saveCart();renderProducts();renderAdmin();}return;}
  if(target.dataset.adminTab){adminTab=target.dataset.adminTab;renderAdmin();return;}
  if(target.dataset.categoryEdit){const old=target.dataset.categoryEdit;const next=prompt('Novo nome da categoria:',old)?.trim();if(next&&next!==old&&!categories.includes(next)){categories=categories.map(cat=>cat===old?next:cat);products.forEach(product=>{if(product.category===old)product.category=next});if(activeCategory===old)activeCategory=next;saveData();renderProducts();renderAdmin();}return;}
  if(target.dataset.categoryDelete){const category=target.dataset.categoryDelete;if(products.some(product=>product.category===category)){showInfo('Categoria em uso','Mova ou exclua os produtos desta categoria antes de removê-la.');return;}if(confirm(`Excluir a categoria ${category}?`)){categories=categories.filter(cat=>cat!==category);activeCategory='Todos';saveData();renderProducts();renderAdmin();}return;}
  if(target.id==='cancelAdminForm'){$('#adminFormHost').innerHTML='';return;}
});
document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-open-product][role="button"]')){event.preventDefault();openProduct(event.target.dataset.openProduct);}});
document.addEventListener('change', event => {
  if (event.target.id !== 'roomPhotoInput') return;
  const file = event.target.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (roomPhotoUrl) URL.revokeObjectURL(roomPhotoUrl);
  roomPhotoUrl = URL.createObjectURL(file);
  $('#roomImage').src = roomPhotoUrl;
  $('#roomCanvas').hidden = false;
  $('#roomScaleLabel').hidden = false;
});
document.addEventListener('input', event => {
  if (event.target.id === 'roomScale') $('#roomProduct').style.width = `${event.target.value}%`;
});
$('#productDialog').addEventListener('close', () => {
  if (roomPhotoUrl) URL.revokeObjectURL(roomPhotoUrl);
  roomPhotoUrl = null;
});
document.addEventListener('submit',event=>{
  if(event.target.id==='customForm'){event.preventDefault();const message=makeOrderMessage(event.target);$('#customMessage').value=message;$('#customStatus').textContent=`A mensagem será aberta para ${STORE_WHATSAPP}. Revise os dados antes de enviar.`;$('#openWhatsApp').href=`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;$('#customResult').hidden=false;$('#customResult').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
  if(event.target.id==='productForm'){event.preventDefault();const data=Object.fromEntries(new FormData(event.target).entries());const product={id:adminEditing||uniqueId(data.name),name:data.name.trim(),category:data.category,price:Number(data.price),sprite:Number(data.sprite),badge:data.badge.trim(),stock:data.stock==='yes',description:data.description.trim(),size:data.size.trim(),material:data.material.trim(),model:adminEditing?Boolean(products.find(item=>item.id===adminEditing)?.model):false};if(adminEditing)products=products.map(item=>item.id===adminEditing?product:item);else products.push(product);saveData();renderProducts();renderCart();renderAdmin();return;}
  if(event.target.id==='categoryForm'){event.preventDefault();const name=new FormData(event.target).get('category').trim();if(name&&!categories.includes(name)){categories.push(name);saveData();renderProducts();renderAdmin();}return;}
});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()}));
$('#overlay').addEventListener('click',closeCart);
$('#cartButton').addEventListener('click',openCart);
$('#searchTrigger').addEventListener('click',()=>{openDialog('#searchDialog');setTimeout(()=>$('#searchInput').focus(),30)});
$('#searchInput').addEventListener('keydown',event=>{if(event.key==='Enter')updateSearch()});
$('#searchSubmit').addEventListener('click',updateSearch);
$('#catalogSearch').addEventListener('input',event=>{searchTerm=event.target.value.trim();renderProducts()});
$('#accountButton').addEventListener('click',()=>showInfo('Sua conta está a caminho','O login de clientes será habilitado junto com o banco de dados e o checkout. Nesta demonstração, você já pode explorar os produtos e o carrinho.'));
$('#filterToggle').addEventListener('click',()=>{const panel=$('#filterPanel');panel.hidden=!panel.hidden;$('#filterToggle').setAttribute('aria-expanded',String(!panel.hidden))});
$('#maxPrice').addEventListener('input',renderProducts);$('#stockOnly').addEventListener('change',renderProducts);$('#sortProducts').addEventListener('change',renderProducts);
$('#clearFilters').addEventListener('click',()=>{$('#maxPrice').value=300;$('#stockOnly').checked=false;$('#sortProducts').value='featured';renderProducts()});
$('#resetSearch').addEventListener('click',()=>{searchTerm='';activeCategory='Todos';$('#searchInput').value='';$('#catalogSearch').value='';$('#maxPrice').value=300;$('#stockOnly').checked=false;renderProducts()});
$('#customButton').addEventListener('click',()=>openDialog('#customDialog'));
$('#copyMessage').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#customMessage').value);$('#copyMessage').textContent='Copiado ✓';setTimeout(()=>$('#copyMessage').textContent='Copiar mensagem',2200)}catch{showInfo('Não foi possível copiar','Selecione o texto da mensagem e copie manualmente.')}});
$('#checkoutButton').addEventListener('click',()=>{closeCart();showInfo('Pagamento em preparação','O carrinho funciona nesta demonstração. Para concluir compras reais, vamos conectar a conta Mercado Pago da loja e confirmar preços, estoque e frete.');});
$('#footerContact').addEventListener('click',()=>{location.href=`https://wa.me/${STORE_WHATSAPP}`});
$('#footerWhatsApp').addEventListener('click',()=>{location.href=`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá! Vim pelo site da Mandalaria D'ogum e gostaria de conversar.")}`});
$('#newsletterContact').addEventListener('click',()=>{location.href=`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá! Gostaria de acompanhar as novidades da Mandalaria D'ogum.")}`});
$('#adminDemo').addEventListener('click',()=>{adminTab='products';renderAdmin();openDialog('#adminDialog')});
$('#currentYear').textContent=new Date().getFullYear();
renderProducts();renderCart();
