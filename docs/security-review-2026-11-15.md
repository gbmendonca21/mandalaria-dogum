# Revisão de segurança, privacidade e transparência — 15/11/2026

Site: https://mandalaria-dogum.vertice-digital.workers.dev/

Publicação verificada: Worker `84eff77b-af15-4f54-abdd-b5cd2a7c3b87`. As 28 sondagens HTTP registradas confirmaram políticas e assets com cabeçalhos de segurança, arquivos sensíveis 404, administração anônima 401, origem externa 403, checkout real 503, demonstração 409 e entrada inválida de autenticação 400. Acesso não assinado ao objeto no bucket Neon retornou 403; a mesma foto pela rota pública da vitrine retornou 200. O catálogo permaneceu com 12 itens, incluindo as seis fotografias reais sem preço.

A responsável pediu para deixar os dados da empresa e os canais oficiais pendentes. Por isso, o site permanece em preparação: o catálogo e o carrinho de demonstração funcionam, mas pedidos reais são recusados tanto na interface quanto na API. Nenhuma razão social, CNPJ, endereço ou contato foi inventado. Este relatório é uma revisão técnica com textos informativos iniciais; não certifica conformidade jurídica ou acessibilidade integral.

## Os 17 pontos da imagem

| Ponto | Resultado | Evidência e pendência |
| --- | --- | --- |
| 1. Política de privacidade | Implementada, com pendências declaradas | `/legal/privacidade.html`: finalidades, dados, provedores, direitos e foto local. Falta identificar o controlador e concluir canais, retenção, transferências e procedimentos. |
| 2. Termos de serviço | Implementados para a fase atual | `/legal/termos.html`: conta, demonstração, venda futura, direitos e limitações das simulações. Revisar condições comerciais antes da abertura. |
| 3. Aviso de cookies | Implementado | Aviso de armazenamento essencial, link de detalhes e opção de reabrir no rodapé. O botão “Entendi” registra ciência; não representa consentimento para publicidade. |
| 4. Política de reembolso | Implementada como informação inicial | `/legal/trocas-e-reembolsos.html`: arrependimento, defeitos e estorno, sem excluir automaticamente peças personalizadas. Faltam logística e canal operacional. |
| 5. Formulários e LGPD | Adequados tecnicamente ao fluxo atual; parcialmente pendente | Avisos junto ao login, encomenda e checkout; simulação não coleta dados pessoais. Compra real exige aceite dos termos. Não há consentimento genérico obrigatório para marketing. Canais de direitos e operação ainda precisam ser concluídos. |
| 6. Só dados necessários | Revisado | Conta usa nome/e-mail/autenticação. Compra futura pede contato e endereço de entrega, sem CPF, data de nascimento ou cartão na loja. Encomenda prepara texto local. Campos e finalidades estão descritos na política. |
| 7. Scripts de tracking | Sem rastreadores identificados no código da aplicação | Sem Analytics, Meta Pixel ou publicidade comportamental. Fontes e visualizador 3D passaram a ser locais. Não equivale a auditar internamente Google, Neon, Cloudflare ou outros provedores. |
| 8. Acessibilidade | Melhorada; validação integral pendente | Link para pular conteúdo, nomes acessíveis, rótulos, status, foco visível, tamanho mínimo de controles e redução de movimento. Falta avaliação humana em navegadores, leitor de tela e dispositivos reais. |
| 9. Alt nas imagens | Revisado na vitrine | Fotos usam o nome da peça; imagens decorativas têm alternativa vazia; imagens ilustrativas estão identificadas. Qualidade das descrições depende também dos futuros cadastros. |
| 10. Contraste | Paleta corrigida e pares de texto testados | Cores secundárias escurecidas, fundo legível em títulos sobre fotos e foco visível. Testes de pares da paleta atingem 4,5:1; não é uma medição de todos os pixels, estados e telas. |
| 11. Navegação por teclado | Implementada e exercitada em testes | Carrinho mantém foco, bloqueia fundo com `inert`, fecha com Escape e restaura foco. Fotos e ações usam botões separados, diálogos nativos e posicionamento da peça aceita setas. Conferência real com leitor de tela segue pendente. |
| 12. Sem avaliações falsas | Atendido no conteúdo atual | Não há avaliações ou depoimentos fabricados. Produtos fictícios têm indicação de demonstração. |
| 13. Sem promessas falsas | Revisado no conteúdo atual | Demonstração não promete entrega; fotos sem preço não são compráveis; retorno de URL não afirma pagamento recebido; simulação visual não garante escala. Novas ofertas precisam refletir produtos e condições reais. |
| 14. Copyright das imagens | Parcialmente atendido | Fotos reais foram fornecidas pela responsável para publicação; origem da ilustração de vela e licenças dos novos arquivos estão documentadas. Faltam comprovações de direitos dos materiais antigos e autorizações arquivadas. Ver inventário abaixo. |
| 15. Dados da empresa | Pendente por solicitação expressa | `/legal/dados-da-loja.html` informa a pendência. Telefone de teste retirado das ações de contato. Vendas reais bloqueadas por `config/store.json` e `lib/store.ts`. |
| 16. Conformidade LGPD | Parcial; não certificada | Minimização, transparência e proteções técnicas implementadas. Faltam responsável/canais, atendimento verificável a titulares, retenção/eliminação, contratos, transferências e plano de incidentes. |
| 17. Riscos jurídicos | Reduzidos; permanecem pendências | Não há promessa de “não ser processado”. Abertura comercial exige completar os itens acima e revisar as condições concretas da operação. |

