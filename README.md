# Modo Lenda

Vitrine geek em português do Brasil, com páginas por produto, busca, filtros, favoritos e políticas de atendimento.

## Rodar localmente

Com Node.js 20 ou superior, rode `npm start` e abra o endereço exibido no terminal. Para gerar o conteúdo estático, rode `npm run build`. Na Netlify, publique a pasta `dist`, que inclui o redirecionamento para as páginas `/produto/<id>/`.

## Catálogo e fotos

`public/catalog.json` contém o catálogo de referência e os links para os produtos de origem. O arquivo `public/product-details.json` mapeia dados complementares pela ID de cada produto.

- `photos` aceita uma lista de objetos com `url`, `alt` e, se necessário, `credit`. Use fotos autorizadas. Imagens locais podem ficar em `assets/`.
- `galleryUrl` aponta para uma galeria externa de referência quando as fotos próprias estiverem indisponíveis.
- `description` e `specifications` aceitam a descrição e uma lista de entradas `{ "label": "...", "value": "..." }`.

## Ativar vendas

Integre o checkout Stone/Pagar.me e cadastre os itens com estoque, preço e checkout de produção. O botão de compra exige, no mesmo registro, `available: true`, `price` maior que zero em reais e `checkoutUrl` HTTPS. Defina frete, dados cadastrais e operação dos pedidos antes de habilitar ofertas.
