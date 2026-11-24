import { createFavorites, formatPrice } from './commerce.js';
import { productImages, productCatalogPrice, renderProductPage, renderMissingProduct, renderProductLoading, selectProductPhoto } from './productPage.js';
import { storeInfo, policies, helpItems } from './storeInfo.js';
import { createCart, renderCart } from './cart.js';

const categories = {
  'action-figures': 'Action figures',
  'funko-pop': 'Funko Pop!',
  estatuas: 'Estátuas',
  acessorios: 'Acessórios',
  pelucias: 'Pelúcias',
  decoracao: 'Decoração',
  outros: 'Outros colecionáveis',
};

const $ = selector => document.querySelector(selector);
const views = { home: $('#home-view'), catalogo: $('#catalog-view'), produto: $('#product-view'), ajuda: $('#help-view'), politica: $('#policy-view') };
const dialog = $('#dialog');
const dialogBody = $('#dialog-body');
const pageSize = 24;
const sort = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const number = new Intl.NumberFormat('pt-BR');
const filterOptions = new Map();
const favorites = createFavorites();
const cart = createCart();
const compact = window.matchMedia('(max-width: 680px)');
let products = [];
let productById = new Map();
let catalogStatus = 'loading';
let activeDialog;
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
  const counts = { '#favorites-count': favorites.get().filter(id => !id.startsWith('ml-')).length, '#cart-count': cart.count() };
  for (const [selector, count] of Object.entries(counts)) {
    const badge = $(selector);
    badge.hidden = !count;
    badge.textContent = String(count);
  }
}

function categoryLabel(product) {
  return categories[product.category] || 'Colecionáveis';
}

function productLink(product) {
  return `/produto/${encodeURIComponent(product.id)}/`;
}

function favoriteButton(product) {
  const pressed = favorites.has(product.id);
  return `<button type="button" class="icon-button favorite" data-action="favorite" data-id="${escape(product.id)}" aria-label="${pressed ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${escape(product.name)}" aria-pressed="${pressed}">${icon('heart')}</button>`;
}

function productCard(product) {
  const href = escape(productLink(product));
  const name = escape(product.name);
  const offer = productCatalogPrice(product);
  const image = productImages(product)[0];
  const meta = [categoryLabel(product), product.franchise].filter(Boolean).join(' · ');
  const placeholder = `<span class="product-placeholder" data-category="${escape(product.category)}" aria-hidden="true" ${image ? 'hidden' : ''}>${icon('box')}</span>`;
  const photo = image
    ? `<img src="${escape(image.url)}" alt="" width="560" height="560" loading="lazy" decoding="async" referrerpolicy="no-referrer">${placeholder}`
    : placeholder;
  return `<article class="product-card">
    <div class="product-visual">
      <a class="product-media${image ? '' : ' is-missing'}" href="${href}" aria-label="Ver ${name}">${photo}</a>
      ${product.available ? '<p class="card-stock">Pronta entrega</p>' : ''}
      ${favoriteButton(product)}
    </div>
    <div class="product-copy">
      <p class="product-meta">${escape(meta)}</p>
      <h3 class="product-name"><a href="${href}">${name}</a></h3>
      ${offer ? `<div class="card-pricing"><strong>${formatPrice(offer.price)}</strong></div>
      <button class="button card-action" type="button" data-action="cart-add" data-id="${escape(product.id)}" aria-label="Adicionar ${name} ao carrinho">${icon('bag')} Adicionar</button>` : '<p class="card-pricing card-pricing-pending">Preço a confirmar</p>'}
      ${offer ? '' : `<a class="button outline" href="${href}">Ver produto</a>`}
    </div>
  </article>`;
}

function getRoute() {
  if (location.pathname === '/produto' || location.pathname.startsWith('/produto/')) {
    const match = location.pathname.match(/^\/produto\/([^/]+)\/?$/);
    let id = '';
    try { if (match) id = decodeURIComponent(match[1]); } catch { id = ''; }
    return { view: 'produto', path: 'produto', id };
  }

  const [path = '', query] = location.hash.slice(1).split('?');
  const view = path.startsWith('politica/') ? 'politica' : ['catalogo', 'ajuda'].includes(path) ? path : 'home';
  return { view, path: path || 'inicio', params: new URLSearchParams(query) };
}