## Variáveis de ambiente e publicação de segredos

- `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` aparecem como `secret_text` no Worker. A CLI lista os nomes, sem revelar os valores.
- `.dev.vars` está ignorado pelo Git e com permissão local `600`. Os padrões `.env`, `.env.*` e `.dev.vars*` são ignorados, com exceção intencional de `.env.example`.
- `.env.example` contém os campos secretos vazios. URL do serviço de autenticação, região, endpoint do bucket, flags de demonstração e identificadores de infraestrutura não são senhas. Conhecer esses endereços não concede acesso administrativo.
- `public/config.js` é público por definição e contém apenas configurações de apresentação e dados comerciais públicos. `config/store.json` também pertence ao repositório público: não inserir credenciais nesses arquivos.
- A varredura dos artefatos públicos e dos blobs de todos os refs Git locais não encontrou os valores secretos locais conhecidos nem os padrões de URL PostgreSQL com senha, chave privada, tokens GitHub ou tokens Neon selecionados. Não é prova de inexistência de qualquer segredo possível, nem abrange cópias externas e objetos que não estejam nos refs locais.
- O build de produção foi conferido para impedir variáveis secretas em `vars` no manifesto Wrangler. Os segredos são vinculados em runtime no servidor.
- O bucket guarda arquivos da vitrine. A API publica somente caminhos `products/UUID.ext`; as credenciais S3 e os dados de pedidos não são retornados ao navegador. Uma foto pública no catálogo é comportamento esperado.

Se alguma credencial vier a ser publicada, a correção é revogá-la/rotacioná-la no provedor e investigar o uso; apagar uma linha do Git sozinho não a torna secreta novamente.

## Proteções técnicas acrescentadas

- CSP sem scripts inline ou `eval`, `nosniff`, HSTS, política de referenciador, bloqueio de enquadramento e permissões limitadas. `_headers` aplica as políticas aos assets Cloudflare; o Worker cobre respostas dinâmicas. CSS inline ainda é permitido porque a interface atual o utiliza.
- API de gravação exige origem do próprio site. Webhook de pagamento é exceção de origem e continua exigindo assinatura HMAC, consulta ao provedor e conferência de valor/moeda/pedido.
- Limite de 64 KiB para corpos comuns de API, verificado também durante leitura; upload tem limite de entrada de 52 MiB por cabeçalho, autenticação administrativa e limites por arquivo de 10 MiB para imagens e 50 MiB para modelos. A validação de assinatura inicial de arquivo rejeita HTML renomeado como imagem; não substitui análise antimalware nem validação estrutural completa de ZIP/modelos.
- Rate limiting Cloudflare em operações de escrita: 30/minuto para autenticação e 60/minuto para outras gravações, por chave derivada do IP com sal secreto. É aproximado e distribuído por localidade, não um limite global estrito; usuários na mesma rede podem compartilhar a cota. Webhooks não entram na cota de navegação.
- Caminhos de arquivos privados, diretórios internos e mapas de código são recusados pelo Worker. APIs administrativas mantêm sessão, e-mail verificado e associação atual no banco como requisitos.
- Scripts antigos de instalação deixaram de autorizar automaticamente os dois e-mails administrativos removidos anteriormente. Não houve concessão de novo administrador nesta revisão.
- Logs explícitos de erros da loja/mídia passam a registrar classe do erro, sem objeto completo ou resposta do pagamento. Logs automáticos de invocação foram desabilitados e query strings são ocultadas no observability do Worker, reduzindo exposição de verificadores OAuth. Registros internos dos provedores e logs antigos exigem gestão própria de retenção/acesso.
- Dependências atualizadas e transitivas corrigidas com versões fixadas no lockfile. Antes: 34 alertas (2 críticos, 14 altos, 17 moderados e 1 baixo). Depois: **zero vulnerabilidades conhecidas no `npm audit`** na data da revisão. Isso não elimina vulnerabilidades desconhecidas.

