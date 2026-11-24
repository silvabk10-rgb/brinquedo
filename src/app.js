import { createCommerce, formatPrice, isDemoProduct, renderCheckout } from './commerce.js';
import { storeInfo, policies, helpItems } from './storeInfo.js';

const categories = {
  'action-figures': 'Action figures',
  'funko-pop': 'Funko Pop!',
  estatuas: 'Estátuas',
  acessorios: 'Acessórios',
  pelucias: 'Pelúcias',
  decoracao: 'Decoração',
  outros: 'Outros colecionáveis',
};

const concepts = [
  { id: 'ml-brasa', name: 'Guardião da Brasa', category: 'action-figures', image: 'figure.jpg', description: 'Figure conceitual de um lutador com manto vermelho e pose de combate.', price: 169.90 },
  { id: 'ml-orbita', name: 'Órbita, o Explorador', category: 'outros', image: 'vinyl.jpg', description: 'Colecionável de vinil conceitual com capacete espacial e acabamento turquesa.', price: 109.90 },
  { id: 'ml-nebula', name: 'Sentinela Nébula', category: 'estatuas', image: 'mecha.jpg', description: 'Estátua conceitual de um mecha com armadura prateada e detalhes violeta.', price: 229.90 },
  { id: 'ml-arcade', name: 'Case Arcade de Bolso', category: 'acessorios', image: 'accessory.jpg', description: 'Case conceitual em formato de console retrô com chaveiro de foguete.', price: 79.90 },
].map(product => ({ ...product, brand: 'Modo Lenda', demo: true }));

const $ = selector => document.querySelector(selector);
const views = { home: $('#home-view'), catalogo: $('#catalog-view'), ajuda: $('#help-view'), politica: $('#policy-view') };
const dialog = $('#dialog');
const dialogBody = $('#dialog-body');
const pageSize = 24;
const sort = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const number = new Intl.NumberFormat('pt-BR');
const filterOptions = new Map();
const commerce = createCommerce({ products: concepts });
let products = concepts;
let productById = new Map(concepts.map(product => [product.id, product]));
let catalogStatus = 'loading';
let activeDialog = null;
let toastTimer;
let catalogRequest;

function escape(value) {
  const symbols = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => symbols[character]);
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().trim();
}

