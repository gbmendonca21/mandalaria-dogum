# Neon: banco da Mandalaria

O projeto Neon `mandalaria-dogum` foi criado na organização da conta conectada. O banco `mandalaria` fica na região `aws-us-east-1`.

| Recurso | Identificador |
| --- | --- |
| Organização | `org-spring-forest-48726082` |
| Projeto | `restless-scene-83142333` |
| Branch principal | `main` (`br-proud-mode-b7tlck4b`) |
| Branch de desenvolvimento | `development` (`br-shiny-dream-b7wz661q`) |

`001_init.sql` foi aplicado e conferido nas duas branches. Há dez tabelas: `categories`, `products`, `product_media`, `customers`, `admin_memberships`, `orders`, `order_items`, `payment_events`, `custom_requests` e `site_settings`. `gb.mendonca21@gmail.com` consta como `owner` em `admin_memberships`; isso **não cria login** nem permite acesso sem autenticação e verificação do e-mail. O catálogo permanece vazio até que sejam cadastrados os produtos reais.

O projeto Sites da prévia tem `DATABASE_URL` configurada como variável **secreta** do servidor. A URL não foi salva no repositório nem nos arquivos públicos de `dist/`. A vitrine atual ainda é estática e usa dados demonstrativos no navegador; ela não consulta o Neon. Para usar o banco na loja, implementar rotas de servidor com autenticação, autorização para a administração e validação de preços e estoque no checkout. Nunca conectar o navegador diretamente ao PostgreSQL.

Os produtos podem ser cadastrados como `draft` e publicados depois. Fotos e arquivos 3D ficarão em armazenamento de objetos; o banco guarda os endereços em `product_media`.
