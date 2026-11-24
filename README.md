# Modo Lenda

Loja geek em português do Brasil, com páginas por produto, busca, filtros, favoritos, carrinho e políticas de atendimento.

## Rodar localmente

Com Node.js 20 ou superior, rode `npm start` e abra o endereço exibido no terminal. Para gerar o conteúdo estático, rode `npm run build`. Na Netlify, publique a pasta `dist`, que inclui o redirecionamento para as páginas `/produto/<id>/`.

## Catálogo e fotos

`public/catalog.json` contém os produtos da Modo Lenda. O arquivo `public/product-details.json` organiza informações complementares e comerciais por ID do produto.

- `photos` aceita uma lista de objetos com `url` e `alt`. Imagens locais da loja podem ficar em `assets/`.
- `description` e `specifications` aceitam a descrição e uma lista de entradas `{ "label": "...", "value": "..." }`.
- `available: true` indica pronta entrega. `price` contém o preço de venda em reais. Produtos com ambos os campos podem ser adicionados ao carrinho.

Rode `npm run export:catalog` para gerar `outputs/modo-lenda-catalogo.csv` com preços, disponibilidade, imagens e especificações dos produtos.

## Ativar vendas

Integre a Stone/Pagar.me para receber pagamentos e finalizar pedidos. Links de checkout por produto exigem `available: true`, preço maior que zero e `checkoutUrl` HTTPS. Configure as regras de frete e os dados de atendimento antes de habilitar a finalização.