function icon(id) {
  return `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; }, 2400);
}

function updateCounts() {
  const values = { '#favorites-count': commerce.getState().favorites.length, '#cart-count': commerce.getCart().count };
  for (const [selector, value] of Object.entries(values)) {
    $(selector).hidden = !value;
    $(selector).textContent = String(value);
  }
}

function placeholder() {
  return `<div class="product-placeholder" aria-label="Imagem do produto pendente">${icon('box')}</div>`;
}

function productImage(product) {
  return product.image
    ? `<img src="./assets/${escape(product.image)}" alt="${escape(product.description)}" width="560" height="560" loading="lazy" decoding="async">`
    : placeholder();
}

function favoriteButton(product, className = '') {
  const pressed = commerce.isFavorite(product.id);
  return `<button type="button" class="icon-button ${className}" data-action="favorite" data-id="${escape(product.id)}" aria-label="${pressed ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${escape(product.name)}" aria-pressed="${pressed}">${icon('heart')}</button>`;
}

function productCard(product) {
  const id = escape(product.id);
  const demo = isDemoProduct(product);
  const category = categories[product.category] || 'Colecionáveis';
  const meta = !demo && product.franchise ? `${category} · ${product.franchise}` : category;
  return `<article class="product-card">
    <button type="button" class="product-media ${demo ? '' : 'reference-media'}" data-action="detail" data-id="${id}" aria-label="Ver detalhes de ${escape(product.name)}">
      ${productImage(product)}
      ${demo ? '<span class="pill">Demonstração</span>' : ''}
    </button>
    ${favoriteButton(product, 'favorite')}
    <div class="product-copy">
      <p class="product-meta">${escape(meta)}</p>
      <h3 class="product-name"><button type="button" data-action="detail" data-id="${id}">${escape(product.name)}</button></h3>
      ${demo ? `<div class="price">${formatPrice(product.price)}</div><button class="button outline" data-action="add" data-id="${id}">Testar no carrinho</button>` : `<div class="product-status">Disponibilidade a confirmar</div><button class="button outline" data-action="detail" data-id="${id}">Ver detalhes</button>`}
    </div>
  </article>`;
}

function routeState() {
  const [path, query] = location.hash.slice(1).split('?');
  return { path: path || 'inicio', params: new URLSearchParams(query) };
}

function catalogLink(params) {
  const query = params.toString();
  return '#catalogo' + (query ? '?' + query : '');
}

function applyFilters(form) {
  return new URLSearchParams([...new FormData(form)].filter(([, value]) => String(value).trim()));
}

function buildFilter(selectId, field, all, values) {
  const select = $(selectId);
  const options = values.map(([value, label]) => new Option(label, value));
  select.replaceChildren(new Option(all, ''), ...options);
  filterOptions.set(field, new Set(values.map(([value]) => value)));
}

function initFilters() {
  const list = field => [...new Set(products.map(product => product[field]).filter(Boolean))]
    .sort(sort.compare).map(value => [value, value]);
  buildFilter('#filter-category', 'categoria', 'Todas as categorias', Object.entries(categories));
  buildFilter('#filter-franchise', 'franquia', 'Todos os universos', list('franchise'));
  buildFilter('#filter-brand', 'marca', 'Todas as marcas', list('brand'));
}

function catalogResults(params) {
  const query = (params.get('q') || '').slice(0, 100);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const category = filterOptions.get('categoria').has(params.get('categoria')) ? params.get('categoria') : '';
  const franchise = filterOptions.get('franquia').has(params.get('franquia')) ? params.get('franquia') : '';
  const brand = filterOptions.get('marca').has(params.get('marca')) ? params.get('marca') : '';
  const order = ['nome', 'nome-desc'].includes(params.get('ordem')) ? params.get('ordem') : '';
  const filtered = products.filter(product => {
    if (category && product.category !== category) return false;
    if (franchise && product.franchise !== franchise) return false;
    if (brand && product.brand !== brand) return false;
    const searchable = normalize([product.name, product.franchise, product.brand, categories[product.category], ...(product.keywords || [])].join(' '));
    return terms.every(term => searchable.includes(term));
  });

  if (order) filtered.sort((first, second) => sort.compare(first.name, second.name) * (order === 'nome-desc' ? -1 : 1));

  return { query, category, franchise, brand, order, filtered };
}

function renderPagination(params, page, totalPages) {
  const node = $('#catalog-pagination');
  if (totalPages < 2) {
    node.replaceChildren();
    return;
  }

  const link = (index, text) => {
    const next = new URLSearchParams(params);
    if (index > 1) next.set('pagina', String(index)); else next.delete('pagina');
    return `<a class="button outline ${index === page && typeof text === 'number' ? 'current' : ''}" href="${escape(catalogLink(next))}" ${index === page ? 'aria-current="page"' : ''}>${text}</a>`;
  };

  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter(index => index >= 1 && index <= totalPages).sort((a, b) => a - b);
  const links = pages.map((index, offset) => `${offset > 0 && index - pages[offset - 1] > 1 ? '<span aria-hidden="true">…</span>' : ''}${link(index, index)}`);
  node.innerHTML = [page > 1 ? link(page - 1, 'Anterior') : '', ...links, page < totalPages ? link(page + 1, 'Próxima') : ''].join('');
}

function renderCatalog(params) {
  const { query, category, franchise, brand, order, filtered } = catalogResults(params);
  $('#filter-query').value = query;
  $('#hero-search').value = query;
  $('#filter-category').value = category;
  $('#filter-franchise').value = franchise;
  $('#filter-brand').value = brand;
  $('#filter-sort').value = order;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const requestedPage = Number(params.get('pagina'));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(totalPages, Math.max(1, requestedPage)) : 1;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  $('#clear-filters').hidden = !(query || category || franchise || brand || order);
  const status = catalogStatus === 'loading' ? 'Carregando o catálogo…' : catalogStatus === 'error'
    ? 'O catálogo de referência está temporariamente indisponível.'
    : `${number.format(filtered.length)} ${filtered.length === 1 ? 'resultado' : 'resultados'}`;
  $('#catalog-count').textContent = status;
  $('#catalog-products').innerHTML = items.length ? items.map(productCard).join('') : catalogStatus === 'loading'
    ? '<p class="empty">Buscando colecionáveis…</p>'
    : '<p class="empty">Nenhum item encontrado. Experimente outro nome ou categoria.</p>';
  if (catalogStatus === 'error') {
    $('#catalog-products').insertAdjacentHTML('afterbegin', '<p class="empty"><button class="inline-button" data-action="retry">Tentar carregar o catálogo novamente</button></p>');
  }
  renderPagination(params, page, totalPages);
}

function renderHelp() {
  $('#help-content').innerHTML = helpItems.map(item => `<details><summary>${escape(item.question)}</summary><p>${escape(item.answer)}</p></details>`).join('');
}

function renderPolicy(id) {
  const policy = policies.find(item => item.id === id);
  $('#policy-title').textContent = policy?.title || 'Página indisponível';
  $('#policy-content').innerHTML = policy
    ? `<p>${escape(policy.intro)}</p>${policy.sections.map(section => `<section><h2>${escape(section.title)}</h2><p>${escape(section.body)}</p></section>`).join('')}
    <h2>Referências</h2><ul>${policy.sources.map(source => `<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.label)}</a></li>`).join('')}</ul>`
    : '<p>Encontre as políticas e perguntas frequentes na <a href="#ajuda">central de ajuda</a>.</p>';
}

function renderRoute({ focus = true } = {}) {
  const { path, params } = routeState();
  const view = path.startsWith('politica/') ? 'politica' : Object.hasOwn(views, path) ? path : 'home';
  for (const [name, element] of Object.entries(views)) element.hidden = name !== view;
  if (view === 'catalogo') renderCatalog(params);
  if (view === 'ajuda') renderHelp();
  if (view === 'politica') renderPolicy(path.split('/')[1]);
  if (view === 'home') $('#hero-search').value = '';
  document.querySelectorAll('.nav a').forEach(link => {
    link.toggleAttribute('data-current', link.getAttribute('href') === location.hash);
    if (link.hasAttribute('data-current')) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const target = { catalogo: '#catalog-title', ajuda: '#help-title', politica: '#policy-title' }[view];
  const page = target ? $(target).textContent : 'Figures e colecionáveis geek';
  document.title = `Modo Lenda | ${page}`;
  if (focus) {
    if (path === 'universos') {
      $('#universos').focus({ preventScroll: true });
      $('#universos').scrollIntoView({ block: 'center' });
    } else if (path !== 'conteudo') {
      const heading = target ? $(target) : $('#conteudo');
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
}

function showDialog(title, content, kind) {
  activeDialog = kind;
  $('#dialog-title').textContent = title;
  dialogBody.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}

function showProduct(id) {
  const product = productById.get(id);
  if (!product) return;
  const demo = isDemoProduct(product);
  const details = [categories[product.category], product.franchise, product.brand].filter(Boolean).map(escape).join(' · ');
  const source = /^https:\/\//.test(product.sourceUrl ?? '')
    ? `<a href="${escape(product.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(product.source)}</a>` : escape(product.source);
  showDialog(product.name, `<div class="detail-layout">
    <div class="detail-art">${productImage(product)}</div>
    <div><p class="detail-meta">${details}</p>
    ${demo
      ? `<p>${escape(product.description)}</p><p><strong>${formatPrice(product.price)}</strong> · Preço de demonstração</p>`
      : `<p>Item de referência em curadoria. A disponibilidade, o preço de venda e as fotos estão em confirmação.</p><p>Referência de catálogo: ${source}.</p>`}
    <div class="detail-actions">${favoriteButton(product)}${demo ? `<button class="button primary" data-action="add" data-id="${escape(id)}">Testar no carrinho</button>` : ''}</div></div>
  </div>`, 'detail');
}

