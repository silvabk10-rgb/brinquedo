import { formatPrice } from './commerce.js';
import { productCatalogPrice, productImages } from './productPage.js';

const storageKey = 'modo-lenda-cart-v1';
const maxQuantity = 99;
const idPattern = /^[a-z0-9][a-z0-9-]{0,255}$/i;
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function validId(id) {
  return typeof id === 'string' && idPattern.test(id);
}

function normalizeItems(items) {
  const counts = new Map();

  for (const { id, quantity } of Array.isArray(items) ? items.filter(Boolean) : []) {
    if (!validId(id) || !Number.isSafeInteger(quantity) || quantity < 1) continue;
    counts.set(id, Math.min(maxQuantity, (counts.get(id) || 0) + quantity));
  }

  return [...counts].map(([id, quantity]) => ({ id, quantity }));
}

export function createCart(storage = browserStorage()) {
  let local = [];

  function get() {
    try {
      if (storage) local = normalizeItems(JSON.parse(storage.getItem(storageKey)));
    } catch {
      return local.map(item => ({ ...item }));
    }
    return local.map(item => ({ ...item }));
  }

  function save(items) {
    local = items;
    try {
      storage?.setItem(storageKey, JSON.stringify(items));
    } catch {
      storage = null;
    }
  }

  function setQuantity(id, quantity) {
    if (!validId(id) || !Number.isSafeInteger(quantity) || quantity < 0) return null;
    const items = get();
    const item = items.find(entry => entry.id === id);
    const next = Math.min(quantity, maxQuantity);

    if (next === 0) save(items.filter(entry => entry.id !== id));
    else if (item) {
      item.quantity = next;
      save(items);
    } else save([...items, { id, quantity: next }]);

    return next;
  }

  function add(id, quantity = 1) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) return null;
    const previous = get().find(item => item.id === id)?.quantity ?? 0;
    return setQuantity(id, previous + Math.min(quantity, maxQuantity));
  }

  return {
    get,
    add,
    setQuantity,
    remove: id => setQuantity(id, 0),
    clear: () => save([]),
    count: () => get().reduce((sum, { quantity }) => sum + quantity, 0),
  };
}

function toCents(value) {
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function cartPrice(product) {
  if (!product) return null;
  const cents = toCents(productCatalogPrice(product)?.price);
  return cents === null ? null : cents / 100;
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

function renderLine(row) {
  const { id, quantity, product, unitCents, estimate } = row;
  const name = escape(product?.name || 'Produto indisponível');
  const photo = product ? productImages(product)[0] : null;
  const url = product ? `/produto/${encodeURIComponent(id)}/` : null;
  const visual = photo
    ? `<img src="${escape(photo.url)}" alt="" width="72" height="72" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : '<svg aria-hidden="true" focusable="false"><use href="#box"/></svg>';
  const media = url
    ? `<a href="${url}" class="cart-line-photo" aria-label="Ver ${name}">${visual}</a>`
    : `<span class="cart-line-photo" aria-hidden="true">${visual}</span>`;
  const canChange = unitCents !== null;

  return `<li class="cart-line">
    ${media}
    <div class="cart-line-details">
      ${url ? `<a href="${url}" class="cart-line-name">${name}</a>` : `<strong class="cart-line-name">${name}</strong>`}
      <p class="cart-line-unit">${canChange ? `${formatPrice(unitCents / 100)} por unidade${estimate ? ' · Referência' : ''}` : 'Valor indisponível'}</p>
      <div class="cart-line-controls">
        ${canChange ? `<label class="cart-quantity">
          <span>Qtd.</span>
          <input type="number" min="1" max="${maxQuantity}" step="1" inputmode="numeric"
            aria-label="Quantidade de ${name}" data-cart-quantity data-id="${escape(id)}" value="${quantity}">
        </label>` : ''}
        <button class="cart-remove" type="button" data-action="cart-remove" data-id="${escape(id)}" aria-label="Remover ${name}">Remover</button>
      </div>
    </div>
    ${canChange ? `<strong class="cart-line-total">${formatPrice(unitCents * quantity / 100)}</strong>` : ''}
  </li>`;
}

export function renderCart(items, productsById, { loading = false } = {}) {
  const entries = normalizeItems(items);

  if (!entries.length) {
    return `<div class="cart-empty">
      <span class="cart-empty-icon"><svg aria-hidden="true" focusable="false"><use href="#box"/></svg></span>
      <h3>Seu carrinho está vazio</h3>
      <p>Explore o catálogo e adicione os colecionáveis que você procura.</p>
      <a class="button primary" href="/#catalogo" data-action="close">Explorar catálogo</a>
    </div>`;
  }

  if (loading) return '<p class="cart-loading" role="status">Carregando os itens do carrinho…</p>';

  const rows = entries.map(item => {
    const product = productsById.get(item.id);
    const pricing = product ? productCatalogPrice(product) : null;
    const unitCents = toCents(pricing?.price);
    return { ...item, product, unitCents, estimate: unitCents !== null && pricing.reference };
  });
  const subtotal = rows.reduce((sum, { unitCents, quantity }) => sum + (unitCents ?? 0) * quantity, 0);
  const estimated = rows.some(row => row.estimate);
  const unavailable = rows.some(row => row.unitCents === null);

  return `<div class="cart-panel">
    <ul class="cart-lines" aria-label="Itens no carrinho">${rows.map(renderLine).join('')}</ul>
    <footer class="cart-summary">
      <div class="cart-summary-total">
        <span>${estimated ? 'Subtotal estimado' : 'Subtotal'}</span>
        <strong aria-live="polite">${formatPrice(subtotal / 100)}</strong>
      </div>
      ${estimated ? '<p>Valores de referência, sujeitos a confirmação. Frete à parte.</p>' : ''}
      ${unavailable ? '<p>Os itens sem valor aparecem no carrinho e ficam fora do subtotal.</p>' : ''}
      <button class="button cart-checkout" type="button" disabled>Finalizar compra</button>
      <p class="cart-checkout-status">Pagamento online ainda indisponível.</p>
    </footer>
  </div>`;
}