## Inventário de direitos e serviços

| Material | Origem conhecida | Situação |
| --- | --- | --- |
| Seis fotografias reais de mandalas no Neon | Anexadas pela responsável e solicitadas para publicação | Uso solicitado documentado na conversa; arquivar comprovação/autorização do titular e de eventuais elementos de terceiros. |
| `vela-aromatica-mandala.jpg` | Imagem ilustrativa gerada para a categoria | Prompt e finalidade em `design/velas-aromaticas.md`; não apresentada como foto de uma vela real à venda. |
| Logos, `hero-mandala.png`, `catalogo-conceitual.png`, recortes e modelo antigo | Assets que já estavam no projeto | Não foram encontradas licenças/provas suficientes nesta revisão; validação da responsável permanece pendente. A marca não foi declarada registrada. |
| Fontes DM Sans e Manrope | Repositório oficial google/fonts | Hospedadas localmente com arquivos OFL em `public/assets/fonts/`. |
| Model Viewer 4.1.0 | Distribuição oficial Google | Hospedado localmente com licença Apache 2.0 em `public/assets/vendor/`. Modelos comprimidos que precisem de decodificador externo exigem configuração local adicional compatível com CSP. |
| Cloudflare, Neon/Auth, Google, Mercado Pago, WhatsApp | Provedores descritos na política | Validar contratos, perfis de acesso, retenção, transferências internacionais e configuração de produção. Login social ainda usa a configuração compartilhada de demonstração Neon; configurar OAuth próprio antes da abertura comercial. |

## Validação e limites

Executados com sucesso: instalação limpa por `npm run install:ci`, TypeScript, bundle real de autenticação, fluxos de conta e autorização com mocks, carrinho/demonstração/teclado, mídia assinada com fetch interceptado, proteções de requisição, bloqueio de vendas, contraste dos pares definidos, `npm audit`, build Worker, build Pages e varredura dos artefatos públicos/histórico. Os testes não usaram senha de cliente nem criaram compras reais.

O host de acesso ao navegador estava indisponível nesta sessão. Por isso, a navegação real de login Google, leitor de tela, layout móvel e comportamento CSP de todos os futuros modelos AR não receberam validação visual integral. Pagamentos reais também não foram testados: credenciais Mercado Pago e frete continuam pendentes, além da identificação comercial.

Evidências automatizadas locais ficam em `outputs/security/` (ignoradas pelo Git). Os testes reproduzíveis estão em `scripts/checks/`. A CI passa a testar demonstração, limites de segurança, dependências e artefatos públicos antes do deploy.

## Pendências para abertura comercial

1. Completar e validar identificação, endereço e canais oficiais em `config/store.json`, conforme o enquadramento real do fornecedor.
2. Definir atendimento a titulares e consumidores, conservação/eliminação, resposta a incidentes e responsabilidades da equipe. Não há rotina automática de exclusão integral de conta/pedidos implementada nesta revisão.
3. Validar autorizações das imagens e demais elementos; revisar ofertas, materiais, medidas, disponibilidade, entrega, devolução e textos legais com apoio adequado.
4. Validar contratos de provedores e transferência internacional; configurar OAuth próprio e controles de acesso operacionais.
5. Configurar Mercado Pago/frete, testar compra, confirmação, estoque e estorno; concluir avaliação humana de acessibilidade e dispositivos reais. Só então habilitar vendas e publicar novamente.

## Referências primárias consultadas

- [LGPD — texto atualizado na Câmara dos Deputados](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html).
- [Decreto 7.962/2013 — comércio eletrônico](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm).
- [Código de Defesa do Consumidor](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm).
- [ANPD — Guia orientativo de cookies e proteção de dados pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file).
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- [Cloudflare — limites do Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- [Next.js — advisory corrigido](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), [React — advisory corrigido](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3).