function showFavorites() {
  const saved = commerce.getState().favorites.map(id => productById.get(id)).filter(Boolean);
  const markup = saved.length ? `<ul class="short-list">${saved.map(product => `<li>
    <button type="button" class="row-link" data-action="detail" data-id="${escape(product.id)}"><strong>${escape(product.name)}</strong><small>${escape(categories[product.category])}</small></button>
    <button type="button" class="inline-button" data-action="favorite" data-id="${escape(product.id)}" aria-label="Remover ${escape(product.name)} dos favoritos">Remover</button></li>`).join('')}</ul>`
    : '<p>Toque no coração de uma peça para salvar aqui.</p><a class="button primary" href="#catalogo" data-action="close">Explorar catálogo</a>';
  showDialog('Meus favoritos', markup, 'favorites');
}

function showCart() {
  const cart = commerce.getCart();
  const markup = cart.items.length ? `<p>Os itens abaixo são peças de demonstração.</p>
    <ul class="short-list">${cart.items.map(({ id, product, quantity, lineTotal }) => `<li><div><strong>${escape(product.name)}</strong><small>${formatPrice(lineTotal)}</small></div>
    <div class="qty"><button type="button" data-action="quantity" data-id="${escape(id)}" data-quantity="${quantity - 1}" aria-label="Diminuir quantidade de ${escape(product.name)}">−</button><span aria-label="Quantidade">${quantity}</span><button type="button" data-action="quantity" data-id="${escape(id)}" data-quantity="${quantity + 1}" aria-label="Aumentar quantidade de ${escape(product.name)}" ${quantity >= 99 ? 'disabled' : ''}>+</button></div></li>`).join('')}</ul>
    <p class="cart-total"><span>Subtotal de teste</span><strong>${formatPrice(cart.subtotal)}</strong></p>
    <div class="cart-actions"><button type="button" class="button outline" data-action="close">Continuar explorando</button><button type="button" class="button primary" data-action="checkout">Simular compra</button></div>`
    : '<p>Seu carrinho de demonstração está vazio. Adicione uma peça da coleção conceito para testar a compra.</p><a class="button primary" href="#inicio" data-action="close">Ver peças conceito</a>';
  showDialog('Carrinho', markup, 'cart');
}