function catalogLink(params = new URLSearchParams()) {
  const query = params.toString();
  return '/#catalogo' + (query ? '?' + query : '');
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
  const validOption = key => filterOptions.get(key).has(params.get(key)) ? params.get(key) : '';
  const category = validOption('categoria');
  const franchise = validOption('franquia');
  const brand = validOption('marca');
  const order = ['nome', 'nome-desc', 'menor-preco', 'maior-preco'].includes(params.get('ordem')) ? params.get('ordem') : '';
  const filtered = products.filter(product => {
    if (category && product.category !== category) return false;
    if (franchise && product.franchise !== franchise) return false;
    if (brand && product.brand !== brand) return false;
    return terms.every(term => product.searchable.includes(term));
  });

  if (order === 'nome' || order === 'nome-desc') {
    filtered.sort((first, second) => sort.compare(first.name, second.name) * (order === 'nome-desc' ? -1 : 1));
  } else if (order) {
    const direction = order === 'menor-preco' ? 1 : -1;
    filtered.sort((first, second) => {
      const a = productCatalogPrice(first)?.price;
      const b = productCatalogPrice(second)?.price;
      if (a === undefined || b === undefined) return Number(a === undefined) - Number(b === undefined);
      return (a - b) * direction || sort.compare(first.name, second.name);
    });
  } else {
    filtered.sort((first, second) => Number(Boolean(second.photos?.length)) - Number(Boolean(first.photos?.length)));
  }
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
    const current = index === page;
    return `<a class="button outline${current ? ' current' : ''}" href="${escape(catalogLink(next))}" ${current ? 'aria-current="page"' : ''}>${text}</a>`;
  };

  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter(index => index >= 1 && index <= totalPages).sort((a, b) => a - b);
  const links = pages.map((index, offset) => `${offset > 0 && index - pages[offset - 1] > 1 ? '<span aria-hidden="true">…</span>' : ''}${link(index, index)}`);
  node.innerHTML = [page > 1 ? link(page - 1, 'Anterior') : '', ...links, page < totalPages ? link(page + 1, 'Próxima') : ''].join('');
}

function retryMarkup() {
  return '<p class="empty">O catálogo está indisponível no momento. <button class="inline-button" type="button" data-action="retry">Tentar novamente</button></p>';
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
    ? 'Catálogo indisponível' : `${number.format(filtered.length)} ${filtered.length === 1 ? 'resultado' : 'resultados'}`;
  $('#catalog-count').textContent = status;
  $('#catalog-products').innerHTML = items.length ? items.map(productCard).join('') : {
    loading: '<p class="empty">Buscando colecionáveis…</p>',
    error: retryMarkup(),
    ready: '<p class="empty">Nenhum item encontrado. Experimente outro nome ou categoria.</p>',
  }[catalogStatus];
  renderPagination(params, page, totalPages);
}

function renderFeatured() {
  const grid = $('#featured-products');
  if (catalogStatus !== 'ready') {
    grid.innerHTML = catalogStatus === 'loading' ? '<p class="empty">Carregando destaques…</p>' : retryMarkup();
    return;
  }
  const featuredCategories = ['action-figures', 'funko-pop', 'estatuas', 'acessorios', 'pelucias', 'decoracao'];
  const withPhotos = products.filter(product => product.photos?.length && productCatalogPrice(product));
  const featured = featuredCategories.map(category => withPhotos.find(product => product.category === category)).filter(Boolean);
  for (const product of withPhotos) {
    if (featured.length >= 8) break;
    if (!featured.includes(product)) featured.push(product);
  }
  if (!featured.length) featured.push(...products.slice(0, 4));
  grid.innerHTML = featured.map(productCard).join('');
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
    : '<p>Encontre as políticas e perguntas frequentes na <a href="/#ajuda">central de ajuda</a>.</p>';
}

function relatedProducts(product) {
  const matches = [];
  const add = candidate => {
    if (matches.length < 4 && candidate.id !== product.id && !matches.includes(candidate)) matches.push(candidate);
  };
  if (product.franchise) {
    for (const candidate of products) {
      if (candidate.franchise === product.franchise) add(candidate);
    }
  }
  for (const candidate of products) {
    if (candidate.category === product.category) add(candidate);
  }
  return matches.map(productCard).join('');
}

function renderProduct(id) {
  if (catalogStatus === 'loading') views.produto.innerHTML = renderProductLoading();
  else if (catalogStatus === 'error') views.produto.innerHTML = retryMarkup();
  else {
    const product = productById.get(id);
    views.produto.innerHTML = product
      ? renderProductPage(product, { categoryLabel: categoryLabel(product), isFavorite: favorites.has(id), relatedHtml: relatedProducts(product) })
      : renderMissingProduct();
  }
}

