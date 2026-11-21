# Neon: banco da Mandalaria

O projeto `mandalaria-dogum` foi criado na organização da conta conectada. O banco `mandalaria` fica na região `aws-us-east-1`.

| Recurso | Identificador |
| --- | --- |
| Organização | `org-spring-forest-48726082` |
| Projeto | `restless-scene-83142333` |
| Branch principal | `main` (`br-proud-mode-b7tlck4b`) |
| Branch de desenvolvimento | `development` (`br-shiny-dream-b7wz661q`) |

`001_init.sql` e `002_site_owner.sql` foram aplicados nas duas branches. Neon Auth Managed Better Auth está habilitado nas branches `main` e `development`. Há dez tabelas de aplicação: `categories`, `products`, `product_media`, `customers`, `admin_memberships`, `orders`, `order_items`, `payment_events`, `custom_requests` e `site_settings`. Os acessos administrativos são configurados em `admin_memberships`; o painel exige sessão autenticada e associação ativa, com verificação de e-mail obrigatória por padrão. A lista do banco de produção é a fonte atual de permissões; os scripts históricos de bootstrap não representam os acessos atuais.

A aplicação Cloudflare consulta o Neon nas rotas de servidor, usando `DATABASE_URL` como segredo do Worker. O navegador nunca recebe a URL de conexão. `NEON_AUTH_BASE_URL` aponta para a autenticação Managed da branch de produção; `npm run dev:neon` seleciona a URL da branch `development`.

O branch principal contém seis mandalas com fotografias reais, publicadas como apresentação de imagens: sem preço, estoque ou compra até a edição pelo painel. Fotos e modelos enviados pelo painel ficam nos buckets privados Neon Object Storage `mandalaria-media` dos branches `main` e `development`, acessados pelo Worker via API S3. Os caminhos são guardados em `product_media`. Pedidos e pagamentos são persistidos em `orders`, `order_items` e `payment_events`. O checkout exige credenciais Mercado Pago e um valor fixo de frete configurado no Worker.

Em 20/11/2026, a autorização de proprietário foi substituída pelo novo e-mail solicitado pela responsável em `main` e `development`. Cada ambiente foi verificado com uma única associação `owner`; os três e-mails antigos não mantêm privilégios. A troca altera a permissão de administração e não a senha ou os dados pessoais das contas de autenticação. O novo titular deve entrar com seu próprio e-mail e seguir a política vigente de verificação.

A redefinição de senha por código está configurada com `revoke_sessions_on_password_reset=true` em ambas as branches. Alterações autenticadas usam `revokeOtherSessions=true`; as consultas de sessão da loja forçam revalidação para aplicar a revogação imediatamente. A opção de senha pertence a todas as contas, sem concessão de privilégios administrativos. As senhas iniciais não são documentadas nem versionadas.

A migração `neon/003_admin_verification_policy.sql` adiciona `email_verification_required=true` por padrão. Uma dispensa individual só é permitida para uma associação `owner`, mediante solicitação expressa da responsável. Isso não marca o e-mail como verificado no provedor e não dispensa autenticação por senha ou sessão válida. A senha da conta nunca é colocada no código ou no Git.
