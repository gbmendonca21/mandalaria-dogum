# Mandalaria D'ogum

Loja publicada em [Cloudflare Workers](https://mandalaria-dogum.vertice-digital.workers.dev/), com rotas de servidor, arquivos no Neon Object Storage e PostgreSQL no Neon. A vitrine está em `legacy-index.html` e é servida pela rota `app/route.ts`.

A prévia em <https://gbmendonca21.github.io/mandalaria-dogum/> é gerada por `npm run build:pages` e publicada pelo workflow do GitHub. Ela contém um retrato do catálogo público no momento do build e somente os recursos que funcionam sem servidor. O login, o painel administrativo e o banco funcionam no Cloudflare Worker; mudanças no catálogo exigem uma nova execução do workflow para aparecer no Pages.

## O que funciona

- Catálogo público vindo do Neon (`GET /api/catalog`), com busca, categorias, filtros, detalhes, carrinho local e exibição opcional de modelos GLB/USDZ e AR.
- Cadastro por e-mail e senha, login com Google, recuperação de senha por código e verificação de e-mail por Neon Auth. O painel exige e-mail verificado e uma função na tabela `admin_memberships`.
- Gestão de produtos e categorias, uploads de fotos (JPG/PNG/WebP) e modelos GLB/USDZ para o bucket privado `mandalaria-media` no Neon, e atualização do andamento de pedidos.
- Checkout Pro do Mercado Pago. O servidor recalcula preços usando o Neon, cria pedidos e preferências, e valida a assinatura de webhooks. Pagamentos aprovados sem estoque suficiente são reembolsados automaticamente.
- Produtos começam como rascunho. Apenas os publicados aparecem na vitrine; produtos sem foto mostram um espaço neutro com o símbolo da marca.
- Formulário de encomenda personalizada pelo WhatsApp.

Enquanto não há produtos reais publicados e `DEMO_CATALOG=true`, a vitrine mostra oito produtos fictícios em quatro categorias: Mandalas, Porta-chaves, Incensários e Velas aromáticas. Os exemplos vêm de `lib/demo-catalog.ts`, não são gravados no banco nem aparecem como produtos editáveis no painel. Ao publicar a primeira peça real com preço definido, a vitrine usa somente o catálogo real. Fotos reais ainda sem preço substituem os exemplos da mesma categoria, mantendo os exemplos das demais categorias durante a preparação. Para encerrar a demonstração mesmo com o catálogo vazio, defina `DEMO_CATALOG=false` no Worker. O checkout depende das credenciais do Mercado Pago e do valor fixo de frete configurado no Worker. O projeto não inclui cálculo de frete por transportadora.

O carrinho sugere até três peças em “Você esqueceu de algo?”, priorizando categorias complementares e excluindo itens já escolhidos ou indisponíveis. Os produtos fictícios permitem testar busca, filtros, detalhes, quantidades, remoção, sugestões e resumo de finalização. A simulação não pede dados pessoais, não cria pedidos e não chama o Mercado Pago; a API de checkout também recusa identificadores `demo-`. O carrinho remove exemplos antigos quando o catálogo real passa a ser exibido.

## Banco e segurança

O projeto Neon `mandalaria-dogum` usa o banco `mandalaria` nas branches `main` e `development`. As migrações [`neon/001_init.sql`](neon/001_init.sql) e [`neon/002_site_owner.sql`](neon/002_site_owner.sql) foram aplicadas em ambas. Os identificadores estão em [`neon/README.md`](neon/README.md). Neon Auth foi habilitado nas duas branches.

`DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET` e as credenciais S3 do Neon são segredos de servidor. Nunca os coloque em `public/`, no Git ou no navegador. O painel verifica a sessão Neon Auth, a confirmação do e-mail e a tabela `admin_memberships`; a conta principal autorizada é a única associação administrativa em produção. Os scripts de instalação não concedem acesso automaticamente.

## Publicação na Cloudflare

O Worker de produção já está publicado e ligado ao Neon Auth e ao Object Storage. O checkout ainda precisa das credenciais da conta Mercado Pago e do frete fixo. Para habilitar publicação automática após mudanças na branch `main`:

1. Cadastre `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` como segredos do GitHub Actions. Sem eles, o workflow compila e pula a publicação.
2. Configure no Worker os segredos `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`, mais a variável `SHIPPING_CENTS` com o frete fixo em centavos.
3. No Mercado Pago, configure o webhook de pagamentos para `/api/webhooks/mercadopago`.

O GitHub Pages continua como prévia estática do catálogo. Login, administração, uploads e checkout funcionam somente no Worker.

Para publicar a partir de uma máquina autenticada no Wrangler, execute `npm run deploy:cloudflare`. Esse comando verifica os tipos, compila e publica preservando as variáveis configuradas no painel Cloudflare, como o frete fixo. Os segredos do Worker também são preservados.

## Desenvolvimento local

Requer Node.js 22.13+ e autenticação do Neon CLI na máquina. A conexão local usa somente a branch `development`:

```sh
npm ci
npm run dev:neon
```

Abra `http://127.0.0.1:5173`. O script usa a branch `development` do Neon sem gravar a URL do banco em arquivo. `.dev.vars` guarda segredos locais de sessão e armazenamento e não deve ser versionado.

Antes de publicar, execute `npm run check:demo`, `npm run check:auth`, `npm run check:media`, `npm run typecheck` e `npm run build`. A verificação do catálogo de demonstração cobre filtros, carrinho, recomendações, simulação e bloqueio de pagamentos fictícios. O workflow do Cloudflare também executa essas verificações; um build bem-sucedido com o deploy pulado não atualiza o Worker em produção.

A compilação gera `dist/`, que não é versionada. O arquivo `generate_photo_ar.py` permanece como referência para criar uma prévia 3D a partir de uma foto; modelos fiéis devem ser feitos a partir das peças reais.

Os seis produtos conceituais da primeira vitrine permanecem no histórico do Git, em `febbe95:dist/app.js`. Somente a Mandala Aurora tinha uma prévia AR. O modelo `public/assets/mandala-preview.glb` e a foto `public/assets/mandala-recorte.png` continuam disponíveis; o GLB é uma imagem plana de 45 cm para testar a composição na parede. A vitrine atual oferece 3D/AR quando um produto publicado tem um arquivo GLB cadastrado, com USDZ opcional para iPhone. A Mandala Aurora do catálogo de demonstração reutiliza essa prévia. Os exemplos não foram inseridos como produtos reais no Neon.

## Login com Google

O domínio de produção `https://mandalaria-dogum.vertice-digital.workers.dev` está autorizado no Neon Auth. O botão “Continuar com Google” usa `signIn.social`; o proxy de autenticação troca o verificador de retorno pela sessão da loja. Cadastro com Google e cadastro por e-mail não concedem privilégios automaticamente: o painel exige e-mail verificado e associação na tabela `admin_memberships`.

O Google usa atualmente o aplicativo compartilhado do Neon, adequado à demonstração. Antes de atender clientes reais, configure Client ID e Client Secret próprios no Neon, seguindo https://neon.com/docs/auth/guides/setup-oauth. Não envie esses segredos ao navegador. Se o domínio mudar, atualize também a lista de domínios confiáveis do Neon Auth.

A verificação `npm run check:auth` recompila e executa o cliente real de autenticação em um contexto de navegador sem o global `process`, além dos testes de formulário e autorização. O build substitui `process.env.NODE_ENV` por uma constante para que bibliotecas não dependam do Node no navegador.

## Produtos com apenas a fotografia

Um produto publicado com preço 0 funciona como apresentação da foto: a vitrine exibe somente a imagem e permite ampliá-la, sem valor nem botão de compra. O checkout rejeita produtos sem preço. No painel, edite o cadastro da peça, complete nome, descrição, preço e estoque; ao salvar com preço maior que 0, ela passa a usar a apresentação normal do produto. As seis fotografias reais iniciais de Mandalas foram enviadas ao bucket do Neon e mantêm o conteúdo dos arquivos originais.

O armazenamento de mídia usa `aws4fetch` com assinatura S3, `fetch` e Web Crypto nativos do Worker. `npm run check:media` verifica upload/leitura, integridade dos bytes e bloqueio de compra de produtos sem preço.

## Privacidade e preparação comercial

A revisão dos 17 pontos e suas pendências está em [docs/security-review-2026-11-15.md](docs/security-review-2026-11-15.md). Os dados legais e o e-mail público de atendimento continuam pendentes. O WhatsApp oficial foi confirmado pela responsável e está ativo, independentemente da liberação de vendas. `config/store.json` é configuração pública: não insira segredos nesse arquivo. Enquanto `businessVerified` e `salesEnabled` não forem verdadeiros e os campos obrigatórios não estiverem completos, o servidor recusa compras reais; o carrinho de demonstração segue disponível. Configurar pagamentos e frete também é obrigatório.

`npm run build` e `npm run build:pages` geram as políticas e a configuração pública a partir desse arquivo. Antes de liberar vendas, complete a identificação, valide os textos, direitos das imagens, contratos de dados, retenção e atendimento, e teste o pagamento. CNPJ é o campo do cadastro atual; ajuste o modelo com orientação adequada se o fornecedor tiver outro enquadramento legal. Não basta mudar as duas flags para afirmar conformidade.

Verificações: `npm run typecheck`, `npm run check:auth`, `npm run check:demo`, `npm run check:media`, `npm run check:security`, `npm audit --audit-level=moderate`, `npm run build`, `npm run build:pages` e `npm run check:secrets`. A varredura ampliada `node scripts/checks/public-secrets.mjs --history` também examina os blobs de todos os refs locais, sem imprimir valores encontrados.

O limite contra abuso é aproximado por localidade Cloudflare, de 30 operações de autenticação e 60 demais gravações por minuto por chave derivada do IP. Não substitui monitoramento ou proteção global contra ataques. As fotos de ambiente permanecem locais; arquivos da vitrine são públicos por design, servidos por uma rota limitada a `products/`, e as credenciais do bucket permanecem no Worker. Use arquivos do bucket para modelos 3D: a CSP bloqueia conexões arbitrárias externas e modelos comprimidos podem precisar de decodificadores locais adicionais.

O contato oficial por WhatsApp é `(13) 98119-6066`, configurado como `5513981196066` em `config/store.json`. `whatsappVerified` confirma apenas o canal informado; não substitui `businessVerified` nem libera compras reais. O e-mail de administrador é uma autorização privada em `admin_memberships`, independente do e-mail público de atendimento.


A opção **Minha conta → Alterar senha** está disponível a todos os usuários autenticados, sem exigir função administrativa. Contas com senha confirmam a senha atual; contas que só usam Google criam uma senha da loja pelo código enviado ao próprio e-mail. A confirmação de senha é obrigatória, alterações encerram outros acessos e a redefinição por código encerra todas as sessões. Senhas iniciais de cadastro são geradas fora do repositório e não devem ser incluídas em arquivos, exemplos, logs ou no Git. O administrador continua precisando verificar o e-mail antes de abrir o painel.

A leitura de sessão em `/api/me`, nas permissões administrativas e em `/api/auth/get-session` força revalidação no Neon com `disableCookieCache=true`. Isso evita que o snapshot assinado de sessão do SDK mantenha acesso após revogação. Não basta verificar apenas a validade da assinatura do cookie em operações autenticadas.