function renderRoute({ focus = true } = {}) {
  const { view, path, params, id } = getRoute();
  for (const [name, element] of Object.entries(views)) element.hidden = name !== view;
  const product = view === 'produto' ? productById.get(id) : null;
  if (view === 'home') {
    $('#hero-search').value = '';
    renderFeatured();
  }
  if (view === 'catalogo') renderCatalog(params);
  if (view === 'ajuda') renderHelp();
  if (view === 'politica') renderPolicy(path.split('/')[1]);
  if (view === 'produto') renderProduct(id);

  document.querySelectorAll('.nav a').forEach(link => {
    if (view !== 'produto' && new URL(link.href).hash === location.hash) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const target = { catalogo: '#catalog-title', ajuda: '#help-title', politica: '#policy-title', produto: '#product-view h1' }[view];
  const title = target ? $(target)?.textContent || 'Produto' : 'Figures e colecionáveis geek';
  document.title = view === 'produto' ? `${title} | Modo Lenda` : `Modo Lenda | ${title}`;
  $('link[rel="canonical"]').href = product ? `https://modolendageek.com${productLink(product)}` : 'https://modolendageek.com/';
  $('meta[name="description"]').content = product
    ? product.description || `${product.name}. Confira os detalhes na Modo Lenda.`
    : 'Explore action figures, Funkos, estátuas e acessórios na vitrine de colecionáveis geek da Modo Lenda.';
  if (focus) {
    if (path === 'universos') {
      $('#universos').focus({ preventScroll: true });
      $('#universos').scrollIntoView({ block: 'center' });
    } else if (path !== 'conteudo') {
      const heading = (target ? $(target) : null) || $('#conteudo');
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
}

function showDialog(title, content, kind) {
  activeDialog = kind;
  dialog.dataset.kind = kind;
  $('#dialog-title').textContent = title;
  dialogBody.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}

function showCart() {
  showDialog('Carrinho', renderCart(cart.get(), productById, { loading: catalogStatus === 'loading' }), 'cart');
}

function showGallery(control) {
  const photo = control.querySelector('[data-gallery-main]');
  if (!photo || photo.hidden) return;
  showDialog('Foto do produto', `<img class="dialog-product-photo" src="${escape(photo.currentSrc || photo.src)}" alt="${escape(photo.alt)}" referrerpolicy="no-referrer">`, 'photo');
}

function showFavorites() {
  const saved = favorites.get().map(id => productById.get(id)).filter(Boolean);
  const markup = saved.length ? `<ul class="short-list">${saved.map(product => `<li>
    <a class="row-link" href="${escape(productLink(product))}"><strong>${escape(product.name)}</strong><small>${escape(categoryLabel(product))}</small></a>
    <button type="button" class="inline-button" data-action="favorite" data-id="${escape(product.id)}" aria-label="Remover ${escape(product.name)} dos favoritos">Remover</button></li>`).join('')}</ul>`
    : catalogStatus === 'loading' ? '<p>Carregando a lista de favoritos…</p>'
    : '<p>Toque no coração de uma peça para salvar aqui.</p><a class="button primary" href="/#catalogo" data-action="close">Explorar catálogo</a>';
  showDialog('Meus favoritos', markup, 'favorites');
}

function showCompany() {
  const lines = [
    ['Nome da loja', storeInfo.brand],
    ['CNPJ', storeInfo.cnpj],
    ['Razão social', storeInfo.legalName],
    ['Endereço', storeInfo.address],
    ['Telefone', storeInfo.phone],
    ...storeInfo.emails.map(email => ['E-mail', email]),
  ].filter(([, value]) => value);
  showDialog('Dados da loja', `<dl>${lines.map(([label, value]) => `<div class="company-line"><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
    <a href="/#politica/termos" data-action="close">Consultar termos de uso</a>`, 'company');
}

function renderFooterContact() {
  const phone = storeInfo.phoneInternational;
  const phoneLink = /^\+\d{10,15}$/.test(phone)
    ? `<a href="tel:${phone}" aria-label="Ligar para ${escape(storeInfo.phone)}">${escape(storeInfo.phone)}</a>` : '';
  const emailLinks = storeInfo.emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    .map(email => `<a href="mailto:${escape(email)}">${escape(email)}</a>`);
  $('#footer-contacts').innerHTML = [phoneLink, ...emailLinks].join('');
  const address = $('#footer-address');
  address.textContent = storeInfo.address || '';
  address.hidden = !storeInfo.address;
}

function updateFavoriteControls(id) {
  const product = productById.get(id);
  const pressed = favorites.has(id);
  document.querySelectorAll('[data-action="favorite"][aria-pressed]').forEach(button => {
    if (button.dataset.id !== id) return;
    button.setAttribute('aria-pressed', String(pressed));
    button.setAttribute('aria-label', `${pressed ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${product.name}`);
  });
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
  return response.json();
}

function productDetails(product, details) {
  const data = Object.hasOwn(details, product.id) ? details[product.id] : null;
  return {
    ...product,
    photos: productImages({ ...product, photos: data?.photos }),
    description: data?.description,
    specifications: data?.specifications,
    price: data?.price,
    available: data?.available,
    checkoutUrl: data?.checkoutUrl,
    searchable: normalize([product.name, product.franchise, product.brand, categoryLabel(product), ...(product.keywords || [])].join(' ')),
  };
}

function loadCatalog() {
  if (catalogRequest) return catalogRequest;
  catalogStatus = 'loading';
  renderRoute({ focus: false });
  catalogRequest = Promise.all([
    fetchJson('/public/catalog.json'),
    fetchJson('/public/product-details.json').catch(() => ({})),
  ])
    .then(([imported, details]) => {
      if (!Array.isArray(imported)) throw new Error('Formato inválido');
      const extra = details && typeof details === 'object' ? details : {};
      products = imported.filter(product => product?.id && product.name).map(product => productDetails(product, extra));
      productById = new Map(products.map(product => [product.id, product]));
      initFilters();
      catalogStatus = 'ready';
    })
    .catch(() => { catalogStatus = 'error'; })
    .finally(() => {
      catalogRequest = null;
      renderRoute({ focus: false });
      if (activeDialog === 'favorites') showFavorites();
      if (activeDialog === 'cart') showCart();
      updateCounts();
    });
  return catalogRequest;
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, id } = control.dataset;
  switch (action) {
    case 'company': showCompany(); break;
    case 'favorites': showFavorites(); break;
    case 'cart': showCart(); break;
    case 'cart-add':
      if (productById.has(id) && productCatalogPrice(productById.get(id)) && cart.add(id) !== null) {
        updateCounts();
        showCart();
      }
      break;
    case 'cart-remove':
      cart.remove(id);
      updateCounts();
      showCart();
      (dialogBody.querySelector('[data-cart-quantity], a') ?? dialog.querySelector('.close')).focus();
      break;
    case 'gallery': selectProductPhoto(control); break;
    case 'zoom': showGallery(control); break;
    case 'favorite': {
      if (!productById.has(id)) break;
      const added = favorites.toggle(id);
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
    case 'close': if (dialog.open) dialog.close(); break;
  }
});

document.addEventListener('change', event => {
  const field = event.target;
  if (!field.matches('[data-cart-quantity][data-id]')) return;
  cart.setQuantity(field.dataset.id, field.valueAsNumber);
  updateCounts();
  showCart();
  const next = [...dialogBody.querySelectorAll('[data-cart-quantity]')].find(input => input.dataset.id === field.dataset.id);
  (next ?? dialog.querySelector('.close')).focus();
});

document.addEventListener('error', event => {
  const photo = event.target;
  if (!photo.matches?.('img')) return;
  const card = photo.closest('.product-media');
  if (card) {
    photo.hidden = true;
    card.querySelector('.product-placeholder').hidden = false;
  } else if (photo.matches('[data-gallery-main]')) {
    photo.hidden = true;
    const button = photo.closest('button');
    button.querySelector('.gallery-failed').hidden = false;
    button.disabled = true;
  }
}, true);

document.addEventListener('submit', event => {
  if (!event.target.matches('#header-search, #filters')) return;
  event.preventDefault();
  const destination = catalogLink(applyFilters(event.target));
  if (compact.matches && event.target.matches('#filters')) $('.filter-panel').open = false;
  if (location.pathname + location.hash === destination) renderRoute();
  else location.assign(destination);
});

dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { activeDialog = null; });
window.addEventListener('hashchange', () => {
  if (dialog.open) dialog.close();
  renderRoute();
});
window.addEventListener('storage', () => {
  updateCounts();
  const visibleFavoriteIds = new Set([...document.querySelectorAll('[data-action="favorite"][aria-pressed]')].map(button => button.dataset.id));
  for (const id of visibleFavoriteIds) if (productById.has(id)) updateFavoriteControls(id);
  if (activeDialog === 'favorites') showFavorites();
  if (activeDialog === 'cart') showCart();
});

function setFilterPanel() {
  $('.filter-panel').open = !compact.matches;
}

compact.addEventListener('change', setFilterPanel);
setFilterPanel();
renderFooterContact();
initFilters();
updateCounts();
renderRoute({ focus: Boolean(location.hash) });
loadCatalog();
