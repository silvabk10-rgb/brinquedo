const storageKey = 'modo-lenda-commerce-v1';
const maxQuantity = 99;
const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPrice(value) {
  return reais.format(value);
}

function normalizeState(value) {
  const favorites = Array.isArray(value?.favorites) ? value.favorites : [];
  const entries = Array.isArray(value?.cart) ? value.cart : [];
  const cart = new Map();

  for (const entry of entries) {
    if (isId(entry?.id) && Number.isInteger(entry.quantity) && entry.quantity > 0) {
      cart.set(entry.id, Math.min(entry.quantity, maxQuantity));
    }
  }

  return {
    favorites: [...new Set(favorites.filter(isId))],
    cart: [...cart].map(([id, quantity]) => ({ id, quantity })),
  };
}

function isId(id) {
  return typeof id === 'string' && id.length > 0;
}

function getDefaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function isDemoProduct(product) {
  return product?.demo === true && Number.isFinite(product.price) &&
    Math.round(product.price * 100) > 0 && Number.isSafeInteger(Math.round(product.price * 100));
}

export function createCommerce({ products = [], storage = getDefaultStorage(), key = storageKey } = {}) {
  let catalog;
  let state = normalizeState();

  function setProducts(nextProducts) {
    catalog = new Map(nextProducts.map(product => [product.id, product]));
  }

  function read() {
    if (!storage) return state;

    try {
      return normalizeState(JSON.parse(storage.getItem(key)));
    } catch {
      return state;
    }
  }

  function write(nextState) {
    state = normalizeState(nextState);

    try {
      storage?.setItem(key, JSON.stringify(state));
    } catch {
      storage = null;
    }
  }

  function getState() {
    const current = read();
    return {
      favorites: [...current.favorites],
      cart: current.cart.filter(({ id }) => isDemoProduct(catalog.get(id))).map(item => ({ ...item })),
    };
  }

  function isFavorite(id) {
    return read().favorites.includes(id);
  }

  function toggleFavorite(id) {
    if (!isId(id)) return false;

    const current = read();
    const exists = current.favorites.includes(id);
    const favorites = exists ? current.favorites.filter(item => item !== id) : [...current.favorites, id];
    write({ ...current, favorites });
    return !exists;
  }

  function updateQuantity(current, id, quantity) {
    if (!Number.isInteger(quantity) || quantity < 0) return false;
    if (quantity > 0 && !isDemoProduct(catalog.get(id))) return false;

    const cart = current.cart.filter(item => item.id !== id);
    const nextQuantity = Math.min(quantity, maxQuantity);
    if (nextQuantity > 0) {
      const index = current.cart.findIndex(item => item.id === id);
      cart.splice(index === -1 ? cart.length : index, 0, { id, quantity: nextQuantity });
    }
    write({ ...current, cart });
    return true;
  }

  function setQuantity(id, quantity) {
    return updateQuantity(read(), id, quantity);
  }

  function addToCart(id, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity < 1) return false;

    const current = read();
    const previousQuantity = current.cart.find(item => item.id === id)?.quantity ?? 0;
    return updateQuantity(current, id, previousQuantity + quantity);
  }

  function removeFromCart(id) {
    return setQuantity(id, 0);
  }

  function clearCart() {
    write({ ...read(), cart: [] });
  }

  function getCart() {
    const { cart } = getState();
    let count = 0;
    let subtotalCents = 0;
    const items = cart.map(({ id, quantity }) => {
      const product = catalog.get(id);
      const lineCents = Math.round(product.price * 100) * quantity;
      count += quantity;
      subtotalCents += lineCents;
      return { id, product, quantity, lineTotal: lineCents / 100 };
    });

    return { items, count, subtotal: subtotalCents / 100 };
  }

  setProducts(products);
  return { getState, setProducts, isFavorite, toggleFavorite, addToCart, setQuantity, removeFromCart, clearCart, getCart };
}

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

export function renderCheckout({ items = [], subtotal = 0 } = {}, { completed = false } = {}) {
  if (completed) {
    return `<section class="checkout-demo checkout-demo--complete" aria-labelledby="checkout-title">
      <h2 id="checkout-title">Simulação concluída</h2>
      <p>O carrinho foi testado com sucesso. Nenhum pedido foi enviado e nenhum pagamento foi efetuado.</p>
      <button class="btn btn-primary" type="button" data-checkout-close>Voltar à loja</button>
    </section>`;
  }

  if (!items.length) {
    return `<section class="checkout-demo" aria-labelledby="checkout-title">
      <h2 id="checkout-title">Carrinho vazio</h2>
      <p>Adicione um item de demonstração para testar o checkout.</p>
      <button class="btn btn-primary" type="button" data-checkout-close>Voltar à loja</button>
    </section>`;
  }

  return `<section class="checkout-demo" aria-labelledby="checkout-title">
    <h2 id="checkout-title">Checkout de demonstração</h2>
    <p>Você pode testar esta etapa sem informar dados pessoais. A loja ainda não recebe pedidos ou pagamentos.</p>
    <form class="checkout-demo__form" data-checkout-form>
      <ul class="checkout-demo__items" aria-label="Itens da simulação">
        ${items.map(({ product, quantity, lineTotal }) => `<li>
          <span>${escapeHtml(product.name)} <small>× ${quantity}</small></span>
          <strong>${formatPrice(lineTotal)}</strong>
        </li>`).join('')}
      </ul>
      <div class="checkout-demo__total"><span>Subtotal de teste</span><strong>${formatPrice(subtotal)}</strong></div>
      <fieldset class="checkout-demo__payment">
        <legend>Forma de pagamento simulada</legend>
        <label><input type="radio" name="payment-demo" value="pix" required checked> Pix</label>
        <label><input type="radio" name="payment-demo" value="cartao"> Cartão de crédito</label>
      </fieldset>
      <button class="btn btn-primary" type="submit" data-checkout-confirm>Concluir simulação</button>
    </form>
  </section>`;
}
