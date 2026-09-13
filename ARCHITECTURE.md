# Arquitetura

## Visão geral

```
UI (React + shadcn/ui + Tailwind)
  └─ TanStack Router  → rotas, search params tipados (zod), guards (beforeLoad)
  └─ TanStack Query   → cache remoto, mutations, invalidação, otimista
       └─ endpoints.ts (Axios) → contratos zod → /api/*  ──┐
       └─ realtime.ts (socket.io-client) → /socket.io/ ─────┤ interceptados por MSW (service worker + WebSocket interceptor)
                                                            └─ mocks/: db persistido em localStorage, handlers, cenários
```

Contratos (`src/lib/api/contracts.ts`) são a única fonte de tipos: os handlers MSW validam entradas com os mesmos schemas zod que a UI usa nos formulários, e as respostas são parseadas no cliente (`endpoints.ts`) antes de entrar no cache. Componentes, hooks e o cliente Axios não contêm respostas fictícias nem caminhos alternativos: toda simulação vive em `src/mocks`.

## Contratos REST

Base `/api`. Autenticação por `Authorization: Bearer <token>`; visitantes enviam `X-Guest-Id` (uuid gerado no cliente) para o carrinho. Erros seguem `{ code, message, fields?, details? }` com os códigos: `VALIDATION_ERROR` (422), `INVALID_CREDENTIALS` (401), `SESSION_EXPIRED`/`UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `EMAIL_TAKEN`/`USERNAME_TAKEN` (409), `COUPON_INVALID`/`COUPON_EXPIRED` (422), `QUANTITY_LIMIT`/`EDITION_UNAVAILABLE` (409), `QUOTE_OUTDATED` (409), `IDEMPOTENCY_CONFLICT` (409), `PASSWORD_MISMATCH` (422), `TRANSIENT_FAILURE` (503/500), `INTERNAL_ERROR` (500).

| Recurso | Método e rota | Corpo / parâmetros | Resposta |
| --- | --- | --- | --- |
| Sessão | `POST /auth/register` | `{ username, email, password, confirmPassword }` | 201 `Session { token, expiresAt, user }` · 409 conflito · 422 |
| | `POST /auth/login` | `{ email, password }` | 200 `Session` · 401 |
| | `GET /auth/session` | — | 200 `Session` · 401 `SESSION_EXPIRED` |
| | `POST /auth/logout` | — | 204 |
| NFTs | `GET /nfts` | `q, category (csv), network (csv), minPrice, maxPrice, sort (recent\|price-asc\|price-desc\|trending\|name), tab (all\|new\|trending), page, pageSize` | `{ items: NftSummary[], page, pageSize, total, totalPages, facets, catalogVersion }` |
| | `GET /nfts/:id` | — | `Nft` (inclui `editions[{ id, label, available, maxPerOrder }]`, `version`) · 404 |
| | `GET /nfts/:id/related` | — | `{ items: NftSummary[] }` |
| Favoritos | `GET /favorites` · `PUT /favorites/:nftId` · `DELETE /favorites/:nftId` | — | `{ items: string[] }` (autenticado) |
| Carrinho | `GET /cart` | — | `Cart { id, ownerType, items[{ id, nftId, editionId, quantity, nft: NftSummary }], coupon, updatedAt }` |
| | `POST /cart/items` | `{ nftId, editionId, quantity }` | 201 `Cart` · 409 `QUANTITY_LIMIT`/`EDITION_UNAVAILABLE` |
| | `PATCH /cart/items/:itemId` | `{ quantity }` | `Cart` · 409 |
| | `DELETE /cart/items/:itemId` | — | `Cart` |
| | `POST /cart/coupon` · `DELETE /cart/coupon` | `{ code }` | `Cart` · 422 `COUPON_INVALID`/`COUPON_EXPIRED` |
| Cotação | `GET /cart/quote` | — | `Quote { quoteId, lines[{ status: ok\|price_changed\|unavailable\|limited, unitPrice, lineTotal, available }], subtotal, discount, networkFee, total, coupon, catalogVersion, valid }` |
| Pedidos | `POST /orders` (header `Idempotency-Key`) | `{ quoteId, walletId, walletType, network, collector }` | 202 `Order` (pending) · 200 mesmo pedido (chave repetida) · 409 `QUOTE_OUTDATED { details.quote }` · 409 `IDEMPOTENCY_CONFLICT` · 422 |
| | `GET /orders` · `GET /orders/:id` | — | `Order { status: pending\|confirmed\|declined, txRef, explorerUrl, lines (snapshot), totais, wallet, network, collector, declineReason, version }` · 403/404 |
| Perfil | `GET /profile` · `PATCH /profile` | `{ displayName, username, email, ensName?, walletNickname? }` | `User` · 409/422 |
| | `PUT /profile/avatar` | `{ dataUrl \| null }` | `User` |
| | `POST /profile/password` | `{ currentPassword, newPassword, confirmPassword }` | 204 · 422 `PASSWORD_MISMATCH` |
| Carteiras | `GET /wallets` | — | `{ primary: Wallet\|null, secondary: Wallet\|null }` |
| | `PUT /wallets/:slot` · `DELETE /wallets/:slot` | `WalletInput` | `Wallet` (201/200) · 409/422 |

**Valores em ETH** trafegam como strings decimais (`"1.19"`). A aritmética (`src/lib/money.ts`) converte para `BigInt` em wei (18 casas), soma/multiplica/percentual sem ponto flutuante e formata com precisão preservada. Quantidades são inteiras. A cotação da API (`quoteId`, hash determinístico de linhas + preços + disponibilidade + cupom + taxa) é a referência para finalizar o pedido.

**Idempotência:** `POST /orders` exige `Idempotency-Key`. A mesma chave com o mesmo corpo devolve o mesmo pedido; a mesma chave com corpo diferente gera `IDEMPOTENCY_CONFLICT`. O cliente gera uma chave nova quando a cotação muda e reutiliza a chave em retentativas (timeout, rede, 5xx).

## Eventos Socket.IO

Conexão em `window.location.origin` com `path: /socket.io`, transporte `websocket`. Ao conectar, o cliente emite `session.auth { token }` e o servidor responde `session.auth.ack { userId }`; eventos privados só são entregues aos sockets autenticados daquele usuário.

| Evento | Payload |
| --- | --- |
| `nft.updated` | `{ eventId, resource: 'nft', id, version, occurredAt, data: { price, previousPrice, editions } }` |
| `order.updated` | `{ eventId, resource: 'order', id, userId, version, occurredAt, data: Order }` |

Regras do cliente (`src/lib/realtime.ts`):
- **Duplicatas:** `eventId` já visto → descartado (janela de 500 ids).
- **Ordenação:** `version` ≤ versão conhecida (mapa local ou dado em cache) → descartado; nunca regride um estado mais novo.
- **Aplicação:** `nft.updated` atualiza `['nft', id]`, todas as páginas de `['catalog', …]` e o snapshot do item no carrinho; se o item está no carrinho, publica um aviso acessível (`aria-live`) e invalida a cotação. `order.updated` só é aplicado se `userId` for o usuário atual; confirma/recusa a tela do pedido e, se confirmado, invalida carrinho e catálogo.
- **Reconexão:** em `connect` após uma desconexão, `invalidateQueries({ type: 'active' })` reconcilia tudo que está na tela com o REST. Pedidos pendentes também fazem polling de 4 s como fallback.
- **Sessão:** login/logout/expiração chamam `authenticate()` (re-emite `session.auth`, limpa versões); o cache privado é removido, então eventos de uma sessão anterior não têm onde aterrissar.
- **Ciclo de vida:** um único socket por aplicação; listeners são registrados uma vez e removidos junto com o socket.

### Transporte nos mocks e limitações

O handler `ws.link(origin)` do MSW intercepta o WebSocket e `@mswjs/socket.io-binding` faz o encode/decode do protocolo Engine.IO/Socket.IO. Limitações: apenas transporte `websocket` (sem polling), namespace padrão, sem rooms/acks/binário. O handler envia pings Engine.IO (`2`) a cada 20 s para o cliente não expirar o heartbeat. Detalhe importante: o MSW remove o prefixo `/socket.io/` da URL do cliente antes do match e `socket.io-client` captura `globalThis.WebSocket` ao ser avaliado — por isso o módulo é importado dinamicamente **depois** de `worker.start()`. Os eventos são publicados pelo *broker* em `src/mocks/realtime.ts`, chamado pelos próprios handlers REST (reserva de disponibilidade, liquidação do pedido, gatilhos) — qualquer mudança nos dados simulados aparece tanto no REST quanto nos eventos.

## Sessão

- Token opaco + `expiresAt` em `localStorage` (`kurio.session.v1`); o usuário é revalidado no boot com `GET /auth/session` (`sessionReady` é aguardado apenas pelas rotas privadas, a home renderiza imediatamente).
- Rotas privadas (`/checkout`, `/orders/*`, `/account/*`) usam `beforeLoad: requireAuth` → `redirect` para `/?auth=login&redirect=<href>` (modal de login sobre a home).
- Qualquer 401 com token ativo (interceptor Axios) encerra a sessão, limpa o cache privado (`favorites`, `cart`, `orders`, `profile`, `wallets`, `session`), re-autentica o socket, avisa via toast e, se a rota é privada, abre o modal de login com `redirect`. O rascunho do checkout (`sessionStorage`, escopado por usuário) é preservado nesse caso e descartado no logout explícito.
- Logout/troca de usuário: `POST /auth/logout`, limpeza do cache privado, rotação do `X-Guest-Id`, `authenticate()` no socket.

## Carrinho

- Estado remoto por dono: `guest:<uuid>` ou `user:<id>`. Persistido no mock (`localStorage`), logo sobrevive a refresh.
- No login/cadastro o servidor mescla o carrinho do visitante (`X-Guest-Id`) no carrinho da conta, respeitando limites; o cliente rotaciona o id de visitante e invalida `['cart']`.
- `GET /cart/quote` recalcula subtotal, desconto (cupom em `cart.coupon`), taxa de rede (`0.016 ETH` estimada) e total a partir do catálogo atual; linhas com preço alterado/esgotadas/acima do limite recebem `status` e `valid=false` bloqueia o checkout.
- Após a confirmação do pedido, o servidor remove do carrinho apenas os itens e quantidades comprados; em falha ou recusa, os itens são preservados (e a disponibilidade reservada é devolvida).

## Cache (TanStack Query)

| Query | staleTime | Notas |
| --- | --- | --- |
| `['catalog', query]` | 30 s | `placeholderData` mantém a página anterior enquanto a nova carrega (estado "atualizando"); `signal` do Axios cancela consultas obsoletas ao mudar filtros. |
| `['nft', id]` | 60 s | Sem retry em 404. |
| `['cart', owner]` | 10 s | `setQueryData` com a resposta de cada mutation; cotação invalidada em seguida. |
| `['cart', owner, 'quote']` | 0 | Sempre revalidada; no checkout também a cada 15 s. |
| `['orders', user, id]` | 5 s | Polling de 4 s enquanto `pending`. |
| `['favorites'\|'profile'\|'wallets', user]` | 60 s | Chaves incluem o `userId` — isolamento por usuário. |

Retries: 2 tentativas com backoff apenas para erros de rede/5xx; nunca em 4xx. Mutations não retentam automaticamente (exceto a criação de pedido, que retenta com a mesma chave idempotente). `refetchOnReconnect` ativo; `refetchOnWindowFocus` desligado para não competir com o tempo real.

**Atualização otimista com rollback:** favoritar/desfavoritar (`useToggleFavorite`) atualiza `['favorites', user]` em `onMutate`, restaura o snapshot em `onError` e reconcilia em `onSettled`.

## Fluxo de compra

1. Carrinho → `Conectar e finalizar` (exige login; `redirect=/checkout`).
2. Checkout: formulário do colecionador (react-hook-form + zod, erros da API mapeados por campo), seleção de carteira cadastrada e rede, simulação de conexão da carteira (aprovar / recusar / desconectar).
3. `Revisar pedido` abre o diálogo de revisão com os dados e a cotação corrente; `reviewedQuoteId` registra o que o usuário viu. Se um `nft.updated` altera a cotação, `quoteId` muda e a confirmação fica bloqueada até "Revisei os novos valores".
4. `Confirmar compra` → `POST /orders` com `Idempotency-Key`. `409 QUOTE_OUTDATED` refaz a cotação e exige nova revisão; timeout/rede/5xx retentam com a mesma chave (até 3×); o botão fica desabilitado enquanto pendente (cliques repetidos não duplicam).
5. O registro `kurio.checkout.pending` (localStorage) guarda chave, corpo e `orderId`. Ao voltar ao checkout após refresh, o pedido pendente é retomado (ou a criação é repetida com a mesma chave), nunca recriado.
6. `/orders/:id` mostra pendente → confirmado/recusado via `order.updated` (com polling como fallback). O recibo reproduz o snapshot do pedido; mudanças posteriores no catálogo não o alteram. `txRef`/link do explorer são simulados.

## Mocks (MSW)

- `db.ts`: estado único (`nfts`, `users`, `sessions`, `favorites`, `carts`, `orders`, `wallets`, `idempotency`, `catalogVersion`) persistido em `localStorage` (`kurio.mock.db.v1`); `?mock-reset=1` ou `__kurioMocks.reset()` restaura integralmente as fixtures.
- Fixtures: 48 NFTs (9 categorias × 3 redes, faixa 0,02–12,30 ETH, edições com disponibilidade variada e algumas esgotadas), 2 usuários, carteiras, favoritos, cupons.
- `scenarios.ts`: presets de latência/falha (ver README). Lidos a cada requisição, então podem mudar em tempo de execução.
- `control.ts`: `window.__kurioMocks` para demonstração e Playwright — só manipula o estado do "servidor"; os eventos continuam trafegando pelo `socket.io-client`.

## Acessibilidade

Navegação por teclado com foco visível (`:focus-visible` global), skip link, `aria-live` para mutations e eventos em tempo real, diálogos Radix com foco preso e retorno ao gatilho, labels e mensagens de erro associadas (`aria-describedby`, `aria-invalid`, `role=alert`), alternativas textuais nas imagens relevantes, estados que não dependem só de cor (texto + ícone), skeletons com `aria-busy` e `prefers-reduced-motion` respeitado (shimmer e carrossel desligados). Sem overflow horizontal em 390/768/1440.

## Testes (Playwright)

`tests/e2e/*.spec.ts` cobre os 12 itens do enunciado em Chromium desktop (1440×900) e mobile (Pixel 7, 390×844). Cada teste parte de `?mock-reset=1&mock-scenario=…` num contexto novo (estado isolado); uma retentativa local (duas no CI) cobre oscilações de tempo quando os workers disputam CPU. Tempo real passa pelo `socket.io-client` (gatilhos mudam o estado do mock, que publica pelo WebSocket interceptado); REST passa pelos handlers MSW. Regressão visual: `home`, `detail`, `cart`, `checkout` com baselines versionadas em `tests/e2e/__screenshots__` (dados fixos, `reducedMotion`, toasts ocultos). Relatório HTML e traces das falhas via `playwright-report/` e `test-results/`.

## Performance e Lighthouse

Estratégia: code-splitting por rota (TanStack `autoCodeSplitting`), chunks `react`/`tanstack`, fontes auto-hospedadas (`@fontsource/ibm-plex-mono`, `font-display: swap`), imagens WebP em dois tamanhos com `srcset`/`sizes` e `width/height` fixos (sem CLS), `fetchpriority=high` no LCP, `loading=lazy` fora da dobra, skeletons que reservam dimensões, meta description/`lang`/títulos por rota.

Custo inerente ao desafio: o build de demonstração precisa carregar o MSW (service worker + interceptors, ~170 KB gzip) **antes** da primeira consulta, e o catálogo só existe através dele — isso desloca o LCP em relação a um backend real. Os resultados medidos (medianas de 3 execuções) estão em `lighthouse/reports/summary.md`; a análise das causas está na seção abaixo.

### Resultados (medianas de 3 execuções — `lighthouse/reports/summary.md`)

Ambiente: Lighthouse 13.4.1 · Node 24.18 · Chrome headless (chrome-launcher) · macOS 25.6 arm64 · `vite preview` do build de produção com mocks ativos · throttling padrão do Lighthouse (mobile: Moto G Power simulado, 4G lento; desktop: 10 Mbps, sem slowdown de CPU).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Início | mobile | 100 | 100 | 100 | 100 | 1582 | 0 | 5 |
| Início | desktop | 100 | 100 | 100 | 100 | 415 | 0 | 0 |
| Detalhe do NFT | mobile | 100 | 100 | 100 | 100 | 1570 | 0 | 0 |
| Detalhe do NFT | desktop | 100 | 100 | 100 | 100 | 448 | 0 | 0 |

Todas as metas (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90) foram atingidas nas medianas. Observações:

- **Primeira medição mobile do início fica em ~80** em todas as rodadas (ver `home-mobile-run1.json`): é a primeira visita do perfil de navegador, quando o service worker do MSW ainda está sendo registrado e o catálogo só pode ser carregado depois disso (LCP ≈ 3,5 s). Nas medições seguintes o worker já controla a página e o LCP cai para ~1,5 s. Em produção com backend real esse custo (download do MSW + registro do SW) não existiria; foi mantido porque a auditoria deve refletir a entrega com os mocks.
- **LCP mobile (~1,5 s)** é dominado por: bootstrap do MSW (chunk `browser-*.js`, ~171 KB gzip, carregado sob demanda antes da primeira consulta) e depois a resposta simulada do catálogo (latência 120–350 ms do cenário padrão). O elemento LCP é a imagem do hero (WebP de 900 px, ~56 KB, `fetchpriority=high`).
- **CLS 0** após reservar o espaço das abas e da grade "Mais desta coleção" no detalhe (antes, 0,087 no desktop causado pelo rodapé subindo quando o conteúdo carregava).
- **TBT ≤ 5 ms**: hidratação leve; React/TanStack em chunks separados e rotas com code-splitting.
- Correções feitas a partir da primeira auditoria: alvos de toque de 24 px nos pontos do carrossel e nos ícones de compartilhar (`target-size`), `robots.txt` (antes o rewrite do SPA devolvia HTML para `/robots.txt`).


## Decisões de UX e desvios do Figma

- **Assets:** o arquivo Figma é *view-only* (a API de exportação recusa). Os quatro retratos usados no layout foram obtidos a partir dos *fills* de imagem carregados pelo próprio Figma (1254×1254 PNG, guardados em `assets/figma/`) e otimizados para WebP em 400 px (cards, `srcset`) e 900 px (hero/detalhe) por `scripts/prepare-art.mjs`. Como no Figma, os mesmos quatro retratos se repetem entre os 48 NFTs das fixtures; a galeria do detalhe repete a imagem principal, como no frame. A fonte monoespaçada do layout foi mapeada para **IBM Plex Mono** (auto-hospedada).
- **Login/Cadastro:** modal sobre a página atual, como no Figma. O estado fica na URL (`?auth=login|register&redirect=…`), então sobrevive a refresh e pode ser linkado; `/login` e `/register` continuam existindo como atalhos que abrem o modal sobre a home. Fluxos privados redirecionam para a home com o modal aberto e voltam ao destino após autenticar. No mobile o modal ocupa a tela inteira, como no frame mobile.
- **Confirmação:** o frame é um modal centralizado sobre fundo escuro; implementado como rota `/orders/:id` com o mesmo cartão (para acesso direto/refresh), incluindo os estados pendente e recusado que não estão desenhados.
- **Checkout:** os campos "Endereço da carteira", "ENS ou carteira secundária" e "Tipo de carteira" são preenchidos pela carteira selecionada (somente leitura), e "Usar outra carteira?" leva ao cadastro de carteiras. A revisão antes do envio acontece em um diálogo.
- **Filtros:** o slider de preço usa `Aplicar` (como no layout); coleções e redes são checkboxes combináveis (o layout mostra apenas a lista com contagens). As contagens vêm das facetas da API.
- **Links fora do escopo** (Criadores, Aprenda, blog, suporte, social login, newsletter, compartilhar): mostram um aviso explícito de "fora do escopo" e nunca simulam sucesso.
- **Ícones:** Lucide (os vetores do arquivo não são exportáveis em modo de visualização).

## Limitações conhecidas

- Sem backend real: cada navegador tem seu próprio "servidor" (estado em `localStorage`); dois usuários em navegadores diferentes não compartilham eventos.
- O socket mockado não implementa polling, rooms nem acks.
- `page.clock` do Playwright não é usado para acelerar temporizadores porque os *timers* do mock vivem na página (fake timers quebrariam o heartbeat do Socket.IO); os cenários usam atrasos curtos e determinísticos.
