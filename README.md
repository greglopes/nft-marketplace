# Kurio — NFT Marketplace (Frontend Challenge)

Implementação do desafio [junglegaming/frontend-challenge](https://github.com/junglegaming/frontend-challenge): marketplace de NFTs com descoberta, compra e conta do colecionador, seguindo o [layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

**Stack:** React 19 · TypeScript · TanStack Router (file-based) · TanStack Query · Axios · Socket.IO client · Tailwind CSS v4 · shadcn/ui · MSW 2 (REST + WebSocket/Socket.IO) · Playwright · Lighthouse · Vite 8.

Toda a API, autenticação, carteiras e pagamentos são **simulados na camada de rede** (MSW). Não há backend real: a mesma camada de mocks roda em desenvolvimento, na demonstração publicada e nos testes.

## Setup

```bash
npm install
npx playwright install chromium   # apenas para os testes E2E
cp .env.example .env              # já versionado como .env.example
npm run dev                       # http://localhost:5173 (com mocks)
```

Requisitos: Node 20+ (desenvolvido com Node 24) e npm 10+.

### Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Ativa a camada MSW (REST + Socket.IO). Só `false` desliga. O build de demonstração usa `true`. |
| `VITE_API_BASE_URL` | `/api` | Base do cliente Axios. |

### Comandos

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com mocks. |
| `npm run build` | Typecheck (`tsc -b`) + build de produção em `dist/`. |
| `npm run preview` | Serve o build em http://localhost:4173. |
| `npm run typecheck` | Verificação de tipos. |
| `npm run lint` | Lint com oxlint. |
| `npm run test:e2e` | Testes Playwright (build + preview automáticos). Relatório HTML em `playwright-report/`, traces das falhas em `test-results/`. |
| `npm run test:e2e:update` | Regera as baselines de regressão visual (`tests/e2e/__screenshots__/`). |
| `npm run test:e2e:report` | Abre o último relatório HTML. |
| `npm run lighthouse` | Auditoria Lighthouse (3 medições × 2 páginas × 2 perfis) com relatórios em `lighthouse/reports/`. `LH_URL=https://... npm run lighthouse` audita a URL publicada. |
| `npm run prepare:art` | Regera os WebP (400/900 px) em `public/art/` a partir dos retratos originais em `assets/figma/`. |

## Credenciais fictícias

| Usuário | E-mail | Senha | Observações |
| --- | --- | --- | --- |
| Ana Nova | `ana@kurio.app` | `Kurio@123` | Carteiras principal (MetaMask/Ethereum) e secundária (Coinbase/Polygon) cadastradas; favoritos `nft-01`, `nft-03`. |
| Bruno Mint | `bruno@kurio.app` | `Kurio@123` | Sem carteiras; carrinho com 1 item; favorito `nft-07`. |

Cupons: `KURIO10` (10%), `GENESIS20` (20%), `EXPIRED20` (expirado). Qualquer outro código é inválido.
Senhas nunca são armazenadas em claro (SHA-256 com salt, mesmo no mock).

## Cenários de simulação

A camada MSW é determinística e configurável. Selecione um cenário por URL, pela página `/mocks` ou pelo console:

```
https://<app>/?mock-scenario=slow        # ativa o cenário (persistido em localStorage)
https://<app>/?mock-reset=1              # restaura integralmente os dados (fixtures) e volta ao cenário padrão
https://<app>/mocks                      # painel com todos os cenários, reset e gatilhos de tempo real
window.__kurioMocks.setScenario('order-timeout'); window.__kurioMocks.reset()
```

| Cenário | Comportamento |
| --- | --- |
| `default` | Sucesso; latência 120–350 ms. |
| `empty-catalog` | Catálogo sem resultados. |
| `slow` | Latência 2,5–3,2 s (skeletons com shimmer). |
| `variable-latency` | Latência aleatória 80–2800 ms (respostas fora de ordem; TanStack Query cancela/descarta as obsoletas). |
| `offline` | Todas as chamadas falham na rede (`TypeError: Failed to fetch`). |
| `catalog-error` | `GET /api/nfts` responde 500. |
| `favorites-fail` | Mutations de favoritos respondem 500 (rollback otimista). |
| `session-short` | Sessões expiram em 20 s. |
| `checkout-price-change` | Preço muda na primeira tentativa de pedido → 409 `QUOTE_OUTDATED` + evento `nft.updated`. |
| `checkout-sold-out` | Edição esgota na primeira tentativa → 409 `QUOTE_OUTDATED`. |
| `order-timeout` | A primeira criação do pedido nunca responde; a retentativa com a mesma `Idempotency-Key` recupera o mesmo pedido. |
| `order-transient` | Primeira tentativa responde 503. |
| `payment-declined` | Pagamento recusado (`order.updated` com `declined`). |
| `payment-slow` | Pedido fica pendente por 20 s (testar desconexão/refresh). |

Gatilhos em tempo real (via `/mocks` ou console): `__kurioMocks.updateNft(id, { price, editions })`, `republishNft(id)` (duplicata), `publishStaleNft(id)` (evento antigo), `disconnectRealtime()`, `expireSession()`.

### Reproduzindo os fluxos de falha

1. **Sessão expirada:** logue, abra `/mocks` → "Expirar sessão", navegue para *Dados do perfil* → redireciona ao login preservando `redirect`; no checkout, o rascunho do formulário é mantido e retomado após o login.
2. **Preço alterado durante o checkout:** com um item no carrinho, abra o checkout em uma aba e, em `/mocks` (outra aba do mesmo navegador não compartilha o socket — use o console da própria aba): `__kurioMocks.updateNft('nft-05', { price: '1.59' })`. O aviso aparece, a cotação é refeita e o botão de confirmação exige nova revisão.
3. **Timeout com idempotência:** `?mock-scenario=order-timeout`; confirme a compra; após ~8 s o cliente retenta com a mesma chave e cai no mesmo pedido.
4. **Pagamento recusado:** `?mock-scenario=payment-declined`.
5. **Pedido pendente + desconexão:** `?mock-scenario=payment-slow`; confirme; em `/mocks` "Derrubar conexão Socket.IO" (ou recarregue a página): o pedido é recuperado sem nova compra.
6. **Cupom inválido/expirado, conflito de cadastro, quantidade acima do limite:** dados das fixtures (ver tabela acima; `nft-06` tem apenas 2 unidades da edição 1/50; `nft-12`, `nft-23`, ... têm edições esgotadas).

## Estrutura

```
src/
  app/            query client, router
  routes/         rotas file-based (TanStack Router) — index, nft.$nftId, cart, checkout, orders.$orderId, login, register, account.*, mocks
  features/       componentes por domínio (catalog, nft, cart, checkout, auth, account)
  components/     ui (shadcn), layout, common
  lib/            api (axios client, contratos zod, endpoints), queries (TanStack Query), session, auth, realtime (Socket.IO), money (BigInt wei)
  mocks/          MSW: db (estado persistido), fixtures, handlers REST, handler Socket.IO, cenários, controle
tests/e2e/        Playwright (desktop + mobile) e baselines visuais
lighthouse/       configuração versionada e relatórios
scripts/          gerador de arte SVG e auditoria Lighthouse
docs/             notas do Figma
```

Contratos REST/eventos, política de sessão, cache, reconciliação REST ↔ Socket.IO, limitações e desvios do Figma: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Deploy (Cloudflare Pages)

Aplicação SPA estática (`dist/`). `public/_redirects` (fallback de todas as rotas para `index.html`) e `public/_headers` (service worker sem cache, assets imutáveis) já vão para o build.

Pelo painel: *Workers & Pages → Create → Pages → Connect to Git* e use:

| Campo | Valor |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version (variável `NODE_VERSION`) | `24` |
| Variável `VITE_ENABLE_MOCKS` | `true` |

Ou pela CLI, a partir de um checkout com o build feito:

```bash
npm run build && npx wrangler pages deploy dist --project-name kurio-nft
```

Acesso direto e refresh de qualquer rota funcionam pelo `_redirects`. Os mocks (REST + Socket.IO) rodam no navegador via service worker, portanto funcionam no ambiente publicado sem nenhum serviço privado.

## Auditoria Lighthouse

`npm run lighthouse` gera `lighthouse/reports/summary.md` (medianas) e os relatórios HTML/JSON de cada execução. Resultados e análise: ver [ARCHITECTURE.md → Performance](./ARCHITECTURE.md#performance-e-lighthouse).