function showCompany() {
  const lines = [
    ['Nome da loja', storeInfo.brand],
    ['CNPJ informado', storeInfo.cnpj],
    ['Razão social', storeInfo.legalName],
    ['Endereço', storeInfo.address],
    ['E-mail', storeInfo.email],
    ['WhatsApp', storeInfo.whatsapp],
  ].filter(([, value]) => value);
  showDialog('Dados da loja', `<dl>${lines.map(([label, value]) => `<div class="company-line"><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
    ${storeInfo.businessDetailsPending ? '<p>Dados cadastrais e canal de atendimento em confirmação.</p>' : ''}
    <a href="#politica/termos" data-action="close">Consultar termos de uso</a>`, 'company');
}

function updateFavoriteControls(id) {
  const product = productById.get(id);
  const pressed = commerce.isFavorite(id);
  document.querySelectorAll('[data-action="favorite"][aria-pressed]').forEach(button => {
    if (button.dataset.id !== id) return;
    button.setAttribute('aria-pressed', String(pressed));
    button.setAttribute('aria-label', `${pressed ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${product.name}`);
  });
}

function loadCatalog() {
  if (catalogRequest) return catalogRequest;
  catalogStatus = 'loading';
  if (routeState().path === 'catalogo') renderCatalog(routeState().params);

  catalogRequest = (Array.isArray(globalThis.modoLendaCatalog) ? Promise.resolve(globalThis.modoLendaCatalog) :
    fetch(new URL('../public/catalog.json', import.meta.url)).then(response => {
      if (!response.ok) throw new Error('Falha ao carregar catálogo');
      return response.json();
    }))
    .then(imported => {
      if (!Array.isArray(imported)) throw new Error('Formato inválido');
      products = [...concepts, ...imported.filter(product => product?.id && product.name && !product.demo)];
      productById = new Map(products.map(product => [product.id, product]));
      commerce.setProducts(products);
      initFilters();
      catalogStatus = 'ready';
      if (activeDialog === 'favorites') showFavorites();
      updateCounts();
    })
    .catch(() => { catalogStatus = 'error'; })
    .finally(() => {
      catalogRequest = null;
      if (routeState().path === 'catalogo') renderCatalog(routeState().params);
    });
  return catalogRequest;
}

document.addEventListener('click', event => {
  const checkoutClose = event.target.closest('[data-checkout-close]');
  if (checkoutClose) { dialog.close(); return; }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, id, quantity } = control.dataset;

  switch (action) {
    case 'detail': showProduct(id); break;
    case 'company': showCompany(); break;
    case 'favorites': showFavorites(); break;
    case 'cart': showCart(); break;
    case 'checkout':
      showDialog('Simular compra', renderCheckout(commerce.getCart()), 'checkout');
      break;
    case 'add':
      if (commerce.addToCart(id)) {
        updateCounts();
        showCart();
      }
      break;
    case 'quantity':
      if (commerce.setQuantity(id, Number(quantity))) {
        updateCounts();
        showCart();
        const replacement = [...dialogBody.querySelectorAll('[data-action="quantity"]')]
          .find(button => button.dataset.id === id && Number(button.dataset.quantity) - Number(quantity) === (control.textContent === '+' ? 1 : -1));
        (replacement && !replacement.disabled ? replacement : dialog.querySelector('.close')).focus();
      }
      break;
    case 'favorite': {
      if (!productById.has(id)) break;
      const added = commerce.toggleFavorite(id);
      updateFavoriteControls(id);
      updateCounts();
      if (activeDialog === 'favorites') {
        showFavorites();
        (dialogBody.querySelector('[data-action="favorite"], a') ?? dialog.querySelector('.close')).focus();
      }
      showToast(added ? 'Peça salva nos favoritos' : 'Peça removida dos favoritos');
      break;
    }
    case 'retry': loadCatalog(); break;
    case 'close': dialog.close(); break;
  }
});

document.addEventListener('submit', event => {
  if (event.target.matches('#header-search, #filters')) {
    event.preventDefault();
    const destination = catalogLink(applyFilters(event.target));
    if (destination === location.hash) renderRoute();
    else location.hash = destination;
  }
  if (event.target.matches('[data-checkout-form]')) {
    event.preventDefault();
    const cart = commerce.getCart();
    if (!cart.items.length) { showCart(); return; }
    commerce.clearCart();
    updateCounts();
    showDialog('Simulação finalizada', renderCheckout(cart, { completed: true }), 'checkout');
    dialogBody.querySelector('[data-checkout-close]')?.focus();
  }
});

dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { activeDialog = null; });
window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
  renderRoute();
});
window.addEventListener('storage', () => {
  updateCounts();
  document.querySelectorAll('[data-action="favorite"][aria-pressed]').forEach(button => {
    if (productById.has(button.dataset.id)) updateFavoriteControls(button.dataset.id);
  });
  if (activeDialog === 'favorites') showFavorites();
  if (activeDialog === 'cart') showCart();
});

initFilters();
$('#featured-products').innerHTML = concepts.map(productCard).join('');
updateCounts();
renderRoute({ focus: Boolean(location.hash) });
loadCatalog();
