# Neon: banco da Mandalaria

O projeto `mandalaria-dogum` foi criado na organização da conta conectada. O banco `mandalaria` fica na região `aws-us-east-1`.

| Recurso | Identificador |
| --- | --- |
| Organização | `org-spring-forest-48726082` |
| Projeto | `restless-scene-83142333` |
| Branch principal | `main` (`br-proud-mode-b7tlck4b`) |
| Branch de desenvolvimento | `development` (`br-shiny-dream-b7wz661q`) |

`001_init.sql` e `002_site_owner.sql` foram aplicados nas duas branches. Neon Auth Managed Better Auth está habilitado nas branches `main` e `development`. Há dez tabelas de aplicação: `categories`, `products`, `product_media`, `customers`, `admin_memberships`, `orders`, `order_items`, `payment_events`, `custom_requests` e `site_settings`. `gb.mendonca21@gmail.com` e `gbmend@gmail.com` estão cadastrados como `owner` em `admin_memberships`; o painel exige sessão autenticada, e-mail verificado e associação ativa.

A aplicação Cloudflare consulta o Neon nas rotas de servidor, usando `DATABASE_URL` como segredo do Worker. O navegador nunca recebe a URL de conexão. `NEON_AUTH_BASE_URL` aponta para a autenticação Managed da branch de produção; `npm run dev:neon` seleciona a URL da branch `development`.

O catálogo foi mantido vazio até o cadastro de produtos reais. Fotos e modelos enviados pelo painel ficam no bucket R2 `mandalaria-media` e seus caminhos são guardados em `product_media`. Pedidos e pagamentos são persistidos em `orders`, `order_items` e `payment_events`. O checkout exige credenciais Mercado Pago e um valor fixo de frete configurado no Worker.
