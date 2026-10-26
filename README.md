# Mandalaria D'ogum

Prévia pública da vitrine da loja. O catálogo, as imagens e os preços são **conceituais**. O número em `dist/config.js` é o WhatsApp de testes do desenvolvedor.

O logo enviado pela loja está preservado em `dist/assets/logo-mandalaria-original.jpg`. O site usa recortes transparentes derivados dele (`logo-symbol-transparent.png` e `logo-wordmark-transparent.png`), com a escrita corrigida para **D’OGUM** e um pequeno espaço entre o símbolo e o nome. As versões originais permanecem guardadas para referência.
O bege dentro da mandala é aplicado em `dist/styles.css`; fora do círculo e atrás da escrita, o fundo permanece transparente.

O projeto `mandalaria-dogum` já foi criado no Neon, com banco `mandalaria`, branches `main` e `development` e a migração inicial aplicada nas duas. A variável `DATABASE_URL` está guardada como segredo no projeto Sites. Veja [neon/README.md](neon/README.md) para os identificadores e o estado da integração. A vitrine ainda usa dados demonstrativos locais; o banco está pronto para as futuras rotas de servidor.

## O que já funciona

- Vitrine responsiva, busca, categorias, filtro de preço e disponibilidade, ordenação e detalhes de produtos.
- Carrinho persistido neste navegador.
- Formulário de encomenda que prepara uma mensagem estruturada e abre o WhatsApp de testes.
- Prévia fotográfica da mandala em AR em dispositivos compatíveis, com opção de testar sobre uma foto da parede quando a AR não estiver disponível. A prévia é plana e ilustrativa; o modelo tridimensional fiel depende de captura da peça real.
- Painel demonstrativo para criar, editar e excluir produtos e categorias. As alterações usam `localStorage` e aparecem apenas no navegador em que foram feitas.

## Para abrir a loja ao público

1. Criar o catálogo real com fotos, descrições, preços, medidas e estoque. Substituir as imagens conceituais. Para AR fiel, criar um arquivo GLB em escala real por peça e testar em Android/iOS; USDZ próprio melhora a experiência no iPhone.
2. Integrar a vitrine ao projeto Neon já criado. Um backend deverá ler e gravar categorias, produtos, clientes, pedidos e encomendas, proteger ações administrativas e recalcular preços e estoque no servidor. Nunca colocar `DATABASE_URL` em `dist/` ou no navegador.
3. Adicionar autenticação de clientes e uma lista de administradores, iniciando com `gb.mendonca21@gmail.com` e depois o e-mail da dona da loja. Toda mutação do catálogo deve verificar a função de administrador no servidor.
4. Criar a conta Mercado Pago da loja e integrar o Checkout Pro. O servidor cria a preferência de pagamento usando preços do banco; o navegador redireciona para o pagamento; um webhook validado atualiza o pedido após confirmação. Não confiar apenas no retorno do navegador. Configurar frete, políticas, domínio e dados da empresa antes de vender.
5. Trocar `dist/config.js` para o WhatsApp definitivo. O número não é segredo; as credenciais de pagamento e banco devem ficar apenas em variáveis do servidor.

## Executar localmente

```sh
python3 -m http.server 8765 --directory dist
```

Abra `http://localhost:8765`. Para reconstruir a prévia GLB a partir do recorte fotográfico: `python3 generate_photo_ar.py`.
