import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productCatalogPrice, productImages, productOffer } from '../src/productPage.js';

const root = new URL('../', import.meta.url);
const storefront = 'https://modolendageek.com';
const money = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

const categoryLabels = {
  'action-figures': 'Action figures',
  'funko-pop': 'Funko Pop!',
  estatuas: 'Estátuas',
  acessorios: 'Acessórios',
  pelucias: 'Pelúcias',
  decoracao: 'Decoração',
  outros: 'Outros colecionáveis',
};

const columns = [
  'SKU', 'Nome', 'Categoria', 'Franquia', 'Marca', 'Descrição', 'Ficha técnica',
  'Preço de venda (BRL)', 'Pronta entrega', 'Disponível para carrinho', 'Checkout ativo',
  'URLs das fotos', 'URL do produto', 'URL do checkout', 'Palavras-chave',
];

function csvCell(value) {
  let content = String(value ?? '');
  if (/^\s*[=+\-@]/u.test(content) || /^[\t\r\n]/u.test(content)) {
    content = `'${content}`;
  }
  return `"${content.replaceAll('"', '""')}"`;
}

function formatAmount(value) {
  return Number.isFinite(value) && value > 0 ? money.format(value) : '';
}

function formatSpecifications(specifications) {
  if (!Array.isArray(specifications)) return '';
  return specifications
    .filter(field => typeof field?.label === 'string' && ['string', 'number'].includes(typeof field.value))
    .map(({ label, value }) => `${label.trim()}: ${String(value).trim()}`)
    .join(' | ');
}

function productRow(product) {
  const price = productCatalogPrice(product);
  const offer = productOffer(product);
  const photos = productImages(product);
  return [
    product.id, product.name, categoryLabels[product.category] || product.category,
    product.franchise, product.brand, product.description, formatSpecifications(product.specifications),
    formatAmount(price?.price), product.available === true ? 'Sim' : 'Não', price ? 'Sim' : 'Não', offer ? 'Sim' : 'Não',
    photos.map(({ url }) => new URL(url, storefront).href).join(' | '),
    new URL(`/produto/${encodeURIComponent(product.id)}/`, storefront).href,
    offer?.checkoutUrl, Array.isArray(product.keywords) ? product.keywords.join(' | ') : '',
  ];
}

const [catalog, productDetails] = await Promise.all([
  readFile(new URL('public/catalog.json', root), 'utf8').then(JSON.parse),
  readFile(new URL('public/product-details.json', root), 'utf8').then(JSON.parse),
]);

const rows = [columns];
for (const item of catalog) {
  const details = Object.hasOwn(productDetails, item.id) ? productDetails[item.id] : null;
  rows.push(productRow({ ...item, ...details, id: item.id }));
}

const destination = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL('outputs/modo-lenda-catalogo.csv', root));
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}\r\n`, 'utf8');
console.log(`${rows.length - 1} produtos exportados em ${destination}`);
