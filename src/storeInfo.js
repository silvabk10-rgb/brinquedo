const ecommerceDecree = {
    label: 'Decreto do Comércio Eletrônico',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm',
};

const consumerCode = {
    label: 'Código de Defesa do Consumidor',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
};

export const storeInfo = {
    brand: 'Modo Lenda',
    cnpj: '50.179.858/0001-33',
    cnpjRegistryVerified: false,
    legalName: null,
    address: null,
    email: null,
    whatsapp: null,
    businessDetailsPending: true,
};

export const policies = [
    {
        id: 'entrega',
        title: 'Entrega e frete',
        intro: 'O prazo, o valor do frete e as opções de entrega de cada pedido devem aparecer antes do pagamento.',
        sections: [
            {
                title: 'Consulta de frete e prazos',
                body: 'Quando as vendas forem abertas, consulte as opções para o seu CEP ao revisar o pedido. Confira o endereço, o total e o prazo de entrega antes de confirmar a compra. A cobertura de entrega e as modalidades de envio estão em definição.',
            },
            {
                title: 'Acompanhamento de pedidos',
                body: 'Guarde o número do pedido e a confirmação da compra. Se a modalidade escolhida oferecer rastreamento, use o código ou link informado no envio para acompanhar a entrega.',
            },
            {
                title: 'Atraso ou entrega em desacordo',
                body: 'Em caso de atraso, produto diferente, quantidade incorreta ou avaria, comunique o problema ao atendimento da loja e informe o número do pedido. Se a oferta for descumprida, o consumidor pode exigir o cumprimento do combinado, aceitar um equivalente ou cancelar a compra e solicitar a restituição dos valores pagos, conforme o Código de Defesa do Consumidor.',
            },
        ],
        sources: [ecommerceDecree, consumerCode],
    },
    {
        id: 'trocas',
        title: 'Trocas e devoluções',
        intro: 'As regras abaixo se aplicam às compras feitas à distância e aos casos de defeito ou descumprimento da oferta.',
        sections: [
            {
                title: 'Arrependimento em compras online',
                body: 'Você pode desistir da compra em até sete dias corridos após receber o produto, sem precisar explicar o motivo. Envie a solicitação pelo mesmo meio eletrônico usado na compra ou por outro canal disponibilizado pela loja. O recebimento do pedido de cancelamento deve ser confirmado imediatamente.',
            },
            {
                title: 'Devolução e reembolso',
                body: 'No arrependimento dentro do prazo legal, a devolução ocorre sem custo. O reembolso inclui o valor do produto e o frete pago na compra. A loja deve iniciar o reembolso de imediato e, quando o pagamento for feito por cartão, comunicar o cancelamento à administradora para evitar a cobrança ou providenciar o estorno.',
            },
            {
                title: 'Produto com defeito',
                body: 'O prazo legal para reclamar é de 90 dias para produtos duráveis e de 30 dias para produtos não duráveis. A contagem começa no recebimento para defeitos aparentes e quando o problema se manifesta para defeitos ocultos. Em regra, se o problema não for resolvido em até 30 dias, você pode escolher entre a substituição do produto, o reembolso ou um abatimento proporcional do preço. A legislação prevê situações em que essas opções podem ser exercidas imediatamente.',
            },
            {
                title: 'Recebi o item errado ou avariado',
                body: 'Informe ao atendimento o número do pedido, o item recebido e o que aconteceu. Se você tiver fotos, elas podem ajudar a identificar o problema. Guarde o comprovante da compra e o registro da solicitação.',
            },
        ],
        sources: [
            consumerCode,
            ecommerceDecree,
            {
                label: 'Guia de Comércio Eletrônico do Procon-SP',
                url: 'https://www.procon.sp.gov.br/wp-content/uploads/2024/08/Guia_de_Comercio_Eletronico.pdf',
            },
        ],
    },
    {
        id: 'privacidade',
        title: 'Privacidade e cookies',
        intro: 'Saiba como os recursos desta vitrine funcionam no navegador e conheça os seus direitos sobre dados pessoais.',
        sections: [
            {
                title: 'Lista de favoritos',
                body: 'O navegador armazena a sua lista de favoritos no dispositivo para que ela fique disponível entre visitas. Você pode apagar esses registros nas configurações de dados do site do seu navegador.',
            },
            {
                title: 'Pedidos e atendimento',
                body: 'O checkout está indisponível. Caso o recurso seja habilitado, a política passará a detalhar os dados usados para processar pedidos, pagamentos e atendimento.',
            },
            {
                title: 'Cookies opcionais',
                body: 'Recursos opcionais de estatísticas ou publicidade, se ativados em uma próxima versão com base em consentimento, dependerão de uma escolha prévia. Nesse caso, o site deverá oferecer a opção de recusar ou mudar a escolha posteriormente.',
            },
            {
                title: 'Seus direitos',
                body: 'A LGPD prevê o direito de confirmar o tratamento, acessar e corrigir dados e obter informações sobre compartilhamento. Conforme o caso, você também pode solicitar anonimização, bloqueio, eliminação ou portabilidade e revogar o consentimento. O canal do controlador deverá ser publicado antes da abertura das vendas.',
            },
        ],
        sources: [
            {
                label: 'Lei Geral de Proteção de Dados Pessoais',
                url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm',
            },
            {
                label: 'Direitos dos titulares na ANPD',
                url: 'https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares',
            },
            {
                label: 'Guia de cookies da ANPD',
                url: 'https://www.gov.br/anpd/pt-br/assuntos/noticias-periodo-eleitoral/anpd-lanca-guia-orientativo-201ccookies-e-protecao-de-dados-pessoais201d',
            },
        ],
    },
    {
        id: 'termos',
        title: 'Termos de uso',
        intro: `A vitrine da ${storeInfo.brand} reúne figures, acessórios e outros itens de cultura geek para explorar e organizar sua próxima coleção.`,
        sections: [
            {
                title: 'Identificação da loja',
                body: `Modo Lenda, CNPJ ${storeInfo.cnpj}. Razão social, endereço e canal de atendimento aguardam confirmação.`,
            },
            {
                title: 'Catálogo e disponibilidade',
                body: 'O catálogo apresenta detalhes dos produtos. Em cada página, a loja informa quando a compra está indisponível. Os links de referência levam a páginas externas.',
            },
            {
                title: 'Ofertas e pagamentos',
                body: 'Na abertura das vendas, o checkout deverá apresentar as características do item, a disponibilidade, o preço final, o frete, a entrega e os meios de pagamento aceitos. Você deverá poder revisar e corrigir os dados do pedido antes de concluir a compra e guardar a confirmação depois de contratá-la.',
            },
            {
                title: 'Marcas e personagens',
                body: 'Os nomes de franquias, fabricantes e personagens identificam os produtos do catálogo e pertencem a seus respectivos titulares.',
            },
        ],
        sources: [ecommerceDecree, consumerCode],
    },
];

export const helpItems = [
    {
        question: 'Como encontro um produto ou personagem?',
        answer: 'Busque pelo nome do item, da franquia ou do personagem. Você também pode explorar o catálogo por categoria.',
    },
    {
        question: 'Já posso finalizar uma compra?',
        answer: 'O checkout está indisponível. Você já pode explorar os produtos e salvá-los na sua lista de favoritos.',
    },
    {
        question: 'Onde vou consultar o preço do frete e o prazo?',
        answer: 'Quando a loja abrir para vendas, o frete e o prazo para seu CEP serão informados antes da confirmação da compra.',
    },
    {
        question: 'Qual é o prazo para desistir de uma compra online?',
        answer: 'Você pode exercer o direito de arrependimento em até sete dias corridos após receber o produto. Consulte a política de trocas e devoluções para saber como solicitar o cancelamento e o reembolso.',
    },
    {
        question: 'Onde encontro os dados da loja e do atendimento?',
        answer: 'O CNPJ fica no rodapé do site e nos Termos de uso. Os dados cadastrais completos e o canal de atendimento aguardam confirmação.',
    },
];
