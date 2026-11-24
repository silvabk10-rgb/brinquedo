const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('https://') || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return url.href;
  } catch {
    return null;
  }
  return null;
}

function photoUrl(value) {
  if (typeof value === 'string' && /^\/(?:assets|images|public)\/[a-z\d/_-]+\.(?:webp|avif|png|jpe?g|gif)$/i.test(value)) return value;
  return httpsUrl(value);
}

export function productImages(product) {
  if (!Array.isArray(product.photos)) return [];

  const photos = new Map();
  for (const photo of product.photos) {
    if (photos.size === 12) break;
    const url = photoUrl(typeof photo === 'string' ? photo : photo?.url);
    if (!url || photos.has(url)) continue;
    const alt = typeof photo?.alt === 'string' && photo.alt.trim()
      ? photo.alt.trim()
      : `${product.name} · Foto ${photos.size + 1}`;
    const credit = typeof photo?.credit === 'string' ? photo.credit.trim() : '';
    photos.set(url, { url, alt, credit });
  }
  return [...photos.values()];
}

export function productOffer(product) {
  const price = product.price;
  const checkoutUrl = httpsUrl(product.checkoutUrl);
  if (product.available !== true || !checkoutUrl || !Number.isFinite(price) || price <= 0) return null;

  return { price, checkoutUrl };
}

export function productCatalogPrice(product) {
  const offer = productOffer(product);
  if (offer) return { price: offer.price, reference: false };
  const price = product.referencePrice;
  return Number.isFinite(price) && price > 0 ? { price, reference: true } : null;
}

function icon(id) {
  return `<svg aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
}

function renderGallery(product, sourceUrl) {
  const photos = productImages(product);
  if (!photos.length) {
    const manufacturerGallery = httpsUrl(product.galleryUrl);
    const galleryUrl = manufacturerGallery || sourceUrl;
    const label = manufacturerGallery ? 'Ver fotos do fabricante' : 'Ver fotos na referência';
    return `<div class="product-gallery"><div class="gallery-main gallery-placeholder">
      ${icon('box')}${galleryUrl
        ? `<a href="${escape(galleryUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : '<span>Fotos em breve</span>'}
    </div></div>`;
  }

  const firstPhoto = photos[0];
  const thumbnails = photos.length > 1 ? `<div class="gallery-thumbs" aria-label="Fotos do produto">
    ${photos.map(({ url, alt, credit }, index) => `<button class="gallery-thumb" type="button" data-action="gallery"
        data-index="${index}" data-alt="${escape(alt)}" data-credit="${escape(credit)}"
        aria-label="Ver foto ${index + 1} de ${photos.length}" aria-pressed="${index === 0}">
      <img src="${escape(url)}" alt="" width="68" height="68" loading="lazy" decoding="async" referrerpolicy="no-referrer">
    </button>`).join('')}
  </div>` : '';

  return `<div class="product-gallery">
    <button type="button" class="gallery-main gallery-expand" data-action="zoom" aria-label="Ampliar foto do produto">
      <img src="${escape(firstPhoto.url)}" alt="${escape(firstPhoto.alt)}" data-gallery-main width="880" height="880"
        fetchpriority="high" decoding="async" referrerpolicy="no-referrer">
      <span class="gallery-zoom-icon" aria-hidden="true">${icon('search')}</span>
      <span class="gallery-failed" hidden>Foto temporariamente indisponível</span>
    </button>
    <p class="gallery-credit" data-gallery-credit ${firstPhoto.credit ? '' : 'hidden'}>${escape(firstPhoto.credit)}</p>
    ${thumbnails}
  </div>`;
}

export function selectProductPhoto(button) {
  const gallery = button.closest('.product-gallery');
  const main = gallery?.querySelector('[data-gallery-main]');
  const thumbnail = button.querySelector('img');
  if (!main || !thumbnail) return false;

  main.src = thumbnail.src;
  main.alt = button.dataset.alt;
  main.hidden = false;
  gallery.querySelector('.gallery-failed').hidden = true;
  main.closest('button').disabled = false;
  const credit = gallery.querySelector('[data-gallery-credit]');
  if (credit) {
    credit.textContent = button.dataset.credit;
    credit.hidden = !button.dataset.credit;
  }
  for (const item of gallery.querySelectorAll('[data-action="gallery"]')) {
    item.setAttribute('aria-pressed', String(item === button));
  }
  return true;
}

