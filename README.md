# Mandalaria D'ogum

Primeira versão privada da vitrine da loja. O catálogo, as imagens e os preços são **conceituais**. O número em `dist/config.js` é o WhatsApp de testes do desenvolvedor.

## O que já funciona

- Vitrine responsiva, busca, categorias, filtro de preço e disponibilidade, ordenação e detalhes de produtos.
- Carrinho persistido neste navegador.
- Formulário de encomenda que prepara uma mensagem estruturada e abre o WhatsApp de testes.
- Visualização 3D e AR em um modelo ilustrativo de mandala, com tentativa de posicionamento em parede em dispositivos compatíveis.
- Painel demonstrativo para criar, editar e excluir produtos e categorias. As alterações usam `localStorage` e aparecem apenas no navegador em que foram feitas.

## Para abrir a loja ao público

1. Criar o catálogo real com fotos, descrições, preços, medidas e estoque. Substituir as imagens conceituais. Para AR fiel, criar um arquivo GLB em escala real por peça e testar em Android/iOS; USDZ próprio melhora a experiência no iPhone.
2. Implantar um backend e banco de dados para categorias, produtos, imagens, contas, pedidos e permissões. Neon Postgres é uma opção; na hospedagem Sites, D1 e R2 também são opções. O banco deve guardar todos os registros permanentes. O carrinho anônimo pode continuar no navegador, mas totais e estoque precisam ser recalculados no servidor.
3. Adicionar autenticação de clientes e uma lista de administradores, iniciando com `gb.mendonca21@gmail.com` e depois o e-mail da dona da loja. Toda mutação do catálogo deve verificar a função de administrador no servidor.
4. Criar a conta Mercado Pago da loja e integrar o Checkout Pro. O servidor cria a preferência de pagamento usando preços do banco; o navegador redireciona para o pagamento; um webhook validado atualiza o pedido após confirmação. Não confiar apenas no retorno do navegador. Configurar frete, políticas, domínio e dados da empresa antes de vender.
5. Trocar `dist/config.js` para o WhatsApp definitivo. O número não é segredo; as credenciais de pagamento e banco devem ficar apenas em variáveis do servidor.

## Executar localmente

```sh
python3 -m http.server 8765 --directory dist
```

Abra `http://localhost:8765`. Para reconstruir o GLB ilustrativo: `python3 generate_model.py`.
