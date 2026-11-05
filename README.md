# Mandalaria D'ogum

Loja em migração para Cloudflare Workers, com rotas de servidor, arquivos no R2 e PostgreSQL no Neon. A vitrine está em `legacy-index.html` e é servida pela rota `app/route.ts`.

A prévia em <https://gbmendonca21.github.io/mandalaria-dogum/> é gerada por `npm run build:pages` e publicada pelo workflow do GitHub. Ela contém um retrato do catálogo público no momento do build e somente os recursos que funcionam sem servidor. O login, o painel administrativo e o banco funcionam na versão Sites; mudanças no catálogo exigem uma nova execução do workflow para aparecer no Pages.

## O que funciona

- Catálogo público vindo do Neon (`GET /api/catalog`), com busca, categorias, filtros, detalhes, carrinho local e exibição opcional de modelos GLB/USDZ e AR.
- Cadastro, login e verificação de e-mail por Neon Auth. O painel exige e-mail verificado e uma função na tabela `admin_memberships`.
- Gestão de produtos e categorias, uploads de fotos (JPG/PNG/WebP) e modelos GLB/USDZ para R2, e atualização do andamento de pedidos.
- Checkout Pro do Mercado Pago. O servidor recalcula preços usando o Neon, cria pedidos e preferências, e valida a assinatura de webhooks. Pagamentos aprovados sem estoque suficiente são reembolsados automaticamente.
- Produtos começam como rascunho. Apenas os publicados aparecem na vitrine; produtos sem foto mostram um espaço neutro com o símbolo da marca.
- Formulário de encomenda personalizada pelo WhatsApp.

O catálogo ainda está vazio até o cadastro de produtos reais. O checkout depende das credenciais do Mercado Pago e do valor fixo de frete configurado no Worker. O projeto não inclui cálculo de frete por transportadora.

## Banco e segurança

O projeto Neon `mandalaria-dogum` usa o banco `mandalaria` nas branches `main` e `development`. As migrações [`neon/001_init.sql`](neon/001_init.sql) e [`neon/002_site_owner.sql`](neon/002_site_owner.sql) foram aplicadas em ambas. Os identificadores estão em [`neon/README.md`](neon/README.md). Neon Auth foi habilitado nas duas branches.

`DATABASE_URL` e `NEON_AUTH_COOKIE_SECRET` são segredos de servidor. Nunca os coloque em `public/`, no Git ou no navegador. O painel verifica a sessão Neon Auth, a confirmação do e-mail e a tabela `admin_memberships`; as contas da dona da loja já estão cadastradas como `owner`.

## Publicação na Cloudflare

O workflow `.github/workflows/cloudflare.yml` compila o Worker em atualizações da branch `main` e publica quando as credenciais Cloudflare do GitHub estão configuradas. Sem essas credenciais, ele conclui o build e pula a publicação. Antes do primeiro deploy:

1. Crie o bucket R2 `mandalaria-media`.
2. Cadastre `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` como segredos do GitHub Actions.
3. Depois da primeira publicação, configure os segredos do Worker `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`.
4. Configure `SHIPPING_CENTS` com o frete fixo em centavos (por exemplo, `2500` para R$ 25,00) e adicione o domínio do Worker à lista de origens confiáveis do Neon Auth.
5. No Mercado Pago, configure o webhook de pagamentos para `/api/webhooks/mercadopago`.

O GitHub Pages continua como vitrine estática até a migração para Cloudflare ser concluída. Login, administração, uploads e checkout precisam do Worker.

## Desenvolvimento local

Requer Node.js 22.13+ e autenticação do Neon CLI na máquina. A conexão local usa somente a branch `development`:

```sh
npm ci
npm run dev:neon
```

Abra `http://127.0.0.1:5173`. O script usa a branch `development` do Neon sem gravar a URL do banco em arquivo. `.dev.vars` guarda o segredo local de sessão e não deve ser versionado.

A compilação gera `dist/`, que não é versionada. O arquivo `generate_photo_ar.py` permanece como referência para criar uma prévia 3D a partir de uma foto; modelos fiéis devem ser feitos a partir das peças reais.