function renderSpecifications(product, categoryLabel) {
  const standardFields = [
    { label: 'Categoria', value: categoryLabel },
    { label: 'Universo', value: product.franchise },
    { label: 'Marca', value: product.brand },
  ];
  const customFields = Array.isArray(product.specifications) ? product.specifications.slice(0, 24) : [];
  const fields = new Map();

  for (const field of [...standardFields, ...customFields]) {
    if (typeof field?.label !== 'string' || !['string', 'number'].includes(typeof field?.value)) continue;
    const label = field.label.trim();
    const value = String(field.value).trim();
    const key = label.toLocaleLowerCase('pt-BR');
    if (label && value && !fields.has(key)) fields.set(key, { label, value });
  }

  if (!fields.size) return '';
  return `<section class="product-specs" aria-labelledby="product-specs-title">
    <h2 id="product-specs-title">Ficha técnica</h2>
    <dl>${[...fields.values()].map(({ label, value }) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
  </section>`;
}

function renderOffer(product, offer) {
  if (!offer) {
    const estimate = productCatalogPrice(product);
    if (estimate) return `<div class="buy-panel buy-panel-estimate">
      <div><p class="product-page-price">${escape(currency.format(estimate.price))}</p><p class="price-note">Preço de referência</p></div>
      <button class="button primary buy-button" type="button" data-action="cart-add" data-id="${escape(product.id)}">Adicionar ao carrinho</button>
    </div>`;
    return `<div class="buy-panel buy-panel-unavailable">
      <p>Preço a confirmar</p>
      <button class="button buy-button" type="button" disabled>Comprar</button>
    </div>`;
  }

  const priceText = escape(currency.format(offer.price));
  const button = `<a class="button primary buy-button" href="${escape(offer.checkoutUrl)}" rel="noopener noreferrer">Comprar</a>`;
  return `<div class="buy-panel">
      <p class="product-page-price">${priceText}</p>
      ${button}
    </div>
    <div class="buy-bar"><span class="product-page-price">${priceText}</span>${button}</div>`;
}

function productBreadcrumb(product, categoryLabel) {
  return `<nav class="product-breadcrumb" aria-label="Caminho de navegação"><ol>
    <li><a href="/">Início</a></li>
    <li><a href="/#catalogo">Catálogo</a></li>
    <li><a href="/#catalogo?categoria=${encodeURIComponent(product.category ?? '')}">${escape(categoryLabel)}</a></li>
    <li aria-current="page">${escape(product.name)}</li>
  </ol></nav>`;
}

export function renderProductPage(product, { categoryLabel = 'Colecionáveis', isFavorite = false, relatedHtml = '' } = {}) {
  const offer = productOffer(product);
  const sourceUrl = product.source && httpsUrl(product.sourceUrl);
  const description = typeof product.description === 'string' ? product.description.trim() : '';
  const tags = [...new Set([product.franchise, product.brand].filter(Boolean))];
  return `<article class="product-page${offer ? ' product-page--purchasable' : ''}">
    ${productBreadcrumb(product, categoryLabel)}
    <div class="product-page-layout">
      <div class="product-heading">
        <div class="product-summary-heading">
          <p class="product-category-label">${escape(categoryLabel)}</p>
          <button class="icon-button product-favorite" type="button" data-action="favorite" data-id="${escape(product.id)}"
            aria-label="${isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}: ${escape(product.name)}" aria-pressed="${isFavorite}">
            ${icon('heart')}
          </button>
        </div>
        <h1 id="product-title" tabindex="-1">${escape(product.name)}</h1>
        ${tags.length ? `<ul class="product-tags">${tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul>` : ''}
      </div>
      ${renderGallery(product, sourceUrl)}
      <div class="product-summary">${renderOffer(product, offer)}</div>
    </div>
    <div class="product-details">
      ${description ? `<section class="product-description" aria-labelledby="product-description-title">
        <h2 id="product-description-title">Sobre o produto</h2><p>${escape(description)}</p>
      </section>` : ''}
      ${renderSpecifications(product, categoryLabel)}
      ${sourceUrl ? `<p class="product-source">Referência do catálogo <a href="${escape(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(product.source)}</a></p>` : ''}
    </div>
    ${relatedHtml ? `<section class="related-products" aria-labelledby="related-products-title">
      <h2 id="related-products-title">Você também pode gostar</h2><div class="product-grid">${relatedHtml}</div>
    </section>` : ''}
  </article>`;
}

export function renderMissingProduct() {
  return `<div class="product-message">
    <h1 id="product-title" tabindex="-1">Produto não encontrado</h1>
    <p>Explore o catálogo para encontrar outros colecionáveis.</p>
    <a class="button primary" href="/#catalogo">Ver catálogo</a>
  </div>`;
}

export function renderProductLoading() {
  return `<div class="product-message" aria-busy="true"><p role="status">Carregando produto…</p></div>`;
}
