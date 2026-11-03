# Mandalaria D'ogum

Loja em desenvolvimento, publicada em <https://mandalaria-dogum.azurenote4099.chatgpt.site>. O projeto usa Sites com rotas de servidor e PostgreSQL no Neon. O logo está em `public/assets/` e a vitrine original foi preservada em `legacy-index.html`, servida pela rota `app/route.ts`.

A prévia em <https://gbmendonca21.github.io/mandalaria-dogum/> é gerada por `npm run build:pages` e publicada pelo workflow do GitHub. Ela contém um retrato do catálogo público no momento do build e somente os recursos que funcionam sem servidor. O login, o painel administrativo e o banco funcionam na versão Sites; mudanças no catálogo exigem uma nova execução do workflow para aparecer no Pages.

## O que funciona

- Catálogo público vindo do Neon (`GET /api/catalog`), com busca, categorias, filtros, detalhes, carrinho local e exibição opcional de modelos GLB/USDZ e AR.
- Login pelo recurso **Entrar com ChatGPT** da hospedagem Sites. A conta exibe nome e e-mail do usuário autenticado.
- Painel protegido para criar, editar e excluir produtos e categorias. Cada requisição consulta `admin_memberships` no Neon; `gb.mendonca21@gmail.com` e o e-mail proprietário do projeto Sites (`gbmend@gmail.com`) estão cadastrados como `owner`.
- Produtos começam como rascunho. Apenas os publicados aparecem na vitrine; produtos sem foto mostram um espaço neutro com o símbolo da marca.
- Formulário de encomenda que prepara uma mensagem estruturada para o WhatsApp de testes em `public/config.js`.

O catálogo está vazio porque ainda não há fotos, preços e produtos reais. As imagens conceituais continuam somente nas seções de apresentação. O checkout ainda informa que o pagamento está em preparação: falta a conta Mercado Pago da loja, além de frete e políticas comerciais. O painel aceita URLs HTTPS de fotos e arquivos 3D; o envio direto de arquivos ainda não foi implementado.

## Banco e segurança

O projeto Neon `mandalaria-dogum` usa o banco `mandalaria` nas branches `main` e `development`. As migrações [`neon/001_init.sql`](neon/001_init.sql) e [`neon/002_site_owner.sql`](neon/002_site_owner.sql) foram aplicadas em ambas. Os identificadores estão em [`neon/README.md`](neon/README.md). `DATABASE_URL` está guardada como segredo do servidor Sites; nunca a coloque em `public/`, no Git ou no navegador.

As rotas administrativas exigem sessão autenticada, e-mail presente em `admin_memberships` e origem da própria loja para mutações. A conta usada no login deve ter o mesmo e-mail cadastrado no banco. Para liberar a dona da loja no futuro, inclua o e-mail verificado dela em `admin_memberships` com função `owner` ou `editor`.

## Desenvolvimento local

Requer Node.js 22.13+ e autenticação do Neon CLI na máquina. A conexão local usa somente a branch `development`:

```sh
npm ci
npm run dev:neon
```

Abra `http://127.0.0.1:5173`. O script obtém a URL do Neon CLI e a passa ao processo sem gravá-la em arquivo. O login local simulado usa `seedy@sites.test`, que não tem acesso administrativo por padrão. Para testar o painel localmente, configure uma associação temporária apenas na branch `development` e remova-a após o teste.

Para verificar o projeto:

```sh
npx tsc --noEmit
npm run build
```

A compilação gera `dist/`, que não é versionada. O arquivo `generate_photo_ar.py` permanece como referência para criar uma prévia 3D a partir de uma foto; modelos fiéis devem ser feitos a partir das peças reais.
