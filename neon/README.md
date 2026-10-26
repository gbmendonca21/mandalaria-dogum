# Neon: banco da Mandalaria

O projeto `mandalaria-dogum` foi criado na organização da conta conectada. O banco `mandalaria` fica na região `aws-us-east-1`.

| Recurso | Identificador |
| --- | --- |
| Organização | `org-spring-forest-48726082` |
| Projeto | `restless-scene-83142333` |
| Branch principal | `main` (`br-proud-mode-b7tlck4b`) |
| Branch de desenvolvimento | `development` (`br-shiny-dream-b7wz661q`) |

`001_init.sql` e `002_site_owner.sql` foram aplicados nas duas branches. Há dez tabelas: `categories`, `products`, `product_media`, `customers`, `admin_memberships`, `orders`, `order_items`, `payment_events`, `custom_requests` e `site_settings`. `gb.mendonca21@gmail.com` e `gbmend@gmail.com` estão cadastrados como `owner` em `admin_memberships`. Isso não cria uma senha: o painel exige sessão de login cujo e-mail corresponda à associação.

A variável `DATABASE_URL` está configurada como segredo do servidor no Sites, apontando para a branch principal. A aplicação consulta o Neon nas rotas `app/api/catalog`, `app/api/me` e `app/api/admin`. O navegador nunca recebe a URL de conexão. A branch `development` é usada pelo comando local `npm run dev:neon`.

O catálogo foi mantido vazio até o cadastro de produtos reais. Fotos e arquivos 3D são informados por URLs HTTPS em `product_media`; o upload próprio ainda depende de armazenamento de objetos. Pedidos, pagamentos e encomendas já têm tabelas preparadas, mas as rotas correspondentes dependem da integração de checkout e do fluxo comercial da loja.
