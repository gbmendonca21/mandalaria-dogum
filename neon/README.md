# Neon: preparação do banco

O arquivo `001_init.sql` é a migração inicial. Ela **ainda não foi aplicada**, pois o projeto Neon da loja não está conectado nesta sessão.

## Para aplicar

1. Conectar a conta Neon ao ambiente de trabalho e selecionar ou criar um projeto para a Mandalaria.
2. Criar uma branch de desenvolvimento no Neon e aplicar `001_init.sql` nela antes da branch de produção.
3. Conferir as tabelas e adicionar a administradora quando ela tiver um e-mail definido. O e-mail do desenvolvedor já está preparado em `admin_memberships`, mas só deve liberar acesso quando o login confirmar que o e-mail é verificado.
4. Configurar `DATABASE_URL` apenas como segredo do servidor da aplicação. Jamais colocar a URL em `dist/`, `config.js`, Git ou mensagens públicas.
5. Migrar a vitrine estática para uma aplicação com rotas de servidor. O navegador não deve falar diretamente com o banco. As rotas administrativas precisam validar sessão e função; o checkout precisa ler preços e estoque do banco.

Produtos podem permanecer em estado `draft` e ser publicados depois. Fotos e arquivos 3D ficarão em armazenamento de objetos; o banco guarda seus endereços em `product_media`.
